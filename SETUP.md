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
4. Copy the skills/ folder to ~/.claude/skills/
5. Walk me through what each skill does and how to run them
```

Claude Code will ask you questions about your role and projects, then set everything up.

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
| Day 3 | Better signal filtering. Fewer false positives. |
| Day 5 | Agent starts anticipating your priorities correctly. |
| Day 10 | Brief is genuinely useful. Agent catches things you'd miss. |

## Next Steps

- **Run `/sleep` at end of day** to consolidate what the agent learned
- **Try `/proactive-scan`** for periodic monitoring between briefs
- **Read [SCHEDULING.md](SCHEDULING.md)** to automate these skills on a schedule
- **Customize your skills** — edit `~/.claude/skills/*/SKILL.md` to match your workflow
