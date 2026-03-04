---
name: proactive-scan
description: Periodic signal monitoring — scans channels for things that need attention
---

# Proactive Scan

Monitor your signal sources without being asked. Surface what needs attention, ignore what doesn't.

## Workflow

1. **Scan signal sources** — Check configured channels for new activity since last scan:
   - Slack: @mentions, DMs, key threads in watched channels
   - Follow-ups: anything you're waiting on that got resolved
   - Meeting transcripts: process new transcript files since last scan

2. **Filter** — Not everything is worth surfacing. For each signal, ask:
   - Does this need action from me?
   - Is someone waiting on me?
   - Did a follow-up I was tracking get resolved?
   - Is this a signal relevant to my goals/projects?
   - If none of the above: skip it.

3. **Summarize** — Quick digest of what survived the filter:
   - **Needs attention** — Items requiring action, with priority level
   - **Completed follow-ups** — Things you were waiting on that resolved
   - **Notable signals** — No action needed, but worth knowing

4. **Log** — Append scan results to `agent/events/YYYY-MM-DD.md`

## Configuration

<!-- CUSTOMIZE: Replace with your sources -->
Slack channels: [your channels]
Scan frequency: hourly (when running via cron/launchd) or on-demand
Transcript source: [Granola / Otter / manual drop]

## Running Automatically

To run this on a schedule, set up a launchd job (macOS) or cron job that invokes Claude Code with the `/proactive-scan` skill. See the [launchd guide](https://www.notion.so/launchd-Scheduled-Scripts-on-macOS-3153d1a933618132b248d4b4bc8189c5) for setup instructions.

## Tips

- Start with a small number of channels. Add more as the filter gets tuned.
- The filter is the skill. A scan that surfaces everything is worse than no scan.
- Track false positives (surfaced something useless) and false negatives (missed something important) in `agent/memories/skills/proactive-scan.md`.
