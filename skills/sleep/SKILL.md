---
name: sleep
description: Nightly memory consolidation. Runs at midnight ET daily via cron.
author: Claude Code
version: 2.0.0
---

# Sleep

Nightly memory hygiene. Make the agent smarter and leaner overnight.

## Pre-flight

1. Read `agent/memories/skills/sleep.md`. Apply `[corrected]` entries as hard constraints.
2. Commit `agent/` before making changes: `git add agent/ && git commit -m "sleep: pre-consolidation snapshot"`

## Jobs

### 1. Clean up memories

Read today's event stream (`agent/events/YYYY-MM-DD.md`) and all files in `agent/` (excluding `agent/events/` and `agent/scratch/`). This includes `agent/memories/*.md`, `agent/memories/people/*.md`, and `agent/memories/projects/*.md`. Look for:

- **Duplicates** — same rule stated in multiple files or multiple times in one file. Merge them.
- **Stale entries** — `[observed]` entries with timestamps older than 30 days. Archive them. 90+ days, delete them.
- **Dead references** — paths to files that no longer exist. Fix or remove them.
- **Conflicts** — rules that contradict each other. `[corrected]` always wins over `[observed]`. CLAUDE.md always wins over memories.

Never prune `[corrected]` entries.

### 2. Graduate patterns to durable updates

When an `[observed]` pattern has 3+ occurrences across 2+ sessions, it's real. Graduate it:

- If it's a skill behavior → update the skill's memory file in `agent/memories/skills/`
- If it's a routing pattern → update `agent/registry.md`
- If it's a cross-file relationship (files always co-loaded) → add cross-references

### 3. Clean out stale context

- Registry entries pointing to missing files → remove
- Memory files with no recent activity and no `[corrected]` entries → consider archiving
- Scratch files older than 7 days with no references → delete

## Tools

- `agent/events/YYYY-MM-DD.md` — today's evidence (what happened, what failed, what was accessed)
- `agent/memories/*.md` — all memory files (the thing you're cleaning)
- `agent/registry.md` — routing table (maps names → filepaths + load triggers)
- `agent/scratch/proactive-scan-state.md` — what proactive-scan did today
- `agent/projects/tracker.md` — initiative pipeline
- Obsidian CLI (`obsidian orphans total`, `obsidian unresolved total`) — vault health, if Obsidian is running
- Git — for the pre-flight snapshot and verifying file existence

## Guardrails

- **Evidence-based.** Every change links to specific evidence from events, calibration, or session logs.
- **Never prune `[corrected]` entries.** These are [YOUR_NAME]'s explicit corrections.
- **`agent/` is the agent's space.** Contains learned behaviors, people context, project observations. Reference docs belong in `resources/`. [YOUR_NAME]'s space (`projects/`, `goals/`, `journal/`, etc.) is read-only for the agent.
- **Log everything.** Append a changelog to `agent/events/YYYY-MM-DD.md` when done.

### 4. Calibrate

Step back and evaluate whether the agent's infrastructure is actually serving [YOUR_NAME] well. Cross-reference recent event logs (`agent/events/`) and `goals/current/` to answer:

- Are the right memories loading for the work [YOUR_NAME] is actually doing? Or are high-value sessions missing context that exists somewhere but isn't wired in?
- Is the registry routing to the right files? Are there skills or memories that never get loaded, or get loaded but aren't useful?
- Does `CLAUDE.md` reflect how the agent is actually being used, or has it drifted?
- What did [YOUR_NAME] struggle with recently that better agent infrastructure could have prevented?

If something is off, fix it. This is the meta-job — making sure jobs 1-3 are pointed at the right things.

**Memory file splitting — tiered thresholds:**
- **General memories** (`agent/memories/*.md`) — ~20 entries max. These load frequently across many session types. Must be lean.
- **Skill memories** (`agent/memories/skills/*.md`) — ~40 entries max. These load only for their specific skill.
- **Project observations** (`agent/memories/projects/*.md`) — ~35 entries max per file. Split by work cluster, not monolithic per-team.

If a file exceeds its tier's threshold, evaluate whether entries cluster into distinct topics. If they do, split into focused files, update `agent/registry.md`, and add cross-references.

### 5. Refresh registry-hot

Regenerate `agent/registry-hot.md` — the agent's quick-reference for the ~20 most important files. This is the hot cache; `agent/registry.md` is the full routing table.

**Data source:** Scan `agent/events/` from the last 14 days. Tally all files listed under "Files accessed" entries.

**Selection criteria (combine all three):**
- **Frequency** — files accessed most often across sessions
- **Recency** — files accessed in the last 3 days get a boost
- **Durability** — prefer files that are useful across many task types over files only relevant to one skill

**Exclude from the table:**
- Event log files (`agent/events/*.md`) — ephemeral, date-specific
- Scratch files (`agent/scratch/*`) — ephemeral working files
- Skill definition files (`~/.claude/skills/*/SKILL.md`) — loaded by skill invocation, not by agent judgment
- State files (`agent/scratch/proactive-scan-state.md`) — internal state, not useful context
- **Skill memory files** — any memory file whose registry load trigger references a single specific skill (e.g., "Load before /daily-brief"). These are loaded by the skill, not by the table.

**General memory files earn table slots:** Memory files useful across multiple session types — judgment-rules, preferences, people-dynamics, writing-style, slack-patterns, inbox-format, verification-checklist.

**Table format:** 3 columns — File, What's in it (one line), When to fetch. ~20 rows. Replace the table in `agent/registry-hot.md`.

**Pinned entries:** Rows marked `[pinned]` in the "When to fetch" column are permanent. Never remove them during regeneration. They were placed by [YOUR_NAME] and represent always-relevant context.

**Selection:** Use best judgment based on recent session patterns. Fill remaining slots with whatever is most valuable — could be project files, goal files, resource files, or agent context files. No prescriptive file type minimums.

### 6. Context budget audit

The agent's #1 design principle is **minimum viable context** — load the least amount needed to do the task well. Every /sleep cycle must verify the memory structure enables this by asking three questions:

**1. Where did sessions load too much?**
Review the last 3 days' event logs. For each session, check: what files were loaded vs. what files were actually referenced in the work? Files loaded but never used reveal over-eager loading patterns. Fix these by:
- Tightening registry load triggers (make them more specific)
- Splitting files so sessions can load a narrow slice instead of a broad dump
- Removing entries from general memory files that only matter for one skill (move to skill memory)

**2. Where should context be split?**
- Memory files respect their tier's threshold (general: ~20, skills: ~40, projects: ~35). The thresholds are hard rules, not suggestions.
- Project observation files are split by work cluster, not monolithic per-team. Each file should load only for its cluster of projects.
- If a file has entries that serve different task types, it should probably be split — the goal is that loading one file gives you exactly what you need, not a mix of relevant and irrelevant context.

**3. Where is context duplicated or unnecessary?**
- Count total entries across all memory files. If the total exceeds ~400, something is accumulating without being pruned. Investigate.
- Check if any file has entries that haven't been referenced in 30+ days of event logs. These are candidates for archival.
- Check if `agent/registry-hot.md` has grown past 20 rows. If so, something is being added without something being removed.
- The hot registry is a routing layer, not a knowledge dump. Each row should tell you *when to fetch*, not try to summarize the file's contents. If any description exceeds ~10 words, shorten it.
- Registry load triggers must be specific. "Load when working on X" is good. "Load for context" is too vague — tighten it.

### 7. Validate organization

Final pass after all changes. For each memory file:

- Read its one-line description (the line after the canonical source header)
- Check that every entry falls within that description's scope
- If an entry belongs in a more specific file, move it there

This prevents drift back toward monolithic catch-all files. The description is the contract — entries that don't match the description get routed to the file where they do.

## Changelog format

```
## sleep — HH:MM
- **Changes:** {list of what changed and why}
- **Graduated:** {patterns promoted to durable updates}
- **Archived/deleted:** {stale entries cleaned}
- **Files accessed:** {list}
```
