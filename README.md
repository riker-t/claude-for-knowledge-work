# Claude Code for Knowledge Work — Starter Kit

Claude Code + a well-crafted harness + a handful of skills = a personal agent that compounds over time.

This is a starter kit for building a personal AI agent using [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (the CLI). No Slack bot, no server, no dependencies. Just Claude Code and a directory of markdown files.

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

## What's Included

### Harness Template (`templates/CLAUDE.md`)
The `CLAUDE.md` file is the agent's operating system. It tells Claude Code who you are, where things live, and how to behave. The template has inline comments showing what to customize. The setup process handles this automatically.

### Agent Space Scaffold (`templates/agent/`)
Pre-built directory structure for the agent's memory:
- **Registries** — `registry.md` (full map) and `registry-hot.md` (top 20 files, regenerated nightly)
- **Memories** — `judgment-rules.md`, `knowledge-gaps.md`, `preferences.md`, `self-assessment.md`
- **Event logs** — Daily session history (`events/YYYY-MM-DD.md`)
- **Projects** — Self-directed work tracker and initiative folders
- **Scratch** — Ephemeral working files, briefs, drafts

### 4 Starter Skills (`skills/`)

| Skill | What it does | Schedule |
|-------|-------------|----------|
| **daily-brief** | Morning routine — synthesizes signals from Slack, calendar, and vault into prioritized action | Daily, morning |
| **proactive-scan** | Periodic monitoring — surfaces things that need your attention, does small tasks | Hourly during work hours |
| **sleep** | Nightly maintenance — prunes stale memories, consolidates duplicates, regenerates the hot registry | Daily, midnight |
| **independent-work** | Self-directed projects — the agent proposes and ships work aligned to your goals | Daily |

Skills reference each other by describing work generically — so you can customize, replace, or skip any skill without breaking the others.

### Scheduling (`SCHEDULING.md`)
Guide for running skills automatically via macOS launchd or cron. **Start manual, automate after a week of calibration.**

## Requirements

- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** (the CLI) — required
- **A working directory** with your files (Obsidian vault, project folder, etc.) — required
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
