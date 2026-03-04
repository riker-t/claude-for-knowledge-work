---
name: proactive-scan
description: Periodic monitoring loop — runs hourly during work hours.
author: Claude Code
version: 2.0.0
---

# Proactive Scan

Background execution loop. Runs hourly, 7am–7pm ET, weekdays. Gathers signals, does work, reports what needs [YOUR_NAME]'s input.

**Not the daily brief.** The brief is interactive — it presents and iterates with [YOUR_NAME]. Proactive Scan is autonomous — it gathers, executes, and reports.

## Non-negotiables

1. **Never send messages without approval.** Draft only. All outbound requires [YOUR_NAME]'s explicit approval.
2. **Read before flagging.** For every Slack thread you consider mentioning, read the full thread. Only flag threads that genuinely need [YOUR_NAME]'s attention right now.
3. **Don't re-do work.** Check state file for items already handled this cycle.
4. **10-minute budget.** Stop when time's up. Better to do 3 things well than 8 poorly.
5. **Silent when nothing's actionable.** Return exactly `NO_ACTION`. Don't report noise.

## Jobs

### 1. Gather signals

Scan for what happened since the last run:

- **Slack** — unreplied mentions and DMs. Read full threads, skip if [YOUR_NAME] already replied or reacted, skip if resolved without them.
- **Calendar** — recently ended meetings (check for unprocessed transcripts), upcoming meetings (check for missing prep).
- **Vault** — inbox items, project activity, goal context.

### 2. Do the work

Act on what you found. Use skills — don't reinvent them:

- Unprocessed transcript → process it (extract decisions, action items, people context, route to vault files)
- Meeting without prep → build a context brief (pull relevant vault files, Slack threads, prior meeting notes for attendees)
- Inbox item needing a Slack draft → draft a response in [YOUR_NAME]'s voice
- Inbox item needing research → do the research, add findings as sub-bullets
- Waiting-on items → check Slack for resolution, update status
- Open items → if Slack scanning reveals real-world completion (shipped, sent, resolved), add sub-bullet: "Completed: [evidence]. Safe to mark [x]."
- Items marked `[x]` → move to `inbox-done/`
- Inbox maintenance → Run inbox maintenance (move completed items to inbox-done, enrich items with sub-bullets) (once per cycle, skip if < 4 hours since last run per state file `last_inbox_process`)

**Priority:** Meeting-blocking items first, then outbound messages, then stale waiting-on items, then research.

**Skip:** Personal/offline items, items already in state file, items requiring [YOUR_NAME]'s hands.

### 3. Report

Present what you did and what needs approval. Max 5 bullets. End with:
> _Reply to approve drafts, correct priorities, or tell me what I got wrong._

[YOUR_NAME]'s replies are calibration — capture corrections in `agent/memories/skills/proactive-scan.md`.

### 4. Update state

Write what you did to `agent/scratch/proactive-scan-state.md` (what's done, what's pending approval, what was skipped). Reset tables if the date rolled over. Append to `agent/events/YYYY-MM-DD.md`.

Before finishing, cross-reference `inbox-done/` current week file against `inbox.md` — if any completed items still appear in inbox, remove them. This catches items moved to done by earlier sessions but still present due to stale reads.

### 5. Calibrate

After each cycle, briefly check: is the work you're doing actually moving [YOUR_NAME] toward their goals? Cross-reference `goals/current/*.md` against what you spent time on this cycle. If you're burning minutes on low-value items while high-priority goals have obvious next actions sitting idle, adjust. Capture any pattern shifts in `agent/memories/skills/proactive-scan.md`.

## Tools

- Slack MCP — `search_messages`, `list_messages`, `get_thread_replies`, `post_message` (drafts only until approved)
- Clockwise MCP — `fetch_events`, `search_events`
- Obsidian CLI — `obsidian daily:read` for [YOUR_NAME]'s daily note context (never write to daily notes)
- `agent/scratch/proactive-scan-state.md` — cycle state (create if missing)
- `agent/memories/skills/proactive-scan.md` — learned patterns and calibration
- `inbox.md` / `inbox-done/` — task management
- `goals/current/*.md` — priority framework
- `agent/memories/people/*.md` — contact context for drafting messages
- [YOUR_NAME]'s Slack user ID: `YOUR_SLACK_USER_ID`

## Guardrails

- **Never send messages without explicit approval.**
- **Never write to daily notes** (`journal/daily/`).
- **Inbox discipline:** Add sub-bullets to enrich items. Don't reorder, merge, or reprioritize.
- **Log everything** to `agent/events/YYYY-MM-DD.md`.
