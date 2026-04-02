---
name: maintain
disable-model-invocation: true
description: Silent background maintenance loop. Processes transcripts, scans Slack, checks calendar/Linear/CC logs, updates agent memories. Runs every 30 min via cron. Do NOT use for daily brief or interactive work.
author: Claude Code
version: 1.0.0
---

# Maintain

Silent background maintenance loop. Runs every 30 min, 7am-9pm ET, weekdays. Does the work — does NOT report.

**Not the daily brief.** The brief is interactive. **Not the digest.** The digest reads what maintain wrote and summarizes. Maintain is the workhorse — it gathers, executes, and writes observations to memory files.

## Non-negotiables

1. **Silent by default.** Only DM for genuinely urgent items (blocker, time-sensitive unreplied thread). Everything else gets written to memory files for /digest to pick up.
2. **Transcript processing is the mandatory gate.** Check `transcripts/unprocessed/` first. If any exist, process ALL of them via `/process-meeting` before moving to other steps. This is non-negotiable — transcripts decay in value every hour.
3. **Write observations to agent memory files, not to state file narrative.** The state file is timestamps only. Observations go to the appropriate `agent/memories/` file tagged `[observed] — YYYY-MM-DD`.
4. **10-minute budget per cycle.** Stop when time's up. Better to do 3 things well than 8 poorly.

## Workflow

### 1. Process transcripts (MANDATORY GATE)

Check `transcripts/unprocessed/` for files. If any exist:
1. Process ALL of them via `/process-meeting` before moving to step 2.
2. Track in state file: `last_transcript_process: YYYY-MM-DD HH:MM ET`.
3. If processing all would exceed budget, prioritize: (a) today's meetings, (b) transcripts feeding upcoming meetings in next 24h, (c) everything else oldest-first. Resume remaining next cycle.
4. **Never** "discover and report" transcripts without processing them.

### 2. Scan Slack

Scan across all surfaces where [YOUR_NAME] is active — not just watchlist channels.

- **DMs** — scan recent DMs (inbound and conversations [YOUR_NAME] is active in). Read full threads, skip if [YOUR_NAME] already replied or reacted, skip if resolved without them. Extract decisions, asks, and commitments [YOUR_NAME] made.
- **Mentions & threads** — scan messages where [YOUR_NAME] is tagged or actively participating. Threads [YOUR_NAME] has replied in are live context — track how they evolve even after their reply.
- **Messages [YOUR_NAME] wrote** — scan [YOUR_NAME]'s recent outbound messages across all channels. These reveal commitments ("I'll send that by EOD"), decisions, and context shifts. Write observations to the relevant project memory file.
- **Project channels** — read `agent/config/channel-watchlist.md`. For each channel, scan messages since `last_channel_scan` in state file. Extract decisions, status changes, blockers, shipped work. Write observations to the memory file specified in the watchlist's "Routes to" column, tagged `[observed] — YYYY-MM-DD`. Update `last_channel_scan` in state file.
- **Auto-add channels to watchlist** if [YOUR_NAME] becomes active in a channel not yet on the list. See `agent/config/channel-watchlist.md` auto-add rule for triggers.
- Re-verify reply status at write time, not just scan time. [YOUR_NAME] is active — a thread flagged as "unreplied" at scan may be resolved by the time you write it.

### 3. Check calendar

Use your calendar tool (gws CLI, Clockwise MCP, Google Calendar MCP, etc.) to check:
- Recently ended meetings: check for unprocessed transcripts.
- Upcoming meetings (next 2-3 hours): flag prep needs, write to relevant project memory files.

### 4. Scan Linear

- Team-wide scan: issue status changes, new comments, sprint progress.
- Write observations to relevant `agent/memories/projects/` files.
- Update `last_linear_scan` in state file.

### 5. Read Claude Code session logs

- Check recent CC session logs to understand what [YOUR_NAME]'s been working on.
- Update agent context in relevant memory files.
- Update `last_cc_log_scan` in state file.

### 6. Memory maintenance

- In files you just updated this cycle, prune stale `[observed]` entries (>7 days old with no recent relevance).
- Never prune `[corrected]` entries.

### 7. Update state file

Update timestamps in `agent/scratch/autopilot-state.md`. **Timestamps only** — no narrative, no "Done This Cycle" sections, no historical logs.

### 8. Do the work

Act on what you found. Use skills — don't reinvent them.

- Meeting without prep → `/prep-meeting`
- Inbox item needing a Slack draft → `/writing-slack`
- Inbox item needing research → do the research, add findings as sub-bullets
- Waiting-on items → check Slack for resolution, update status
- Open items → if scanning reveals real-world completion, add sub-bullet: "Completed: [evidence]. Safe to mark [x]."
- Items marked `[x]` → move to `inbox-done/`

**Priority:** Transcripts first (gate above), then meeting-blocking items, then outbound messages, then stale waiting-on items, then research.

**Skip:** Personal/offline items, items already handled, items requiring [YOUR_NAME]'s hands.

### 9. Log

Append to `agent/events/YYYY-MM-DD.md`.

Before finishing, cross-reference `inbox-done/` current week file against `inbox.md` — if any completed items still appear in inbox, remove them.

## Tools

- Slack MCP — `search_messages`, `list_messages`, `get_thread_replies`, `post_message` (drafts only until approved)
- Linear MCP — issue queries, sprint status, comments
- Your calendar tool (gws CLI, Clockwise MCP, Google Calendar MCP, etc.)
- Your notes tool CLI (if available) — for reading daily notes and vault context (never write to daily notes)
- `agent/scratch/autopilot-state.md` — cycle state (timestamps only)
- `agent/memories/skills/maintain.md` — learned patterns and calibration
- `inbox.md` / `inbox-done/` — task management
- `goals/current/*.md` — priority framework
- `agent/memories/people/*.md` — contact context for drafting messages
- `agent/config/channel-watchlist.md` — project channels to scan
- CC session logs — understand [YOUR_NAME]'s recent work
- [YOUR_NAME]'s Slack user ID: `YOUR_SLACK_USER_ID`

## Guardrails

- **Never send messages without explicit approval.**
- **Never write to daily notes** (`journal/daily/`).
- **Inbox discipline:** Add sub-bullets to enrich items. Don't reorder, merge, or reprioritize.
- **Log everything** to `agent/events/YYYY-MM-DD.md`.
- **State file is timestamps only.** No narrative. No history. Just timestamps.
