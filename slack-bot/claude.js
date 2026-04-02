import { spawn } from "child_process";
import dns from "dns/promises";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SESSIONS_PATH = join(__dirname, "sessions.json");
const DEFAULT_TIMEOUT_MS = 1_200_000; // 20 min
const DEFAULT_MAX_TURNS = 25;

async function checkNetwork() {
  try {
    await dns.lookup("api.anthropic.com");
    return true;
  } catch {
    return false;
  }
}

const OWNER_USER_ID = process.env.OWNER_USER_ID;

// Tools blocked for everyone
const BASE_DISALLOWED = [
  "mcp__slack__post_message",
  "mcp__slack__upload_file",
  "mcp__slack__set_user_status",
  "AskUserQuestion",
  "TodoWrite",
  "CronCreate",
  "CronDelete",
  "CronList",
];

// Additional tools blocked in channel (restricted) mode
// Note: Bash and Write are allowed (needed for image gen, data queries, etc.)
// CLAUDE.md restricts their use to skill execution and /tmp/ only
const RESTRICTED_DISALLOWED = [
  ...BASE_DISALLOWED,
  "Edit",
  "NotebookEdit",
];

const TOOL_LABELS = {
  Read: (input) => `Reading ${basename(input.file_path || "")}`,
  Edit: (input) => `Editing ${basename(input.file_path || "")}`,
  Write: (input) => `Writing ${basename(input.file_path || "")}`,
  Glob: () => "Searching files",
  Grep: (input) => `Searching for "${(input.pattern || "").slice(0, 30)}"`,
  Bash: () => "Running command",
  WebSearch: (input) => `Searching web: ${(input.query || "").slice(0, 40)}`,
  WebFetch: () => "Fetching web page",
  Skill: (input) => `Running /${input.skill || "skill"}`,
  Task: (input) => `Spawning agent: ${(input.description || "").slice(0, 40)}`,
};

function basename(p) {
  return p.split("/").pop() || p;
}

// --- Session management ---

function loadSessions() {
  if (!existsSync(SESSIONS_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SESSIONS_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveSessions(sessions) {
  writeFileSync(SESSIONS_PATH, JSON.stringify(sessions, null, 2));
}

export { loadSessions };

export function getSession(threadTs) {
  const sessions = loadSessions();
  const entry = sessions[threadTs];
  if (!entry) return null;
  if (typeof entry === "string") return { sessionId: entry, mode: "full" };
  return entry;
}

export function saveSession(threadTs, sessionId, mode, extra = {}) {
  const sessions = loadSessions();
  if (sessionId === null) {
    delete sessions[threadTs];
  } else {
    sessions[threadTs] = {
      sessionId,
      mode,
      timestamp: new Date().toISOString(),
      ...extra,
    };
  }
  saveSessions(sessions);
}

export function isOwner(userId) {
  return userId === OWNER_USER_ID;
}

// --- Identity injection (loaded once at startup) ---

const VAULT_PATH = process.env.VAULT_PATH || process.cwd();
const IDENTITY_PATH = join(__dirname, "identity.md");
const IDENTITY = existsSync(IDENTITY_PATH)
  ? readFileSync(IDENTITY_PATH, "utf-8")
  : "";

// --- Main runner ---

export async function runClaude(prompt, sessionId = null, onStatus = null, mode = "restricted", opts = {}) {
  const restricted = mode === "restricted";
  const maxTurns = opts.maxTurns || (restricted ? 10 : DEFAULT_MAX_TURNS);
  const timeoutMs = opts.timeout || DEFAULT_TIMEOUT_MS;
  const signal = opts.signal || null;
  const workspacePath = VAULT_PATH;
  const disallowed = restricted ? RESTRICTED_DISALLOWED : BASE_DISALLOWED;

  // Pre-checks before spawning a Claude process
  if (signal?.aborted) throw new Error("aborted");
  if (!await checkNetwork()) throw new Error("Network unavailable");

  return new Promise((resolve, reject) => {
    const args = [
      "-p",
      prompt,
      "--output-format",
      "stream-json",
      "--verbose",
      "--dangerously-skip-permissions",
      "--max-turns",
      String(maxTurns),
    ];

    if (IDENTITY) {
      args.push("--append-system-prompt", IDENTITY);
    }

    // Load Slack plugin so MCP tools (search, threads, etc.) are available
    const slackPluginDir = join(
      process.env.HOME,
      ".claude/plugins/marketplaces/claude-plugins-official/external_plugins/slack"
    );
    if (existsSync(slackPluginDir)) {
      args.push("--plugin-dir", slackPluginDir);
    }

    for (const tool of disallowed) {
      args.push("--disallowedTools", tool);
    }

    if (sessionId) {
      args.push("--resume", sessionId);
    }

    const proc = spawn("claude", args, {
      cwd: workspacePath,
      env: {
        ...process.env,
        CLAUDECODE: "",
        CLAUDE_CODE_ENTRYPOINT: "slack-bot",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Wire up abort signal to kill the child process
    if (signal) {
      signal.addEventListener("abort", () => proc.kill("SIGTERM"), { once: true });
    }

    let buffer = "";
    const allTextBlocks = [];
    let resultData = null;

    proc.stdout.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          if (event.type === "assistant") {
            const content = event.message?.content || [];
            for (const block of content) {
              if (block.type === "text" && block.text?.trim()) {
                allTextBlocks.push(block.text);
              }
              if (block.type === "tool_use" && onStatus) {
                const labeler = TOOL_LABELS[block.name];
                const label = labeler
                  ? labeler(block.input || {})
                  : block.name;
                onStatus(label);
              }
            }
          }
          if (event.type === "result") {
            resultData = event;
          }
        } catch {}
      }
    });

    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error(`Claude timed out after ${Math.round(timeoutMs / 60000)} minutes`));
    }, timeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timer);

      // Aborted by ProcessManager — reject cleanly, no error posting
      if (signal?.aborted) {
        reject(new Error("aborted"));
        return;
      }

      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer);
          if (event.type === "result") resultData = event;
        } catch {}
      }

      if (stderr) {
        console.error("[claude stderr]", stderr.slice(0, 500));
      }

      if (!resultData) {
        reject(
          new Error(`Claude exited with code ${code}, no result event`)
        );
        return;
      }

      console.log(
        "[claude]",
        JSON.stringify({
          mode,
          subtype: resultData.subtype,
          num_turns: resultData.num_turns,
          result_length: resultData.result?.length ?? 0,
          cost: resultData.total_cost_usd,
        })
      );

      // Stale session: if we tried --resume and got error_during_execution with 0 turns,
      // the session is dead. Retry fresh without it.
      if (sessionId && resultData.subtype === "error_during_execution" && resultData.num_turns === 0) {
        console.log("[claude] Stale session detected, retrying without --resume");
        resolve(runClaude(prompt, null, onStatus, mode, opts));
        return;
      }

      let text = allTextBlocks.length > 0
        ? allTextBlocks.join("\n\n").trim()
        : resultData.result?.trim() || "";

      // Auth failure: CLI returns "Not logged in" as a success result with $0 cost
      if (text.includes("Not logged in") || text.includes("Please run /login")) {
        reject(new Error("Claude CLI not authenticated -- run `claude login`"));
        return;
      }

      if (!text && resultData.subtype === "error_max_turns") {
        text =
          "_Hit turn limit after " +
          resultData.num_turns +
          " steps. Reply to continue where I left off._";
      }

      // Claude did work (tool calls) but produced no text — inject a soft ack
      if (!text && resultData.num_turns > 0) {
        text = "Got it, updated.";
      }

      resolve({
        text: text || "(no response)",
        sessionId: resultData.session_id || sessionId,
        costUsd: resultData.total_cost_usd,
      });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
