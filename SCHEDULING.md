# Scheduling Automated Skills

Five skills, two ways to run them.

| Skill | What it does | Recommended Schedule |
|-------|-------------|---------------------|
| **maintain** | Silent background scanning and memory updates | Every 30 min, 7am-9pm ET, weekdays |
| **digest** | Summarizes what maintain found, DMs you | Every 2 hours, 9am-9pm ET, weekdays |
| **daily-brief** | Interactive morning routine with priorities | Once each morning, weekdays |
| **sleep** | Overnight memory consolidation and pruning | Once daily, overnight |
| **independent-work** | Self-directed projects aligned to your goals | Once daily, weekdays |

## Path 1: Simple (launchd / cron)

Direct `claude -p` invocation for each skill. Good for getting started. Limited — no concurrency management, no follow-up chaining, no conversational thread linking.

### Run Manually First

You don't need automation to start. Just type the slash command in Claude Code:

```
/daily-brief
/maintain
/digest
/sleep
/independent-work
```

This is the recommended approach for the first week while you're calibrating.

### macOS launchd

Create a plist file for each scheduled skill. Example for the daily brief:

**File:** `~/Library/LaunchAgents/com.claude-code.daily-brief.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude-code.daily-brief</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>cd /path/to/your/vault && claude -p "Run /daily-brief" --allowedTools "Read" "Write" "Edit" "Glob" "Grep" "WebSearch" "WebFetch"</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>7</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/claude-daily-brief.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/claude-daily-brief.err</string>
</dict>
</plist>
```

Load it:
```bash
launchctl load ~/Library/LaunchAgents/com.claude-code.daily-brief.plist
```

Adjust the schedule, path, and allowed tools for each skill. Repeat for maintain (every 30 min), digest (every 2 hours), sleep (midnight), and independent-work (morning).

### Cron

```bash
crontab -e

# Daily brief at 7am weekdays
0 7 * * 1-5 cd /path/to/your/vault && claude -p "Run /daily-brief" > /tmp/claude-daily-brief.log 2>&1

# Maintain every 30 min, 7am-9pm weekdays
0,30 7-21 * * 1-5 cd /path/to/your/vault && claude -p "Run /maintain" > /tmp/claude-maintain.log 2>&1

# Digest every 2 hours, 9am-9pm weekdays
0 9,11,13,15,17,19,21 * * 1-5 cd /path/to/your/vault && claude -p "Run /digest" > /tmp/claude-digest.log 2>&1

# Sleep at 1am daily
0 1 * * * cd /path/to/your/vault && claude -p "Run /sleep" > /tmp/claude-sleep.log 2>&1

# Independent work at 6am weekdays
0 6 * * 1-5 cd /path/to/your/vault && claude -p "Run /independent-work" > /tmp/claude-independent-work.log 2>&1
```

### Limitations of Path 1

- **No concurrency management.** If maintain is running when digest fires, both run simultaneously. With enough skills on cron, you can end up with 5+ Claude processes competing for resources.
- **No follow-up chaining.** If maintain's output references another skill, nothing happens. You'd need to check logs and run follow-ups manually.
- **No conversational threading.** Scheduled runs are fire-and-forget. You can't reply to a daily brief to calibrate — you'd have to open Claude Code separately.
- **No offline catch-up.** If your machine was asleep at 7am, launchd fires the daily brief when it wakes up, but it doesn't know what else it missed.

For these reasons, the Slack bot (Path 2) is recommended once you've calibrated your skills.

---

## Path 2: Slack Bot (Recommended for Full Automation)

The Node.js framework in `slack-bot/` handles scheduling, concurrency, follow-ups, and conversational threading. All skills run through Slack — scheduled jobs DM you results, and you can reply in-thread to calibrate, ask follow-ups, or run ad-hoc commands.

See [SETUP.md](SETUP.md#slack-bot-setup) for installation.

### How It Works

The bot is a single long-running Node.js process that:

1. **Connects to Slack via Socket Mode** — no public URL needed, runs on your local machine
2. **Polls a scheduler every 30 seconds** — checks if any job's schedule matches the current time
3. **Spawns Claude processes** through a process manager with concurrency limits
4. **DMs you results** and saves the session so you can reply in-thread with full context

### Scheduler

Jobs are defined in `jobs.json`. The scheduler uses 30-second polling (not cron) with disk-persisted dedup to prevent double-fires across restarts.

Each job fires based on a match function in `scheduler.js`:

| Job | When it fires | Dedup |
|-----|--------------|-------|
| maintain | Minutes 0 and 30, hours 7-21 ET, weekdays | Per hour-slot |
| digest | Hours 9, 11, 13, 15, 17, 19, 21 ET, weekdays | Per hour-slot |
| daily-brief | 7am-noon ET window, weekdays | Per day |
| sleep | 1am-noon ET window, daily | Per day |
| independent-work | Before noon ET, weekdays | Per day |

Jobs with per-day dedup have a wide fire window — if the bot was offline at 7am, the daily brief fires whenever the bot comes back online before noon.

**Silent vs. loud jobs:** Maintain is marked `silent: true`. It only DMs you if output passes two gates: a fast heuristic check (length, format) and an LLM verification call that classifies whether the output is genuinely actionable. This prevents "scan complete, nothing found" noise.

### Process Manager

The process manager caps concurrent Claude processes at a configurable limit (default 3). When a new job fires and all slots are full, it queues with priority ordering:

| Priority | Who |
|----------|-----|
| Highest | Interactive messages (DMs, @mentions) |
| Medium | Standard messages |
| Lowest | Scheduled jobs |

Interactive messages always preempt scheduled work. In channel threads, a new message from the user aborts the current in-flight response and restarts with the updated context.

### Follow-Up Chaining

When a skill's output references another skill (e.g., maintain says "recommend running /digest"), the bot detects the pattern and auto-chains execution in the same thread. Chain depth is capped at 2 to prevent runaway loops. Chainable skills are whitelisted in `followup.js`.

### Two Permission Modes

| Mode | Trigger | Tool Access |
|------|---------|-------------|
| **Full (DM)** | DM from owner, scheduled jobs | All tools except Slack posting (messages go through the bot) |
| **Restricted (channel)** | @mention in allowed channel | Read-only vault, no Edit, scoped to conversation |

Channel messages are gated by `channel-allowlist.json`. The bot ignores messages from channels not on the list.

### Identity System

The `identity.md` file defines the agent's personality and is appended to every Claude invocation as a system prompt. It covers voice, behavioral rules, anti-patterns, and two registers (direct with owner, professional with team). See `identity.example.md` for a template.

### Thread Membership

When the bot responds in a channel thread, it saves the session. If someone else replies in that thread within 24 hours, the bot sees it and uses judgment to decide whether to respond (without requiring an @mention). The bot won't butt in where it's not wanted — Claude evaluates whether its input would be helpful before responding.

---

## Notes

### Cost Estimates

Approximate per-run costs (varies with signal volume and vault size):

| Skill | Typical Cost | Notes |
|-------|-------------|-------|
| daily-brief | $0.50 - $2.00 | Most expensive — parallel sub-agents, web search, full synthesis |
| independent-work | $0.50 - $2.00 | Varies heavily by initiative complexity |
| sleep | $0.30 - $1.00 | Reads all memory files, full audit |
| maintain | $0.10 - $0.30 | Light scanning, memory writes |
| digest | $0.05 - $0.15 | Reads memory files, formats a summary |

With all skills on their default schedules, expect roughly $5-15/day. The Slack bot's silent-job verification gate adds ~$0.01 per maintain run.

### Start Manual, Automate Later

Run each skill by hand for a week first. Automation amplifies both good and bad patterns. Calibrate the daily brief until it's mostly right, run maintain/digest a few times to seed the memory files, and verify sleep is pruning the right things before putting it all on autopilot.

### Check Logs

Every skill writes to `agent/events/YYYY-MM-DD.md`. Review these to catch issues — false positives in scanning, stale context not being pruned, skills stepping on each other. The event logs are also what sleep uses to decide what to consolidate, so keeping them clean matters.

### MCP Availability

Some MCP servers (Slack, Calendar) require authentication that may expire. If a scheduled run fails, check MCP auth first. The Slack bot logs errors to `bot.err` and sends failure notifications for non-silent jobs.
