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

2. **Open Claude Code** in the directory where you keep your work (your "vault" — Obsidian, a project folder, whatever)

3. **Paste the setup prompt** from [SETUP.md](SETUP.md)

4. **Answer questions** about your role, projects, and tools

5. **Claude Code sets everything up** — customizes the harness, copies the scaffold, installs the skills

## What's Included

### Harness Template (`templates/CLAUDE.md`)
The `CLAUDE.md` file is the agent's operating system. It tells Claude Code who you are, where things live, and how to behave. The template is annotated so you know what to customize.

### Agent Space Scaffold (`templates/agent/`)
Pre-built directory structure for the agent's memory: registries for navigation, memories for learned behavior, event logs for session history, scratch space for working files.

### 4 Starter Skills (`skills/`)

| Skill | What it does |
|-------|-------------|
| **daily-brief** | Morning routine — synthesizes signals into prioritized action |
| **proactive-scan** | Periodic monitoring — surfaces things that need your attention |
| **sleep** | Nightly maintenance — prunes stale memories, consolidates duplicates, regenerates the hot registry |
| **independent-work** | Self-directed projects — the agent proposes and ships work aligned to your goals |

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (the CLI)
- A working directory with your files (Obsidian vault, project folder, etc.)
- MCP servers for your tools (Slack, calendar, etc.) — optional but recommended

## Philosophy

The agent starts dumb and gets smart through daily feedback loops. The `/daily-brief` skill tracks its own accuracy. The `/sleep` skill prunes what isn't useful. Over ~10 days of daily use, the agent goes from generic to genuinely useful.

The key insight: **memory is not storage, it's retrieval.** The agent doesn't try to remember everything. It maintains the *least* context needed to do each task well.
