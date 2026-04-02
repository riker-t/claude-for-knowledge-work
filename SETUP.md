# Setup Guide

## Prerequisites

Before starting, make sure you have:

1. **Claude Code installed** — [Installation guide](https://docs.anthropic.com/en/docs/claude-code)
2. **A working directory** — An Obsidian vault, project folder, or any directory where you keep your work
3. **This repo cloned** — `git clone https://github.com/riker-t/claude-for-knowledge-work.git`
4. **(Optional) MCP servers configured** — Slack, Calendar (Clockwise), Notion, Linear, etc. The agent works without these but is more powerful with them.

## Setup

Open Claude Code in the directory where you keep your work, then paste:

```
I want to set up a personal agent using the starter kit from the claude-for-knowledge-work repo.

The repo is cloned at: [REPLACE WITH PATH TO YOUR CLONE]

Please:
1. Ask me about my role, my main projects (2-3), and what tools I use daily (Slack, calendar, etc.)
2. Customize templates/CLAUDE.md with my answers and copy it to ./CLAUDE.md in my working directory
3. Copy the templates/agent/ scaffold to ./agent/ in my working directory
4. Create a starter workspace if I don't already have one: goals/current/ with a sample goal file, inbox.md with a few starter items, and projects/ directory
5. Copy the skills/ folder to ~/.claude/skills/ — replace [YOUR_NAME] with my name and YOUR_SLACK_USER_ID with my Slack user ID in all skill files
6. Walk me through what each skill does and how to run them
```

Claude Code will ask you questions about your role and projects, then set everything up. This installs all 5 skills: daily-brief, maintain, digest, sleep, and independent-work.

## First Run

Start with the daily brief:

```
/daily-brief
```

On first run, the agent will:
- Create missing memory files (`judgment-rules.md`, `preferences.md`, etc.) automatically
- Ask you to configure signal sources (Slack channels, calendar, etc.)
- Present a rough first brief — that's expected

After the brief, it asks for calibration feedback. This is the learning loop — each correction makes the next brief better.

## What to Expect

| Timeframe | What happens |
|-----------|-------------|
| Day 1 | Rough brief, generic priorities. Agent is learning your world. |
| Day 3 | Better signal filtering. Fewer false positives. Maintain/digest cycle starts compounding. |
| Day 5 | Agent starts anticipating your priorities correctly. Independent-work picks up real initiatives. |
| Day 7 | Good time to automate. Skills are calibrated, memory is seeded, you know what works. |
| Day 10+ | Brief is genuinely useful. Agent catches things you'd miss. Sleep keeps it lean. |

## Next Steps

- **Run `/sleep` at end of day** to consolidate what the agent learned
- **Try `/maintain` and `/digest`** to see the background monitoring loop in action
- **Read [SCHEDULING.md](SCHEDULING.md)** to automate skills on a schedule
- **Customize your skills** — edit `~/.claude/skills/*/SKILL.md` to match your workflow

---

## Slack Bot Setup

The Slack bot gives you full automation: scheduled skills, conversational access via DM, and team-facing @mention support in channels.

### 1. Create a Slack App

Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app.

**Enable Socket Mode:**
- Settings > Socket Mode > Enable
- Generate an app-level token with `connections:write` scope (this is your `SLACK_APP_TOKEN`)

**Bot Token Scopes** (OAuth & Permissions > Scopes > Bot Token Scopes):

| Scope | Why |
|-------|-----|
| `channels:history` | Read channel messages |
| `channels:read` | List channels |
| `chat:write` | Send messages |
| `files:write` | Upload file responses |
| `groups:history` | Read private channel messages |
| `im:history` | Read DM messages |
| `im:read` | List DM conversations |
| `im:write` | Open DM conversations |
| `reactions:read` | Read reactions |
| `reactions:write` | Add status reactions (eyes, hourglass) |
| `users:read` | Resolve user info |

**Event Subscriptions** (Event Subscriptions > Subscribe to bot events):
- `message.im` — DM messages
- `message.channels` — Channel messages (for thread membership)
- `app_mention` — @mentions

Install the app to your workspace. Copy the Bot User OAuth Token (this is your `SLACK_BOT_TOKEN`).

### 2. Configure Environment

```bash
cd /path/to/your/clone/slack-bot
cp .env.example .env
```

Edit `.env`:
```
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
OWNER_USER_ID=U_YOUR_SLACK_USER_ID
BOT_NAME=Agent
VAULT_PATH=/path/to/your/vault
```

`OWNER_USER_ID` is your Slack user ID (find it in your Slack profile > three dots > Copy member ID). DMs are restricted to this user only.

### 3. Configure Identity

```bash
cp identity.example.md identity.md
```

Edit `identity.md` to customize the agent's personality, voice, and behavior. This gets appended to every Claude invocation as a system prompt. The template includes examples and anti-patterns.

### 4. Configure Scheduled Jobs

```bash
cp jobs.example.json jobs.json
```

Edit `jobs.json` to customize prompts, schedules, and timeouts. Each job has:

| Field | Description |
|-------|-------------|
| `name` | Must match a key in `MATCH_FUNCTIONS` in `scheduler.js` |
| `prompt` | The prompt sent to Claude. Replace `[YOUR_NAME]` with your name. |
| `mode` | `"full"` (DM-level access) or `"restricted"` (channel-level) |
| `silent` | `true` = only DM if output is actionable (used by maintain) |
| `maxTurns` | Max Claude conversation turns |
| `timeout` | Max runtime in milliseconds |
| `dedupKey` | `"day"` = once per day, `null` = once per hour-slot |

### 5. Configure Channel Allowlist

```bash
cp channel-allowlist.example.json channel-allowlist.json
```

Add channels where the bot should respond to @mentions:
```json
[
  { "id": "C_CHANNEL_ID", "name": "your-project-channel" }
]
```

The bot ignores messages from channels not on this list. DMs are always allowed (gated by `OWNER_USER_ID`).

### 6. Install and Test

```bash
npm install
node index.js
```

You should see:
```
[startup] Channel allowlist loaded: N channels
Claude Slack bot running (Socket Mode)
[scheduler] Registered: maintain
[scheduler] Registered: digest
...
```

Send the bot a DM to test. Type `status` to see active processes and registered jobs.

### 7. Set Up Persistence with launchd

The `com.claude-code-bot.plist` file is a template for running the bot as a macOS launch agent. Edit the paths:

```bash
cp com.claude-code-bot.plist ~/Library/LaunchAgents/com.claude-code-bot.plist
```

Edit `~/Library/LaunchAgents/com.claude-code-bot.plist` — update all `/path/to/your/` entries with your actual paths. Make sure `PATH` includes the directory where `node` and `claude` are installed.

Load it:
```bash
launchctl load ~/Library/LaunchAgents/com.claude-code-bot.plist
```

The bot will start automatically on login and restart if it crashes (`KeepAlive` is enabled). Logs go to `bot.log` and `bot.err` in the slack-bot directory.
