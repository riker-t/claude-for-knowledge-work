---
name: digest
disable-model-invocation: true
description: Periodic digest of what changed since last digest. Reads agent memory files updated by /maintain, synthesizes a brief Slack DM. Runs every 2 hours via cron. Do NOT use for daily brief or deep analysis.
author: Claude Code
version: 1.0.0
---

# Digest

Periodic summary of what changed since the last digest. Reads what /maintain has been writing to agent memory files and synthesizes a brief Slack DM.

**Not the daily brief.** The brief is comprehensive morning context. **Not /maintain.** Maintain does the work. Digest reads the results and tells [YOUR_NAME] what matters.

## Non-negotiables

1. **Read what /maintain has written — don't re-scan Slack/channels yourself.** The memory files are your source of truth. Maintain already did the scanning.
2. **Only report changes since last digest.** Use `last_digest` timestamp from `agent/scratch/autopilot-state.md`.
3. **Max 5-7 bullets.** Brief and actionable. Every bullet should help [YOUR_NAME] decide what to do.
4. **Always DM.** Never skip. If nothing major changed, send a brief "quiet period" note with calendar lookahead. [YOUR_NAME] always wants to see the digest.

## Workflow

### 1. Read state file

Read `agent/scratch/autopilot-state.md` for `last_digest` timestamp. This is your cutoff — only report observations newer than this.

### 2. Read agent memory files

Scan `agent/memories/` for observations tagged with dates after `last_digest`. Focus on:
- `agent/memories/projects/*.md` — project updates
- `agent/memories/people/*.md` — people context changes
- `agent/memories/skills/maintain.md` — any new calibration notes

### 3. Check unreplied Slack items

Check if /maintain flagged any unreplied items that need [YOUR_NAME]'s attention. These should be in the relevant memory files already — don't re-scan Slack.

### 4. Calendar lookahead

Check calendar for the next 2-3 hours. Flag meetings that need prep or have relevant context from recent /maintain observations.

### 5. Summarize [YOUR_NAME]'s recent work

If /maintain updated CC log context, briefly note what [YOUR_NAME]'s been focused on (1 bullet max).

### 6. Format as Slack mrkdwn

- Max 5-7 bullets
- Use Slack mrkdwn format (*bold*, _italic_, bullet points with •)
- Lead with the most actionable items
- End with a one-line "next digest at HH:MM" note

### 7. Update state file

Set `last_digest` in `agent/scratch/autopilot-state.md` to current time.

## Tools

- `agent/scratch/autopilot-state.md` — timestamps
- `agent/memories/` — all memory files (read only — don't modify)
- Your calendar tool (gws CLI, Clockwise MCP, Google Calendar MCP, etc.)
- [YOUR_NAME]'s Slack user ID: `YOUR_SLACK_USER_ID`

## Calibration (handling [YOUR_NAME]'s replies)

When [YOUR_NAME] replies to a digest thread, treat it as calibration feedback. This is how the system learns.

1. **Corrections** ("that's not a decision, Read was just brainstorming") → Write a `[corrected]` entry to `agent/memories/skills/maintain.md` with the rule and why. Fix the original observation in the relevant project memory file.
2. **Priority adjustments** ("I don't care about X" / "Y is more important than you think") → Update `agent/memories/judgment-rules.md` or the relevant project memory file. Tag `[corrected]`.
3. **Missing context** ("you missed that Z happened") → Write the observation to the relevant memory file. Tag `[corrected]` if it corrects a wrong assumption, `[observed]` if it's net-new info.
4. **Approval/action requests** ("go ahead and draft that reply" / "prep me for the 2pm") → Execute using the appropriate skill (`/writing-slack`, `/prep-meeting`, etc.).
5. **Acknowledgments** ("thanks" / "got it") → No action needed. Don't echo back.

After processing feedback, briefly confirm what you updated (one line). Don't re-send the digest.

## Guardrails

- **Never re-scan Slack.** Trust /maintain's observations.
- **Never write to daily notes** (`journal/daily/`).
- **State file updates:** Only touch `last_digest` timestamp.
- **Log to `agent/events/YYYY-MM-DD.md`.**
- **Calibration writes:** When processing [YOUR_NAME]'s replies, you MAY write to memory files (unlike the initial digest which is read-only). This is the feedback loop.
