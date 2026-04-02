import "dotenv/config";
import bolt from "@slack/bolt";
const { App } = bolt;
import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { runClaude, getSession, saveSession, isOwner, loadSessions } from "./claude.js";
import { ProcessManager } from "./process-manager.js";
import { classify } from "./router.js";
import { Scheduler, HEARTBEAT_PATH } from "./scheduler.js";
import { detectFollowup, shouldChain } from "./followup.js";

// Kill ALL zombie bot processes except self on startup.
// Uses lsof on the Slack bot port AND pgrep with cwd matching to catch orphans
// that show as "node index.js" (short form) after being adopted by launchd.
const PIDFILE = join(dirname(fileURLToPath(import.meta.url)), "bot.pid");
const BOT_DIR = dirname(fileURLToPath(import.meta.url));
try {
  // Strategy 1: pidfile — kill the previously recorded PID
  const pidfileZombies = [];
  if (existsSync(PIDFILE)) {
    try {
      const pidData = JSON.parse(readFileSync(PIDFILE, "utf-8"));
      const oldPid = typeof pidData === "object" ? pidData.pid : parseInt(pidData, 10);
      if (oldPid && oldPid !== process.pid) {
        try { process.kill(oldPid, 0); pidfileZombies.push(oldPid); } catch {}
      }
    } catch {}
  }

  // Strategy 2: pgrep with full path (catches processes started with absolute path)
  const raw1 = execSync(`pgrep -f "node.*slack-bot/index\\.js" 2>/dev/null || true`, { encoding: "utf-8" });

  const allPids = new Set([
    ...pidfileZombies,
    ...raw1.trim().split("\n").map(p => parseInt(p, 10)),
  ]);
  const zombies = [...allPids].filter(p => p && p !== process.pid);

  if (zombies.length > 0) {
    console.log(`[startup] Found ${zombies.length} zombie(s): ${zombies.join(", ")}`);
    for (const pid of zombies) {
      try { process.kill(pid, "SIGTERM"); } catch {}
    }
    // Give them 2s to die gracefully, then SIGKILL survivors
    await new Promise(r => setTimeout(r, 2000));
    for (const pid of zombies) {
      try { process.kill(pid, "SIGKILL"); } catch {}
    }
    console.log(`[startup] Zombie cleanup complete`);
  }
} catch (e) {
  console.error(`[startup] Zombie sweep failed:`, e.message);
}
writeFileSync(PIDFILE, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));

// Kill orphaned Claude processes from previous bot instances on startup
// Only kill processes whose parent was a previous bot PID (from pidfile), not ALL Claude processes
try {
  const raw = execSync('pgrep -f "claude.*dangerously-skip-permissions" 2>/dev/null || true', { encoding: "utf-8" });
  const claudePids = raw.trim().split("\n").map(p => parseInt(p, 10)).filter(Boolean);
  let killed = 0;
  for (const pid of claudePids) {
    try {
      // Check if the parent PID is in our zombie list (dead bot instances)
      const ppid = parseInt(execSync(`ps -o ppid= -p ${pid} 2>/dev/null`, { encoding: "utf-8" }).trim(), 10);
      // Only kill if orphaned (parent is launchd/init, PID 1) — these are leftover bot children
      if (ppid === 1) {
        process.kill(pid, "SIGTERM");
        killed++;
      }
    } catch {}
  }
  if (killed) console.log(`[startup] Cleaned up ${killed} orphaned Claude process(es)`);
} catch {}


const __dirname = dirname(fileURLToPath(import.meta.url));

const MAX_SLACK_LENGTH = 3900;
const BOT_NAME = process.env.BOT_NAME || "Agent";
const BOT_IDENTITY = { username: BOT_NAME };

// Channel allowlist — only respond in approved channels (DMs are always allowed, gated by isOwner)
let ALLOWED_CHANNELS = new Set();
const allowlistPath = join(__dirname, "channel-allowlist.json");
if (existsSync(allowlistPath)) {
  const ALLOWLIST_DATA = JSON.parse(readFileSync(allowlistPath, "utf-8"));
  // Support both array format [{ id, name }] and object format { channels: { id: name } }
  if (Array.isArray(ALLOWLIST_DATA)) {
    ALLOWED_CHANNELS = new Set(ALLOWLIST_DATA.map(c => c.id));
  } else if (ALLOWLIST_DATA.channels) {
    ALLOWED_CHANNELS = new Set(Object.keys(ALLOWLIST_DATA.channels));
  }
}
console.log(`[startup] Channel allowlist loaded: ${ALLOWED_CHANNELS.size} channels`);

// --- Slack link pre-fetching ---
// Detects Slack links in messages and fetches thread/message content so the agent has context

const SLACK_LINK_RE = /https?:\/\/[a-z0-9-]+\.slack\.com\/archives\/([A-Z0-9]+)\/p(\d+)(?:\?.*?thread_ts=([\d.]+))?/g;

function parseSlackLinks(text) {
  const links = [];
  let match;
  const re = new RegExp(SLACK_LINK_RE.source, SLACK_LINK_RE.flags);
  while ((match = re.exec(text)) !== null) {
    const channel = match[1];
    const rawTs = match[2];
    const ts = rawTs.slice(0, 10) + "." + rawTs.slice(10);
    const threadTs = match[3] || ts;
    links.push({ url: match[0], channel, ts, threadTs });
  }
  return links;
}

async function expandSlackLinks(client, text) {
  const links = parseSlackLinks(text);
  if (links.length === 0) return text;

  const expansions = [];
  for (const link of links) {
    try {
      const result = await client.conversations.replies({
        channel: link.channel,
        ts: link.threadTs,
        limit: 50,
      });
      if (result.messages?.length) {
        const thread = result.messages.map((m) => {
          const who = m.user ? `<@${m.user}>` : (m.username || "bot");
          const time = new Date(parseFloat(m.ts) * 1000).toISOString().slice(0, 16);
          let line = `[${time}] ${who}: ${m.text || ""}`;
          if (m.files?.length) {
            const fileDescs = m.files.map((f) => `[file: ${f.name} (${f.mimetype || f.filetype})]`);
            line += (m.text ? " " : "") + fileDescs.join(" ");
          }
          return line;
        }).join("\n");
        expansions.push(`[SLACK THREAD: ${link.url}]\n${thread}\n[/SLACK THREAD]`);
      }
    } catch (err) {
      console.error(`[slack-expand] Failed to fetch ${link.url}:`, err.message);
      expansions.push(`[SLACK THREAD: ${link.url}]\n(failed to fetch: ${err.message})\n[/SLACK THREAD]`);
    }
  }

  return expansions.length > 0 ? text + "\n\n" + expansions.join("\n\n") : text;
}

// --- Thread context injection ---
// For channel threads, fetch the full conversation so the agent has context
// even without session resume (e.g. tagged in late, or session cleared)

async function fetchThreadContext(client, channel, threadTs, currentMsgTs) {
  try {
    const result = await client.conversations.replies({
      channel,
      ts: threadTs,
      limit: 50,
    });
    if (!result.messages?.length) return "";

    // Exclude the current message (it's already the prompt)
    const history = result.messages
      .filter((m) => m.ts !== currentMsgTs)
      .map((m) => {
        const who = m.user ? `<@${m.user}>` : (m.username || "bot");
        const time = new Date(parseFloat(m.ts) * 1000).toISOString().slice(0, 16);
        let line = `[${time}] ${who}: ${m.text || ""}`;
        if (m.files?.length) {
          const fileDescs = m.files.map((f) => `[file: ${f.name} (${f.mimetype || f.filetype})]`);
          line += (m.text ? " " : "") + fileDescs.join(" ");
        }
        return line;
      })
      .join("\n");

    if (!history) return "";
    return `[THREAD CONTEXT — ${result.messages.length - 1} prior messages]\n${history}\n[/THREAD CONTEXT]\n\n`;
  } catch (err) {
    console.error(`[thread-context] Failed to fetch thread ${threadTs}:`, err.message);
    return `[THREAD CONTEXT UNAVAILABLE — fetch it yourself using mcp__slack__get_thread_replies with channel "${channel}" and thread_ts "${threadTs}", then use that context to inform your response]\n\n`;
  }
}

// --- Slack file downloading ---
// Downloads images/files from Slack so Claude can Read them

const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"]);

async function downloadSlackFile(file, token) {
  let url = file.url_private_download || file.url_private;
  if (!url) return null;

  try {
    // Slack redirects file URLs cross-origin, which causes fetch to drop the
    // Authorization header. Follow redirects manually to preserve auth.
    for (let i = 0; i < 5; i++) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        redirect: "manual",
      });
      if (res.status >= 300 && res.status < 400) {
        url = res.headers.get("location");
        if (!url) break;
        continue;
      }
      if (!res.ok) {
        console.error(`[file-download] HTTP ${res.status} for ${file.name}`);
        return null;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      const ext = file.name?.split(".").pop() || file.filetype || "bin";
      const tmpPath = `/tmp/slack-${file.id}.${ext}`;
      writeFileSync(tmpPath, buffer);
      console.log(`[file-download] Saved ${file.name} -> ${tmpPath} (${buffer.length} bytes)`);
      return tmpPath;
    }
    console.error(`[file-download] Too many redirects for ${file.name}`);
    return null;
  } catch (err) {
    console.error(`[file-download] Failed to download ${file.name}:`, err.message);
    return null;
  }
}

async function downloadMessageFiles(files, token) {
  if (!files?.length) return [];
  const results = [];
  for (const file of files) {
    const isImage = IMAGE_MIMES.has(file.mimetype);
    if (!isImage) {
      results.push({ name: file.name, type: file.mimetype || file.filetype, path: null });
      continue;
    }
    const path = await downloadSlackFile(file, token);
    results.push({ name: file.name, type: file.mimetype || file.filetype, path });
  }
  return results;
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

const pm = new ProcessManager({ maxConcurrent: 3 });
let botUserId = null; // resolved at startup via auth.test()

// --- Status command — bypass Claude entirely, $0 cost ---

function formatStatus(scheduler) {
  const s = pm.status();
  const lines = [
    `*Process Manager*`,
    `Active: ${s.active}/${s.maxConcurrent} | Queued: ${s.queued}`,
  ];
  for (const p of s.processes) {
    lines.push(`  * \`${p.route}\` in thread \`${p.threadTs}\` -- ${p.runtimeSec}s (${p.mode})`);
  }
  if (scheduler) {
    lines.push("", `*Scheduled Jobs*`);
    for (const j of scheduler.listJobs()) {
      lines.push(`  * ${j.name}`);
    }
  }
  return lines.join("\n");
}

function isStatusRequest(prompt) {
  return /^\/?\s*status\s*$/i.test(prompt);
}

// --- Image extraction ---

const IMAGE_PATTERN = /\[IMAGE:(\/[^\]]+)\]/g;

function extractImages(text) {
  const images = [];
  let match;
  while ((match = IMAGE_PATTERN.exec(text)) !== null) {
    images.push(match[1]);
  }
  const cleanText = text.replace(IMAGE_PATTERN, "").replace(/\n{3,}/g, "\n\n").trim();
  return { images, cleanText };
}

// --- Post response helper ---

// threadTs: pass null for top-level DM replies, or a ts for channel threads
async function postResponse(client, channel, threadTs, text) {
  const threadOpts = threadTs ? { thread_ts: threadTs } : {};
  const { images, cleanText } = extractImages(text);

  // Post text response
  if (cleanText) {
    if (cleanText.length > MAX_SLACK_LENGTH) {
      const summary = cleanText.slice(0, 500) + "\n\n_(full response attached)_";
      await client.chat.postMessage({ ...BOT_IDENTITY, channel, ...threadOpts, text: summary });
      await client.filesUploadV2({
        channel_id: channel,
        ...threadOpts,
        content: cleanText,
        filename: "response.md",
        title: "Full Response",
      });
    } else {
      await client.chat.postMessage({ ...BOT_IDENTITY, channel, ...threadOpts, text: cleanText });
    }
  }

  // Upload any images
  for (const imgPath of images) {
    if (!existsSync(imgPath)) {
      console.error(`[image] File not found: ${imgPath}`);
      continue;
    }
    try {
      const filename = imgPath.split("/").pop();
      await client.filesUploadV2({
        channel_id: channel,
        ...threadOpts,
        file: readFileSync(imgPath),
        filename,
        title: filename,
      });
    } catch (err) {
      console.error(`[image] Upload failed for ${imgPath}:`, err.message);
    }
  }
}

// --- Core message handler ---

let scheduler = null; // set after startup

async function handleMessage({ event, client, notMentioned = false }) {
  console.log(`[handle] msg=${event.ts} thread=${event.thread_ts || event.ts} prompt=${(event.text || "").slice(0, 50)}`);
  if (event.subtype) return;
  if (!event.user) return;

  const isDM = event.channel_type === "im";
  if (isDM && !isOwner(event.user)) return;

  // Channel allowlist: ignore messages from unapproved channels
  if (!isDM && !ALLOWED_CHANNELS.has(event.channel)) {
    console.log(`[guard] Blocked message from unapproved channel ${event.channel}`);
    return;
  }

  const threadTs = event.thread_ts || event.ts; // for threading replies
  const sessionKey = isDM ? (event.thread_ts || event.channel) : (event.thread_ts || event.ts); // DMs: per-thread if threaded, shared if not
  const processKey = isDM ? event.ts : threadTs; // DMs: per-message | Channels: per-thread (enables abort-and-restart)
  const channel = event.channel;
  const now = new Date().toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "full", timeStyle: "short" });
  let prompt = `[Current time: ${now} ET]\n` + (event.text?.replace(/<@[A-Z0-9]+>/g, "").trim() || "");

  // Download images from the current message so Claude can see them
  if (event.files?.length) {
    const downloaded = await downloadMessageFiles(event.files, process.env.SLACK_BOT_TOKEN);
    for (const f of downloaded) {
      if (f.path) {
        prompt += `\n[Image "${f.name}" saved to ${f.path} -- use the Read tool to view it]`;
      } else {
        prompt += ` [file: ${f.name} (${f.type})]`;
      }
    }
  }

  if (!prompt) return;

  // Pre-fetch any Slack links so Claude has the thread context
  prompt = await expandSlackLinks(client, prompt);

  // For channel threads, inject full thread history so the agent has context
  if (!isDM && event.thread_ts) {
    const threadContext = await fetchThreadContext(client, channel, event.thread_ts, event.ts);
    if (threadContext) prompt = threadContext + prompt;
  }

  // Instant status response (check before sender tag is prepended)
  if (isDM && isOwner(event.user) && isStatusRequest(prompt)) {
    await client.chat.postMessage({ ...BOT_IDENTITY, channel, thread_ts: threadTs, text: formatStatus(scheduler) });
    return;
  }

  // Tag who's talking so the agent knows which register to use
  const sender = isOwner(event.user) ? "[From: Owner]" : `[From: <@${event.user}>]`;
  prompt = `${sender} ${prompt}`;

  // Thread judgment: when the agent wasn't @mentioned, let Claude decide whether to respond
  if (notMentioned) {
    prompt += `\n\n[THREAD -- NOT DIRECTLY ADDRESSED]
You're seeing this because you participated earlier in this thread, but you were NOT @mentioned. Before responding, use your judgment:
- Is the person talking to you, or to someone else?
- Would your input be genuinely helpful, or would it be noise?
- Is someone else better positioned to answer?
If you decide not to respond, output exactly: [NO_RESPONSE]
If you have something valuable to add, respond normally.
[/THREAD]`;
  }

  // "new", "/new", "new session" etc. resets the DM session
  if (isDM && /^\/?\s*new(\s+session)?\s*$/i.test(prompt)) {
    saveSession(sessionKey, null, "full");
    await client.chat.postMessage({ ...BOT_IDENTITY, channel, text: "Session reset. Next message starts fresh." });
    return;
  }

  const mode = isDM ? "full" : "restricted";
  const route = classify(prompt, mode);

  // Dedup / abort-and-restart
  if (pm.isActive(processKey)) {
    if (isDM) {
      // DM: per-message dedup (existing behavior)
      try { await client.reactions.add({ channel, timestamp: event.ts, name: "no_entry_sign" }); } catch {}
      return;
    }
    // Channel thread: abort current work, restart with the new message
    console.log(`[handle] Aborting active process for thread ${processKey}, new message received`);
    pm.abort(processKey);
  }

  // Emoji feedback via ProcessManager callbacks — no prediction, no race condition
  // onQueued fires synchronously if task can't run yet; onStart fires when it begins
  try {
    const result = await pm.run(
      async (signal) => {
        const existing = getSession(sessionKey);
        const sessionId = existing?.sessionId || null;
        const onStatus = (label) => console.log(`[status] ${label}`);

        return runClaude(prompt, sessionId, onStatus, mode, {
          maxTurns: route.maxTurns,
          timeout: route.timeout,
          signal,
        });
      },
      {
        threadTs: processKey, mode, route: route.name, priority: route.priority,
        onQueued: () => {
          if (!notMentioned) client.reactions.add({ channel, timestamp: event.ts, name: "hourglass_flowing_sand" }).catch(() => {});
        },
        onStart: () => {
          if (!notMentioned) {
            client.reactions.remove({ channel, timestamp: event.ts, name: "hourglass_flowing_sand" }).catch(() => {});
            client.reactions.add({ channel, timestamp: event.ts, name: "eyes" }).catch(() => {});
          }
        },
      }
    );

    // Save session so Claude remembers seeing the message
    if (result.sessionId) {
      saveSession(sessionKey, result.sessionId, mode, {
        lastPrompt: prompt.slice(0, 100),
        lastResult: result.text.slice(0, 200),
        costUsd: result.costUsd,
        route: route.name,
      });
    }

    // Thread judgment: Claude decided not to respond — stay silent
    if (notMentioned && result.text.trim() === "[NO_RESPONSE]") {
      console.log(`[handle] Thread judgment: staying silent in thread=${threadTs}`);
      return;
    }

    await postResponse(client, channel, threadTs, result.text);

    // Follow-up chaining
    if (isDM) {
      await maybeChain({ client, channel, threadTs, text: result.text, sessionId: result.sessionId, depth: 0 });
    }
  } catch (err) {
    if (err.message === "already_active") return; // silently handled above
    if (err.message === "aborted") return; // killed by abort-and-restart, new message takes over

    console.error("Claude error:", err.message);

    // Retry with fresh session if session error
    const existing = getSession(sessionKey);
    if (existing?.sessionId && err.message.includes("session")) {
      try {
        const result = await runClaude(prompt, null, null, mode, {
          maxTurns: route.maxTurns,
          timeout: route.timeout,
        });
        if (result.sessionId) {
          saveSession(sessionKey, result.sessionId, mode, {
            lastPrompt: prompt.slice(0, 100),
            lastResult: result.text.slice(0, 200),
            costUsd: result.costUsd,
            route: route.name,
          });
        }
        await postResponse(client, channel, threadTs, result.text);
      } catch (retryErr) {
        await postResponse(client, channel, threadTs, `Error: ${retryErr.message}`);
      }
    } else {
      await postResponse(client, channel, threadTs, `Error: ${err.message}`);
    }
  } finally {
    if (!notMentioned) {
      try {
        await client.reactions.remove({ channel, timestamp: event.ts, name: "eyes" });
      } catch {}
      try {
        await client.reactions.remove({ channel, timestamp: event.ts, name: "hourglass_flowing_sand" });
      } catch {}
    }
  }
}

// --- Follow-up chaining ---

async function maybeChain({ client, channel, threadTs, text, sessionId, depth }) {
  if (!shouldChain(depth)) return;

  const skill = detectFollowup(text);
  if (!skill) return;

  console.log(`[followup] Detected ${skill} in output, chaining (depth ${depth + 1})`);

  try {
    await client.reactions.add({ channel, timestamp: threadTs, name: "arrows_counterclockwise" });
  } catch {}

  const chainRoute = classify(skill, "full");

  try {
    const result = await pm.run(
      async (signal) => {
        const onStatus = (label) => console.log(`[followup-status] ${label}`);
        return runClaude(skill, sessionId, onStatus, "full", {
          maxTurns: chainRoute.maxTurns,
          timeout: chainRoute.timeout,
          signal,
        });
      },
      { threadTs: `${threadTs}-chain-${depth + 1}`, mode: "full", route: "followup", priority: chainRoute.priority }
    );

    if (result.sessionId) {
      saveSession(threadTs, result.sessionId, "full", {
        lastPrompt: skill.slice(0, 100),
        lastResult: result.text.slice(0, 200),
        costUsd: result.costUsd,
        route: "followup",
      });
    }

    await postResponse(client, channel, threadTs, result.text);

    // Recursive chain check
    await maybeChain({ client, channel, threadTs, text: result.text, sessionId: result.sessionId, depth: depth + 1 });
  } catch (err) {
    console.error(`[followup] Chain failed:`, err.message);
  } finally {
    try {
      await client.reactions.remove({ channel, timestamp: threadTs, name: "arrows_counterclockwise" });
    } catch {}
  }
}

// --- Event handlers ---

app.event("message", async ({ event, client }) => {
  console.log(`[event] message type=${event.channel_type} user=${event.user} subtype=${event.subtype}`);

  // DMs: handle as before
  if (event.channel_type === "im") {
    return handleMessage({ event, client });
  }

  // Channel thread membership: auto-respond in threads the agent has participated in
  // Skip: subtypes (edits, deletes), bot's own messages, @mentions (app_mention handles those)
  if (event.thread_ts && !event.subtype && event.user && event.user !== botUserId) {
    const hasMention = event.text?.includes(`<@${botUserId}>`);
    if (hasMention) {
      console.log(`[event] channel thread has @mention, deferring to app_mention handler`);
      return; // let app_mention handle @mentions
    }
    const session = getSession(event.thread_ts);
    console.log(`[event] thread membership check: thread=${event.thread_ts} session=${session?.sessionId ? 'found' : 'none'}`);
    const THREAD_TTL_MS = 24 * 60 * 60_000; // 24 hour rolling window
    if (session?.sessionId && session?.timestamp) {
      const age = Date.now() - new Date(session.timestamp).getTime();
      if (age < THREAD_TTL_MS) {
        console.log(`[event] thread membership hit: thread=${event.thread_ts} age=${Math.round(age/60000)}m`);
        return handleMessage({ event, client, notMentioned: true });
      } else {
        console.log(`[event] thread TTL expired: thread=${event.thread_ts} age=${Math.round(age/60000)}m`);
      }
    }
  }
});

app.event("app_mention", async ({ event, client }) => {
  console.log(`[event] app_mention user=${event.user}`);
  await handleMessage({ event, client });
});

// --- Startup ---

(async () => {
  await app.start();

  // Resolve bot's own user ID (for filtering self-messages in thread membership)
  try {
    const auth = await app.client.auth.test();
    botUserId = auth.user_id;
    console.log(`[startup] Bot user ID: ${botUserId}`);
  } catch (err) {
    console.error("[startup] Failed to resolve bot user ID:", err.message);
  }

  console.log("Claude Slack bot running (Socket Mode)");

  // Replay interrupted conversations — find threads where last message was from a user, not the bot
  try {
    const sessions = loadSessions();
    const REPLAY_WINDOW_MS = 3 * 60 * 60_000; // replay sessions active in the last 3 hours
    const cutoff = Date.now() - REPLAY_WINDOW_MS;
    let replayed = 0;

    for (const [threadTs, session] of Object.entries(sessions)) {
      // Skip scheduled jobs (not real conversations)
      if (threadTs.startsWith("scheduled:") || threadTs.startsWith("scheduled-")) continue;
      // Skip old sessions
      if (!session.timestamp || new Date(session.timestamp).getTime() < cutoff) continue;

      try {
        // Fetch the thread to find the channel and check last message
        // Try owner's DM channel first
        const dmResult = await app.client.conversations.open({ users: process.env.OWNER_USER_ID });
        const dmChannel = dmResult.channel.id;

        // Try fetching from DM channel first
        let replies;
        try {
          replies = await app.client.conversations.replies({
            channel: dmChannel,
            ts: threadTs,
            limit: 5,
            inclusive: true,
          });
        } catch {
          // Not a DM thread — skip (channel threads are lower priority for replay)
          continue;
        }

        if (!replies.messages?.length) continue;

        const lastMsg = replies.messages[replies.messages.length - 1];
        // Skip if last message is from the bot
        if (!lastMsg.user || lastMsg.user === botUserId) continue;
        // Skip if last message is old (> 10 min)
        const msgAge = Date.now() - parseFloat(lastMsg.ts) * 1000;
        if (msgAge > REPLAY_WINDOW_MS) continue;

        console.log(`[replay] Replaying interrupted message in thread=${threadTs} from user=${lastMsg.user}`);
        // Construct a minimal event and replay through handleMessage
        handleMessage({
          event: {
            type: "message",
            user: lastMsg.user,
            text: lastMsg.text || "",
            ts: lastMsg.ts,
            thread_ts: threadTs === lastMsg.ts ? undefined : threadTs,
            channel: dmChannel,
            channel_type: "im",
            files: lastMsg.files,
          },
          client: app.client,
        });
        replayed++;
      } catch (err) {
        console.error(`[replay] Failed for thread=${threadTs}:`, err.message);
      }
    }
    console.log(`[replay] Replayed ${replayed} interrupted conversation(s)`);
  } catch (err) {
    console.error("[replay] Failed to scan sessions:", err.message);
  }

  // Catch-up scan: find messages that arrived while bot was offline
  try {
    let offlineSince = Date.now() - 60_000; // default: 1 min ago (fresh start)

    if (existsSync(HEARTBEAT_PATH)) {
      const hb = JSON.parse(readFileSync(HEARTBEAT_PATH, "utf-8"));
      offlineSince = hb.lastSeen || offlineSince;
    }

    const offlineMs = Date.now() - offlineSince;
    const MAX_CATCHUP_MS = 24 * 60 * 60_000; // cap at 24 hours

    if (offlineMs > 60_000 && offlineMs < MAX_CATCHUP_MS) {
      console.log(`[catchup] Bot was offline for ${Math.round(offlineMs / 60000)}m, scanning for missed messages`);
      const oldestTs = String(offlineSince / 1000); // Slack ts format
      const sessions = loadSessions();
      let caughtMentions = 0;
      let caughtThreads = 0;

      for (const channelId of ALLOWED_CHANNELS) {
        try {
          const history = await app.client.conversations.history({
            channel: channelId,
            oldest: oldestTs,
            limit: 50,
          });

          // --- Pass 1: Missed @mentions (top-level and in-thread) ---
          for (const msg of (history.messages || [])) {
            if (!msg.text?.includes(`<@${botUserId}>`)) continue;
            if (!msg.user || msg.user === botUserId) continue;
            const threadTs = msg.thread_ts || msg.ts;
            if (sessions[threadTs]?.sessionId) continue;

            console.log(`[catchup] Missed @mention in ${channelId}: ${msg.ts}`);
            handleMessage({
              event: {
                type: "message",
                user: msg.user,
                text: msg.text,
                ts: msg.ts,
                thread_ts: msg.thread_ts,
                channel: channelId,
                channel_type: "channel",
                files: msg.files,
              },
              client: app.client,
            });
            caughtMentions++;
          }

          // --- Pass 2: Missed thread-membership messages ---
          for (const [threadTs, session] of Object.entries(sessions)) {
            if (!session?.sessionId || !session?.timestamp) continue;
            const sessionAge = Date.now() - new Date(session.timestamp).getTime();
            if (sessionAge > MAX_CATCHUP_MS) continue;

            try {
              const replies = await app.client.conversations.replies({
                channel: channelId,
                ts: threadTs,
                oldest: oldestTs,
                limit: 10,
              });
              if (!replies.messages?.length) continue;

              const lastMsg = replies.messages[replies.messages.length - 1];
              if (!lastMsg.user || lastMsg.user === botUserId) continue;
              const msgTime = parseFloat(lastMsg.ts) * 1000;
              if (msgTime < offlineSince) continue;
              // Skip if it's an @mention (Pass 1 handles those)
              if (lastMsg.text?.includes(`<@${botUserId}>`)) continue;

              console.log(`[catchup] Missed thread reply in ${channelId}: thread=${threadTs} from=${lastMsg.user}`);
              handleMessage({
                event: {
                  type: "message",
                  user: lastMsg.user,
                  text: lastMsg.text || "",
                  ts: lastMsg.ts,
                  thread_ts: threadTs,
                  channel: channelId,
                  channel_type: "channel",
                  files: lastMsg.files,
                },
                client: app.client,
                notMentioned: true,
              });
              caughtThreads++;
            } catch {
              // Thread not in this channel — expected, skip silently
            }
          }

          // Rate limit between channels
          await new Promise(r => setTimeout(r, 500));
        } catch (err) {
          // not_in_channel is expected for allowlisted channels the bot hasn't joined
          if (!err.message?.includes("not_in_channel") && !err.message?.includes("channel_not_found")) {
            console.error(`[catchup] Failed scanning ${channelId}:`, err.message);
          }
        }
      }
      console.log(`[catchup] Replayed ${caughtMentions} missed @mention(s) and ${caughtThreads} missed thread message(s)`);
    } else if (offlineMs >= MAX_CATCHUP_MS) {
      console.log(`[catchup] Offline too long (${Math.round(offlineMs / 3600000)}h), skipping catch-up`);
    }
  } catch (err) {
    console.error("[catchup] Failed:", err.message);
  }

  // Scheduler — runs jobs through ProcessManager
  scheduler = new Scheduler({
    processManager: pm,
    runJob: async (prompt, mode, { maxTurns, timeout, jobName } = {}) => {
      const route = classify(prompt, "scheduled");
      const effectiveMaxTurns = maxTurns || route.maxTurns;
      const effectiveTimeout = timeout || route.timeout;
      const result = await pm.run(
        async (signal) => {
          const onStatus = (label) => console.log(`[scheduled-status] ${label}`);
          return runClaude(prompt, null, onStatus, mode, {
            maxTurns: effectiveMaxTurns,
            timeout: effectiveTimeout,
            signal,
          });
        },
        { threadTs: `scheduled:${jobName}`, mode, route: "scheduled", priority: route.priority }
      );
      return result;
    },
    slackClient: app.client,
  });
  await scheduler.start();

  // Graceful shutdown — stop scheduler, abort active processes, drain children, clean pidfile
  const shutdown = async (sig) => {
    console.log(`[shutdown] Received ${sig}, cleaning up...`);
    scheduler.stop();
    const hadActive = pm.active.size > 0;
    for (const [threadTs] of pm.active) {
      pm.abort(threadTs);
    }
    if (hadActive) {
      // Wait up to 3s for Claude child processes to exit
      console.log(`[shutdown] Waiting up to 3s for children to exit...`);
      await new Promise(r => setTimeout(r, 3000));
      // Safety net: kill orphaned Claude processes (only those parented to this bot PID)
      try {
        const raw = execSync('pgrep -f "claude.*dangerously-skip-permissions" 2>/dev/null || true', { encoding: "utf-8" });
        for (const p of raw.trim().split("\n").map(Number).filter(Boolean)) {
          try {
            const ppid = parseInt(execSync(`ps -o ppid= -p ${p} 2>/dev/null`, { encoding: "utf-8" }).trim(), 10);
            if (ppid === process.pid || ppid === 1) process.kill(p, "SIGTERM");
          } catch {}
        }
      } catch {}
    }
    try { writeFileSync(PIDFILE, ""); } catch {}
    process.exit(0);
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
})();
