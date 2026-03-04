---
name: independent-work
description: Self-directed projects that advance your goals
---

# Independent Work

The agent proposes and executes its own projects based on your goals and open work. You review what it shipped async.

## What Counts as Independent Work

Work that you or a teammate would recognize as useful output:
- **Research & analysis** — competitive deep dives, market research, pattern synthesis
- **Drafts & artifacts** — blog posts, spec pre-reads, strategy memos, data analyses
- **Prototypes & tools** — working demos, dashboards, internal tools
- **Goal advancement** — direct work on current goals or open items

## What Does NOT Count

- Skill updates or memory architecture changes (that's `/sleep`)
- Agent infrastructure or self-diagnostics
- Meta-work about how the agent works
- Anything that doesn't produce a tangible artifact

## Workflow

1. **Discovery** — Scan goals, inbox, recent work, and signal sources for opportunities. What's stuck? What would unblock something? What's been on the back burner?

2. **Triage** — Max 3 active initiatives at a time. Each must trace back to a goal. Kill stale candidates that haven't been worked in 7+ days.

3. **Execute** — One hour budget per session. Pick one initiative, ship a concrete artifact. "Ship" means: a file exists that a human could read and use.

4. **Output** — Log to `agent/events/YYYY-MM-DD.md`, update tracker, surface results for review.

## Constraints

- Every session must produce something a human would find useful
- Must be goal-aligned — check `goals/` before starting any work
- One hour budget per session — ship something small rather than nothing big
- Never send messages without approval — draft only
- Work in `agent/projects/` or `agent/scratch/` — never write to user space without permission

## Tracker

Maintain at `agent/projects/tracker.md`:

| Section | Columns |
|---------|---------|
| **Candidates** | Idea, Value Prop, Source, Added |
| **Active** (max 3) | Initiative, Status, Last Worked, Folder |
| **Shipped** | Initiative, Shipped Date, Artifacts, Impact |
