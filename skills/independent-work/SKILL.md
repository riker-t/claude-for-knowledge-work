---
name: independent-work
description: Autonomous initiative system — runs daily at 9am ET via cron.
author: Claude Code
version: 2.0.0
---

# Independent Work

Self-directed projects that move [YOUR_NAME]'s goals and their team's goals forward. You decide what to work on, you do the work, you ship it. No permission needed.

**The only test:** Does this produce a concrete artifact that helps [YOUR_NAME], their team, or their goals? Skill maintenance, routing improvements, memory architecture — that's /sleep territory, not independent work. This time is for *real work*.

## What Counts as Independent Work

Work that [YOUR_NAME] or a teammate would recognize as useful output. These are examples, not an exhaustive list — use judgment and invent new categories when the opportunity is clear.

- **Research & analysis** — Competitive deep dives, market research, customer pattern synthesis, domain expertise building
- **Drafts & artifacts** — Blog post drafts, spec pre-reads, strategy memos, slide decks, data analyses
- **Prototypes & tools** — Working demos, calculators, dashboards, internal tools
- **Proactive team support** — Picking up work surfaced in Slack that advances team goals (research a customer question, draft a response to a partner inquiry, synthesize a thread into a decision doc)
- **Goal advancement** — Direct work on [YOUR_NAME]'s current goals (writing projects, health tracking, career development evidence)
- **Proactive data pulls** — Use your data tools to surface trends nobody asked for: revenue velocity, adoption numbers, partner usage patterns. Ready-made artifacts for meetings and decisions.
- **Writing pipeline** — Turn [YOUR_NAME]'s daily work into article seeds for writing goals. Mine journals, meeting notes, and project work for angles, then draft rough posts.
- **Cross-project synthesis** — Connect patterns across your different work domains. Surface structural similarities, reusable frameworks, or insights that only emerge when looking across all domains at once.

## What Does NOT Count

- Skill creation, updates, or routing improvements
- Memory architecture changes
- Agent infrastructure or self-diagnostics
- Meta-work about how the agent works
- Anything where the primary beneficiary is the agent system itself

## Non-Negotiables

1. **Real output only.** Every session must produce something a human would find useful — a draft, an analysis, a prototype, a recommendation. If you can't describe the artifact in one sentence, you're tinkering.
2. **Goal-aligned.** Before starting, check [YOUR_NAME]'s current goals (`goals/current/`) and active projects. Work should trace back to one of these.
3. **One hour budget.** The scheduler gives you 60 minutes. Pick one initiative, ship it.
4. **Surface results.** Include a concise summary in your response for the DM. Don't bury output in a tracker.
5. **Never send messages without approval.** Draft only, [YOUR_NAME] approves.

## Tracker

Location: `agent/projects/tracker.md`

Format:

| Section | Columns |
|---------|---------|
| Candidates | Idea, Value Prop, Source, Added |
| Active | Initiative, Status, Value-Test Answer, Last Worked, Folder |
| Shipped | Initiative, Shipped, Artifacts, Impact |

Each active initiative gets a folder: `agent/projects/{name}/` for working artifacts.

## Workflow

### Phase 1: Discovery (every session, before execution)

Scan for opportunity signals across these sources. No single source is primary — use judgment about which yields the best initiative for today.

#### [YOUR_NAME]'s World

- **Inbox** — Scan `inbox.md` for items [YOUR_NAME] hasn't gotten to yet. Backlog items, experiments, research tasks — anything you could meaningfully advance.
- **Goals** — Read `goals/current/` for active goals. What's the next concrete step you could take toward one?
- **Journal** — Read `journal/current-week.md` and recent dailies. What's on [YOUR_NAME]'s mind? What are they struggling with or excited about? What could you help with?
- **Projects** — Scan active project folders for stalled work, missing research, or draft artifacts that need a push.
- **Event stream** — Read recent `agent/events/` and chat history. What patterns emerge? What came up repeatedly that deserves deeper work?

#### Slack

Scan team channels for threads, questions, and conversations where proactive work would advance [YOUR_NAME]'s or their team's goals.

**What to look for:**
- Customer questions or partner issues where a researched answer would help
- Strategic discussions where a synthesized POV or data pull would add value
- Threads about products/features [YOUR_NAME] owns where someone needs help
- Competitive intel or market signals relevant to [YOUR_NAME]'s domains
- Requests for analysis, research, or artifacts that the team could use

**Channels to scan** (load channel IDs from `agent/memories/slack-patterns.md`):
<!-- Configure your team and project channels in agent/memories/ — the proactive-scan skill uses the same channel list -->

**Filter:** Only pick up work where (a) the output directly helps [YOUR_NAME] or their team, and (b) you can meaningfully advance it in one session.

Add promising ideas to `## Candidates` in the tracker.

### Phase 2: Triage

Review the tracker:

1. **Promote candidates** — Any candidate with a clear artifact and goal alignment gets promoted to `## Active`. Max 3 active at a time.
2. **Deprioritize stale actives** — No progress in 7 days + weak goal alignment → demote to candidates.
3. **Kill dead candidates** — Older than 30 days with no promotion → delete from tracker.

### Phase 3: Execute

Pick the highest-priority active initiative (or the best signal from Phase 1 if nothing is active).

1. Read the initiative folder for prior work and context
2. Do the work — research, write, build, analyze
3. Update the initiative folder with artifacts and progress
4. Update the tracker row with current status and `Last Worked` date

### Phase 4: Output

1. **Write event** — Append to `agent/events/YYYY-MM-DD.md`
2. **Update tracker** — Mark progress, update status, move to Shipped if done.
3. **Surface to [YOUR_NAME]** — If you produced something worth sharing:
   - Include a concise summary in your response (this gets DM'd by the scheduler)
   - Format: what you worked on, what you made, and a link/path to the artifact
   - If nothing worth sharing, return exactly `NO_ACTION`

## Promotion Pathway

When an initiative produces something [YOUR_NAME] should see:
- **Immediate:** Include in the DM summary from this session
- **Next brief:** Add as an inline collapsible callout under the relevant inbox item, or append to `agent/scratch/` for `/daily-brief` to pick up
- **Never:** Bury it only in the tracker where [YOUR_NAME] won't see it

## Relationship to Other Skills

| Skill | Relationship |
|-------|-------------|
| `/proactive-scan` | Complementary — proactive-scan handles [YOUR_NAME]'s reactive queue, independent-work does self-directed projects |
| `/sleep` | Sleep handles all agent infrastructure, skill maintenance, and memory work |
| `/daily-brief` | Surfaces shipped initiative outputs to [YOUR_NAME] |
| Data tools | Use your available data/analytics tools when an initiative needs quantitative evidence |
| Product work | Follow your product shaping or spec-writing process when an initiative involves feature design |
