---
name: daily-brief
description: Morning priorities and context brief
---

# Daily Brief

Your one morning routine — synthesize all signals into prioritized action.

## Workflow

1. **Load goals and priorities first** — Read `goals/` and any priority files. This frames everything that follows. Without this step, the brief is just a list of noise.

2. **Gather signals** — Scan your input sources:
   - Slack channels (configure your channels below)
   - Calendar (today + tomorrow)
   - Inbox/task list
   - Any other daily inputs (news, weather, lunch — whatever you care about)

3. **Synthesize** — Build a recommended brief:
   - **Top 3 priorities** for the day — what matters most, not what's loudest
   - **Meeting prep** for each upcoming meeting — key context, what you need to know, what to prepare
   - **Items needing your attention** — things that are blocked on you or time-sensitive
   - **Signals worth knowing about** — no action needed, but useful context

4. **Re-filter through goals** — Take your draft brief and run it back through your goals from Step 1. Does it actually focus on what matters? Cut anything that doesn't serve your priorities. This is the most important step.

5. **Write the brief** — Output to `agent/scratch/briefs/YYYY-MM-DD.md`

6. **Calibration** — Ask for feedback. Track accuracy over time in `agent/memories/skills/daily-brief.md`.

## Configuration

<!-- CUSTOMIZE: Replace these with your actual sources -->
Slack channels to scan: [list your channels]
Calendar source: [Clockwise MCP / Google Calendar / etc.]
Other inputs: [weather, lunch orders, sports, news — whatever you want in your morning brief]

## Calibration Tracking

After each brief, ask: "How did I do? What did I get right, what did I miss?"

Track in `agent/memories/skills/daily-brief.md`:
- **Priority accuracy** — Did top 3 match what actually mattered that day?
- **Signal quality** — Did I surface things you didn't already know?
- **Meeting prep usefulness** — Did the prep actually help?

The goal: go from ~36% accuracy on Day 1 to near-100% by Day 10 through daily feedback. The agent starts dumb. Feedback makes it smart.
