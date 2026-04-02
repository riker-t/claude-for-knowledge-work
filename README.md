# Claude Code for Knowledge Work — Starter Kit

Claude Code + a well-crafted harness + a handful of skills = a personal agent that compounds over time.

This is a starter kit for building a personal AI agent using [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (the CLI). It includes a set of skills that run on a schedule, an optional Slack bot for full automation, and a directory of markdown files that serve as the agent's memory.

## The Core Idea

Your agent has two spaces with one hard boundary between them:

| | My Space | Agent Space |
|---|---|---|
| **Who writes** | You | The agent |
| **What's in it** | Projects, goals, journal, resources | Memories, event logs, scratch work |
| **Examples** | `projects/`, `goals/`, `resources/` | `agent/memories/`, `agent/events/` |

**The boundary is the whole game.** You never edit the agent's files. The agent never edits yours without permission. This gives you a clean workspace and gives the agent a memory that compounds.

## Quick Start

1. **Clone this repo**
   ```bash
   git clone https://github.com/riker-t/claude-for-knowledge-work.git
   ```

2. **Install Claude Code** if you haven't already — [docs](https://docs.anthropic.com/en/docs/claude-code)

3. **Open Claude Code** in the directory where you keep your work (your "vault" — Obsidian, a project folder, whatever)

4. **Paste the setup prompt** from [SETUP.md](SETUP.md) — Claude Code will ask about your role, set up the scaffold, create starter workspace files, and personalize all skills with your name

5. **Run your first daily brief:** `/daily-brief`

6. **(Optional) Set up the Slack bot** for full automation — see [SETUP.md](SETUP.md#slack-bot-setup) and [SCHEDULING.md](SCHEDULING.md)

## What's Included

### Harness Template (`templates/CLAUDE.md`)
The `CLAUDE.md` file is the agent's operating system. It tells Claude Code who you are, where things live, and how to behave. The template has inline comments showing what to customize. The setup process handles this automatically.

### Agent Space Scaffold (`templates/agent/`)
Pre-built directory structure for the agent's memory:
- **Registries** — `registry.md` (full map) and `registry-hot.md` (top 20 files, regenerated nightly)
- **Memories** — `judgment-rules.md`, `knowledge-gaps.md`, `preferences.md`, `self-assessment.md`, `writing-style.md`
- **Event logs** — Daily session history (`events/YYYY-MM-DD.md`)
- **Projects** — Self-directed work tracker and initiative folders
- **Scratch** — Ephemeral working files, briefs, drafts

### 5 Skills (`skills/`)

| Skill | What it does | Schedule |
|-------|-------------|----------|
| **daily-brief** | Morning routine — synthesizes signals from Slack, calendar, and vault into prioritized action items with work product attached | Daily, morning |
| **maintain** | Silent background loop — processes transcripts, scans Slack, checks calendar/Linear, updates agent memories | Every 30 min during work hours |
| **digest** | Periodic summary — reads what maintain wrote and sends a brief Slack DM with what changed | Every 2 hours during work hours |
| **sleep** | Nightly consolidation — prunes stale memories, consolidates duplicates, regenerates the hot registry, calibrates agent infrastructure | Daily, overnight |
| **independent-work** | Self-directed projects — the agent proposes and ships work aligned to your goals | Daily |

Skills reference each other by describing work generically — you can customize, replace, or skip any skill without breaking the others.

### Slack Bot (`slack-bot/`)
A Node.js framework for running your agent as a Slack bot. Handles scheduling, concurrency, follow-up chaining, and two permission modes. See the [Slack Bot](#slack-bot) section below.

### Scheduling (`SCHEDULING.md`)
Guide for running skills automatically — either via macOS launchd/cron (simple) or the Slack bot (full automation). **Start manual, automate after a week of calibration.**

## How the Automated Loop Works

The skills form a cycle:

1. **maintain** runs every 30 minutes. It silently scans Slack, processes transcripts, checks calendar and Linear, and writes observations to `agent/memories/`. It does the work but never reports directly.

2. **digest** runs every 2 hours. It reads what maintain wrote to memory files since the last digest and sends you a brief Slack DM — 5-7 bullets of what changed and what needs your attention.

3. **sleep** runs overnight. It reads the day's event logs, prunes stale memories, consolidates duplicates, graduates recurring patterns to durable rules, and regenerates the hot registry. This is what makes the agent leaner and smarter over time.

4. **independent-work** runs once daily. It scans your goals, inbox, and Slack for opportunities, then picks a self-directed initiative and ships a concrete artifact (research, draft, prototype, analysis).

5. **daily-brief** is the interactive morning routine. It gathers all signals, forms a judgment about what matters, presents priorities, and captures your calibration feedback.

The key: maintain does the scanning, digest reports what maintain found, sleep consolidates overnight, and daily-brief is your conversation with the agent about what matters.

## Event Logging

Every skill writes to `agent/events/YYYY-MM-DD.md` with a consistent format:

```markdown
## skill-name — HH:MM
- **Actions:** {what was done}
- **Outcomes:** {results, decisions, corrections}
- **Files accessed:** {list of files read/written}
```

This is the connective tissue between skills. Sleep reads event logs to decide what to prune and what to graduate. Digest reads what maintain wrote. Independent-work reads recent logs to understand your current focus. The hot registry is regenerated from 14 days of access patterns in event logs.

## Slack Bot

The `slack-bot/` directory contains a Node.js framework that turns your agent into a Slack bot with full automation capabilities.

**Two permission modes:**
| Mode | Trigger | Capabilities |
|------|---------|-------------|
| **DM (full access)** | Direct message from owner | All tools — read, write, edit vault files, run skills, web search |
| **Channel (scoped)** | @mention in an allowed channel | Read-only vault access, no file edits, scoped to the conversation |

**Key features:**
- **Custom scheduler** — 30-second polling with dedup, replaces node-cron (which had double-fire bugs). Jobs defined in `jobs.json`.
- **Process manager** — Caps concurrent Claude processes (default 3), queues overflow with priority ordering.
- **Follow-up chaining** — When one skill's output references another skill, the bot auto-chains execution.
- **Identity system** — Configurable personality via `identity.md`. Defines voice, anti-patterns, and two registers (owner vs. team).
- **Thread membership** — Bot auto-responds in channel threads it previously participated in (24-hour TTL).
- **Offline catch-up** — On restart, replays missed @mentions and thread messages.

See [SETUP.md](SETUP.md#slack-bot-setup) for installation and [SCHEDULING.md](SCHEDULING.md) for scheduling details.

## Requirements

- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** (the CLI) — required
- **A working directory** with your files (Obsidian vault, project folder, etc.) — required
- **Node.js 18+** — required only if using the Slack bot
- **MCP servers** for your tools (Slack, calendar, etc.) — optional but recommended for full signal gathering

## How the Memory System Works

The agent uses a three-tier retrieval system:

| Tier | File | Purpose |
|------|------|---------|
| L1 | `agent/registry-hot.md` | ~20 most-accessed files. Read first. |
| L2 | `agent/registry.md` | Full routing table. Fallback. |
| L3 | Individual memory files | Actual content. Load on demand. |

Every observation gets a provenance tag: `[observed]` (agent noticed it) or `[corrected]` (you confirmed/fixed it). Corrected entries never get pruned — they're ground truth.

The `/sleep` skill runs nightly to consolidate memories, prune stale entries, and regenerate the hot registry based on the last 14 days of access patterns.

## Philosophy

The agent starts dumb and gets smart through daily feedback loops. The `/daily-brief` skill tracks its own accuracy. The `/sleep` skill prunes what isn't useful. Over ~10 days of daily use, the agent goes from generic to genuinely useful.

The key insight: **memory is not storage, it's retrieval.** The agent doesn't try to remember everything. It maintains the *least* context needed to do each task well.
