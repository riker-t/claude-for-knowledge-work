// Job scheduler — polls every 30s, fires jobs when clock matches their schedule.
// Replaces node-cron which had double-fire and phantom-fire bugs.
// All times evaluated in America/New_York.

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { saveSession, runClaude } from "./claude.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = join(__dirname, "scheduler-state.json");
const HEARTBEAT_PATH = join(__dirname, "bot-heartbeat.json");

const OWNER_USER_ID = process.env.OWNER_USER_ID;
const NO_ACTION = "NO_ACTION";
const POLL_INTERVAL = 30_000; // check every 30s
const TZ = "America/New_York";

// Guard against internal-reasoning leaks: reject short, parenthetical, or
// self-directed text that Claude emitted instead of a proper NO_ACTION.
function _isActionable(text) {
  const trimmed = text.trim();
  // Too short to be a real report (real scans are 200+ chars)
  if (trimmed.length < 80) return false;
  // Entire response is a parenthetical aside
  if (trimmed.startsWith("(") && trimmed.endsWith(")")) return false;
  return true;
}

const SLACK_MAX_LEN = 3800; // Leave headroom under Slack's ~4000 char limit

function _splitForSlack(text) {
  if (text.length <= SLACK_MAX_LEN) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > SLACK_MAX_LEN) {
    // Try to split at a double-newline boundary
    let splitIdx = remaining.lastIndexOf("\n\n", SLACK_MAX_LEN);
    if (splitIdx < SLACK_MAX_LEN * 0.3) {
      // No good paragraph break — try single newline
      splitIdx = remaining.lastIndexOf("\n", SLACK_MAX_LEN);
    }
    if (splitIdx < SLACK_MAX_LEN * 0.3) {
      // No good newline — hard split
      splitIdx = SLACK_MAX_LEN;
    }
    chunks.push(remaining.slice(0, splitIdx).trimEnd());
    remaining = remaining.slice(splitIdx).trimStart();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

function nowET() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: TZ })
  );
}

// Jobs are loaded from jobs.json at startup. See jobs.example.json for the format.
// Each job needs: name, match (function), prompt, mode, silent, maxTurns, timeout
// The JOBS array below provides the match functions; prompts come from jobs.json.

function loadJobDefinitions() {
  const jobsPath = join(__dirname, "jobs.json");
  if (!existsSync(jobsPath)) {
    console.warn("[scheduler] No jobs.json found — using jobs.example.json as fallback");
    const examplePath = join(__dirname, "jobs.example.json");
    if (!existsSync(examplePath)) return [];
    try {
      return JSON.parse(readFileSync(examplePath, "utf-8"));
    } catch { return []; }
  }
  try {
    return JSON.parse(readFileSync(jobsPath, "utf-8"));
  } catch (err) {
    console.error("[scheduler] Failed to parse jobs.json:", err.message);
    return [];
  }
}

// Match functions keyed by job name — defines WHEN each job fires
const MATCH_FUNCTIONS = {
  // Fire at minutes 0 and 30, hours 7-21, weekdays (Mon=1..Fri=5)
  "maintain": (d) => (d.getMinutes() === 0 || d.getMinutes() === 30) && d.getHours() >= 7 && d.getHours() <= 21 && d.getDay() >= 1 && d.getDay() <= 5,
  // Fire at odd hours: 9am, 11am, 1pm, 3pm, 5pm, 7pm, 9pm ET, weekdays
  "digest": (d) => d.getMinutes() === 0 && [9, 11, 13, 15, 17, 19, 21].includes(d.getHours()) && d.getDay() >= 1 && d.getDay() <= 5,
  // Preferred: 6 AM ET weekdays. Catch-up: fires anytime midnight-noon if missed
  "independent-work": (d) => d.getHours() < 12 && d.getDay() >= 1 && d.getDay() <= 5,
  // Preferred: 7 AM ET weekdays. Catch-up: fires anytime 7 AM - noon if missed
  "daily-brief": (d) => d.getHours() >= 7 && d.getHours() < 12 && d.getDay() >= 1 && d.getDay() <= 5,
  // Preferred: 1 AM ET, daily. Catch-up: fires anytime 1 AM-noon if missed
  "sleep": (d) => d.getHours() >= 1 && d.getHours() < 12,
};

function buildJobs() {
  const defs = loadJobDefinitions();
  return defs.map(def => ({
    ...def,
    match: MATCH_FUNCTIONS[def.name] || (() => false),
  })).filter(j => {
    if (!MATCH_FUNCTIONS[j.name]) {
      console.warn(`[scheduler] No match function for job "${j.name}" — skipping. Add it to MATCH_FUNCTIONS in scheduler.js.`);
      return false;
    }
    return true;
  });
}

const JOBS = buildJobs();

export { HEARTBEAT_PATH };

export class Scheduler {
  constructor({ processManager, runJob, slackClient }) {
    this.pm = processManager;
    this.runJob = runJob; // async (prompt, mode) => { text, sessionId, costUsd }
    this.client = slackClient;
    this.ownerDmChannel = null;
    this.timer = null;
    this.lastFired = this._loadState(); // job name -> "YYYY-MM-DD HH" key to prevent re-fires (persisted to disk)
    this.activeJobs = new Set();
  }

  async start() {
    // Resolve owner's DM channel once at startup
    try {
      const result = await this.client.conversations.open({ users: OWNER_USER_ID });
      this.ownerDmChannel = result.channel.id;
      console.log(`[scheduler] Owner DM channel: ${this.ownerDmChannel}`);
    } catch (err) {
      console.error("[scheduler] Failed to resolve owner DM channel:", err.message);
      return;
    }

    for (const job of JOBS) {
      console.log(`[scheduler] Registered: ${job.name}`);
    }

    // Poll on a fixed interval — no immediate tick on startup to avoid
    // double-fires when restarting (old Claude subprocesses may still be running)
    this.timer = setInterval(() => this._tick(), POLL_INTERVAL);
  }

  _tick() {
    const now = nowET();
    const hourKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}`;

    for (const job of JOBS) {
      let shouldFire = job.match(now);

      if (!shouldFire) continue;

      // Dedup: only fire once per hour-slot per job (survives restarts via disk).
      // Re-read disk state on every check to catch writes from other processes.
      const freshState = this._loadState();
      for (const [k, v] of freshState) this.lastFired.set(k, v);

      const dayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const fireKey = job.dedupKey === "day"
        ? `${job.name}:${dayKey}`
        : `${job.name}:${hourKey}`;
      if (this.lastFired.has(fireKey)) continue;
      this.lastFired.set(fireKey, Date.now());

      // Prune old keys (keep last 48 to avoid unbounded growth)
      if (this.lastFired.size > 48) {
        const oldest = this.lastFired.keys().next().value;
        this.lastFired.delete(oldest);
      }

      this._saveState();

      this._run(job);
    }

    this._writeHeartbeat();
  }

  _writeHeartbeat() {
    try {
      writeFileSync(HEARTBEAT_PATH, JSON.stringify({ lastSeen: Date.now() }));
    } catch (err) {
      console.error("[scheduler] Failed to write heartbeat:", err.message);
    }
  }

  async _run(job) {
    if (this.activeJobs.has(job.name)) {
      console.log(`[scheduler] Skipping: ${job.name} already active`);
      return;
    }
    this.activeJobs.add(job.name);
    console.log(`[scheduler] Firing: ${job.name}`);
    const botName = process.env.BOT_NAME || "Agent";
    try {
      const now = nowET();
      const timeTag = `[Current time: ${now.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })} ET]\n\n`;
      const result = await this.runJob(timeTag + job.prompt, job.mode, {
        maxTurns: job.maxTurns,
        timeout: job.timeout,
        jobName: job.name,
      });
      const { text, sessionId } = result;

      // Silent jobs only DM when there's something genuinely actionable
      if (job.silent && (!text || text.includes(NO_ACTION) || !_isActionable(text))) {
        console.log(`[scheduler] ${job.name}: nothing actionable (fast check), staying quiet`);
        return;
      }

      // Verification gate: LLM classifies the output before we send it
      if (job.silent && text) {
        const shouldSend = await this._verifyActionable(job.name, text);
        if (!shouldSend) {
          console.log(`[scheduler] ${job.name}: verification gate rejected, staying quiet`);
          return;
        }
      }

      if (this.ownerDmChannel && text) {
        const fullText = `*[${job.name}]*\n\n${text}`;
        const chunks = _splitForSlack(fullText);
        let firstMsg = null;

        for (const chunk of chunks) {
          const msg = await this.client.chat.postMessage({
            username: botName,
            channel: this.ownerDmChannel,
            text: chunk,
            // After the first message, thread the rest
            ...(firstMsg ? { thread_ts: firstMsg.ts } : {}),
          });
          if (!firstMsg) firstMsg = msg;
        }

        // Save session to the DM thread so replies resume with full context
        if (sessionId && firstMsg?.ts) {
          saveSession(firstMsg.ts, sessionId, "full", {
            lastPrompt: job.prompt.slice(0, 100),
            lastResult: text.slice(0, 200),
            costUsd: result.costUsd,
            route: "scheduled",
          });
          console.log(`[scheduler] Saved session ${sessionId} to thread ${firstMsg.ts}`);
        }
      }
    } catch (err) {
      console.error(`[scheduler] ${job.name} failed:`, err.message);
      // Don't DM on failure for silent jobs — just log it
      if (job.silent) return;
      if (this.ownerDmChannel) {
        try {
          await this.client.chat.postMessage({
            username: botName,
            channel: this.ownerDmChannel,
            text: `*[${job.name}]* failed: ${err.message}`,
          });
        } catch {}
      }
    } finally {
      this.activeJobs.delete(job.name);
    }
  }

  async _verifyActionable(jobName, text) {
    try {
      const prompt = `You are a message classifier. A scheduled bot job ("${jobName}") produced the following output that is about to be sent as a Slack DM to the user.

Classify whether this message contains ACTIONABLE content the user would want to read and act on.

ACTIONABLE means: meeting prep, messages needing response, blockers, deadlines, new information, recommendations, questions for the user.
NOT ACTIONABLE means: status confirmations ("scan complete"), process narration ("I checked X and found nothing"), self-directed notes, meta-commentary about the scan itself, vague summaries with no specific items.

Respond with EXACTLY one word: SEND or SKIP

Message to classify:
"""
${text.slice(0, 2000)}
"""`;

      const result = await runClaude(prompt, null, null, "restricted", {
        maxTurns: 1,
        timeout: 30_000,
      });
      const verdict = (result.text || "").trim().toUpperCase();
      console.log(`[scheduler] ${jobName} verification: ${verdict} (cost: $${result.costUsd})`);
      return verdict === "SEND";
    } catch (err) {
      // If verification fails, err on the side of sending
      console.error(`[scheduler] ${jobName} verification failed, allowing send:`, err.message);
      return true;
    }
  }

  _loadState() {
    try {
      if (existsSync(STATE_PATH)) {
        const data = JSON.parse(readFileSync(STATE_PATH, "utf-8"));
        return new Map(Object.entries(data));
      }
    } catch (err) {
      console.error("[scheduler] Failed to load state:", err.message);
    }
    return new Map();
  }

  _saveState() {
    try {
      writeFileSync(STATE_PATH, JSON.stringify(Object.fromEntries(this.lastFired)));
    } catch (err) {
      console.error("[scheduler] Failed to save state:", err.message);
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // For /status output
  listJobs() {
    return JOBS.map((j) => ({ name: j.name }));
  }
}
