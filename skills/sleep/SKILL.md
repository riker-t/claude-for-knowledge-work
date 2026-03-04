---
name: sleep
description: Nightly memory consolidation — prune, organize, validate
---

# Sleep

Nightly maintenance of the agent's memory space. This is how the agent stays sharp instead of accumulating noise.

## What It Does

1. **Enforce line budgets** — Each memory file has a maximum size. The agent freely organizes content within these constraints, optimizing for progressive disclosure (load the least, get the most).
   - General memory files: 20 entries max
   - Skill-specific memories: 40 entries max
   - Project memories: 35 entries max

2. **Prune stale entries** — Remove `[observed]` entries older than 30 days with no reinforcement (not referenced in recent events, not reinforced by new observations). **Never prune `[corrected]` entries** — those are ground truth.

3. **Consolidate duplicates** — Merge entries that say the same thing. Keep the most recent date. Prefer the more specific version.

4. **Enforce provenance** — Every entry in `agent/` must have `[observed]` or `[corrected]` with a date suffix (`— YYYY-MM-DD`). Flag or fix any that don't comply.

5. **Validate organization** — Check that memory files are organized semantically by topic, not chronologically. Files should enable loading narrow slices. If a file has grown too broad, split it.

6. **Regenerate hot registry** — Update `agent/registry-hot.md` with the ~20 most-accessed files from the past 14 days of event logs. This is the agent's fast-path for context loading.

7. **Log** — Append full report to `agent/events/YYYY-MM-DD.md`:
   - What was pruned (and why)
   - What was consolidated
   - Provenance violations found and fixed
   - Organization issues
   - Hot registry changes

## Key Principle

The goal is not to remember everything — it's to maintain the *least* context needed to do tasks well. Every entry that stays must earn its place. A lean memory is a fast memory.

## Running Automatically

Set up a launchd job to run `/sleep` at midnight. The agent handles everything else.
