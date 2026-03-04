---
name: daily-brief
description: "Morning routine — reads all signals, synthesizes judgment, presents priorities, does the work, captures calibration. Triggers: 'daily brief', 'morning brief', 'what matters today', 'plan my day', or /daily-brief."
author: Claude Code
version: 2.0.0
---

# Daily Brief

The agent reads the world, forms a judgment about what matters, and presents it to [YOUR_NAME] for calibration. Every correction makes the agent smarter.

## Pre-flight

Read `agent/memories/skills/daily-brief.md` before starting. If it doesn't exist, create it. Apply any `[corrected]` entries as hard constraints.

## Non-Negotiables

1. **Read the brain first.** Load goals, judgment rules, and preferences before gathering signals. The agent's accumulated judgment is the starting point.
2. **Evidence over vibes.** Every priority claim cites a specific signal. "I think X matters because [signal]."
3. **Own the mistakes.** Capture corrections to `agent/memories/judgment-rules.md` with reasoning, not just facts.
4. **Write the brief file.** Every run produces `agent/scratch/briefs/YYYY-MM-DD.md`.
5. **Do the work, don't flag the work.** Process transcripts, write meeting prep, draft Slack responses. The brief arrives with work product attached — not a to-do list.
6. **Bring POVs, not questions.** Every priority includes a recommended action. "What I Need From You" contains only genuine decisions where reasonable people could disagree.
7. **Reason about every inbox item.** `inbox.md` is [YOUR_NAME]'s pre-filtered capture. Form a judgment on each: what's blocking it, does any signal change its urgency, can it be enriched? Never reorder or remove items.

---

## Instructions

### Step 1: Load the Brain

If you have a daily notes tool, check for overnight notes. Never write to daily notes — they are [YOUR_NAME]'s personal space.

Read these files (skip gracefully if any don't exist yet):
1. `goals/current/` — active goal files
2. `inbox.md` — captured items + open loops
3. `agent/memories/knowledge-gaps.md` — known unknowns
4. `agent/memories/judgment-rules.md` — extracted rules from past calibrations
5. `agent/memories/preferences.md` — [YOUR_NAME]'s style and priority logic
6. Last brief: most recent file in `agent/scratch/briefs/`

Present nothing yet. This is context loading.

### Step 2: Gather Signals (Parallel Sub-Agents)

Launch parallel sub-agents. Each returns structured summaries — raw signals stay in sub-agent context.

#### 2a. Slack Signal Agent
Scan configured channels for: unreplied mentions (48h), unreplied DMs (72h), key channel activity (24h). For each signal: channel, sender, summary, signal type (direct_question / action_request / follow_up_ping / decision_needed / context_share / pattern), project connection. **For questions and action requests, draft a response in [YOUR_NAME]'s voice.** Cap at 20 signals.

#### 2b. Calendar + Meeting Prep Agent
Fetch today's events + next 2 business days. Also fetch yesterday's calendar — solo blocks that didn't happen become carryover signals. For meetings that need prep (external attendees, first-time meetings, leadership 1:1s), build a context brief from available signal sources (vault files, Slack threads, calendar history) and write to `agent/scratch/prep-YYYY-MM-DD-<meeting-slug>.md`. Cross-reference attendees against people files.

#### 2c. Vault Signal Agent
- **Inbox:** Read every item individually. Note what's blocking each, whether signals change urgency, connections to other sources. Preserve sub-items faithfully.
- **Inbox-done cross-reference:** Read current week's `inbox-done/` file. Flag completed items still in inbox.md for removal.
- **Transcripts:** Check for unprocessed meeting transcripts. If found, process each — extract key decisions, action items, and people context, then route to appropriate vault files and move to `processed/`.
- **Recent activity:** Scan recently modified files (48h) in `projects/`, `agent/scratch/`, `resources/`.
- **Artifact-to-meeting bridge:** Cross-reference modified files against today's calendar. Map artifacts to the meetings they serve. This is the #1 gap — connect in-progress work to meetings. Example: if a memo was drafted yesterday and a 1:1 is today, that memo IS the meeting's centerpiece.
- Check for tasks with due dates today if your system supports it.
- Note stale items (inbox items >5 days old).

#### 2d. Web + Competitive Signal Agent
Check for cached news at `agent/scratch/news/YYYY-MM-DD.json` first. Then run 4-6 targeted web searches across: your vertical competitors, adjacent competitors, AI/agentic ecosystem, and company news. Prioritize last 48h. **For every signal, include a "so what" and recommended action.** "[Competitor] acquired X" is noise. "[Competitor] acquired X, which means Y — recommend Z" is useful. Return: source, headline, summary, relevance to which project, recommended action, confidence level.

#### 2e. Project Management Signal Agent (skip if tools unavailable)
Check roadmap/issue tracker for: status changes, blockers, completed items, items waiting on [YOUR_NAME].

<!-- Add your own personal logistics agents here (weather, lunch, etc.) -->

### Step 3: Synthesize Judgment

Don't just list signals — form a view. Apply the JTBD framework to each signal:
- **Job 1 (Understand):** Does this help [YOUR_NAME] understand the landscape better?
- **Job 2 (Choose bets):** Does this change the evidence balance on a strategic decision?
- **Job 3 (Execute):** Does this unblock or accelerate current work?

**Build the ranked priority list:**
1. First pass: reason about every inbox item — time-sensitivity, signal changes, blockers.
2. Second pass: layer in discovered signals not already represented by inbox items.
3. Final ranking: time-sensitivity x leverage x goal-alignment.
4. For each: state the claim, cite evidence, explain reasoning. Flag uncertainty.

**Artifact-meeting integration:** Frame meetings around relevant artifacts. "1:1 — present the memo you drafted yesterday" not "1:1 — discuss partnership."

**Check against judgment rules** in `agent/memories/judgment-rules.md`. Note where rules fired.

### Step 4: Pre-Flight Verification

Before presenting, re-check every item against reality. This catches 40-50% of errors.

**For Slack items:** Check if [YOUR_NAME] already replied. Check if a 1:1 with the sender already happened (DM may be resolved). Verify the ask is actually for [YOUR_NAME].

**For calendar events:** Check RSVP status. Search DMs with organizer for cancellation. Don't surface declined events.

**For action items:** Search for evidence the action was already completed. Verify ownership.

Remove RESOLVED items. Update framing for items needing correction. Add uncertainty notes for FLAGGED items.

### Step 5: Present the Brief

Write to `agent/scratch/briefs/YYYY-MM-DD.md` AND present to [YOUR_NAME]:

```markdown
# Daily Brief — YYYY-MM-DD

## What Matters Most Today
1. **[Priority]** — [one-line summary]
   - Evidence: [specific signal(s)]
   - Why now: [time-sensitivity reasoning]
   - Recommended action: [what the agent thinks [YOUR_NAME] should do]
   - JTBD: Job [1/2/3] | Confidence: [high/medium/low]

(Aim for 3-7 items. Fewer is better than bloated.)

## What I've Done
- [Work product: prep briefs written (with links), transcripts processed, Slack drafts prepared]

## What I Need From You
- [ ] [Decision] — [recommended answer + reasoning] — [why it needs [YOUR_NAME]]

## What Changed in Our World Model
- [New pattern or shift] — [evidence]

## Signals Processed
| Source | Count | Notable |
|--------|-------|---------|
| Slack | X | [key item] |
| Calendar | X events | [key meeting] |
| Vault | X inbox items, Y transcripts | [stale items] |
| Web | X relevant | [key finding] |

## Proposals
- [Proposed improvements to agent process, if any]
```

### Step 6: Calibrate

Ask: **"How's the read?"** — Mostly right / Some things off / Significantly wrong / Skip

For each correction, probe for the WHY. Capture to `agent/memories/judgment-rules.md`:
- What [YOUR_NAME] changed, agent's original read, [YOUR_NAME]'s reasoning, rule extracted (if generalizable)

**Track accuracy** in `agent/memories/self-assessment.md`:
```
| Date | Priorities presented | Agreed | Reranked | Hit rate |
```

### Step 7: Maintain Inbox

Run inbox maintenance: move completed (`[x]`) items to inbox-done, cross-reference completions. Enrich existing items with sub-bullets from signal gathering (research, Slack links, draft messages). Preserve [YOUR_NAME]'s ordering.

### Step 8: Update Agent State + Event Log

Update `agent/memories/knowledge-gaps.md` (add new gaps, close resolved), `inbox.md` (append to Unsorted only, add sub-bullets for status), and project observation files if signals affected any project.

Append to `agent/events/YYYY-MM-DD.md`:
```
## daily-brief — HH:MM
- **Actions:** {signals gathered, meetings prepped, transcripts processed}
- **Outcomes:** {priorities presented, calibration corrections, accuracy rate}
- **Files accessed:** {list of files read/written}
```

---

## Bootstrapping

First run: memory files will be mostly empty — that's fine. `knowledge-gaps.md` gets seeded from signals; `judgment-rules.md` stays empty until first calibration. The brief will be rough. Each calibration adds rules; after ~5 runs, briefs should be mostly right and calibration shifts from "you're wrong" to "here's a nuance."

## Guardrails

- Never send Slack messages, emails, or any external communication without explicit approval
- Never modify project specs or planning docs without [YOUR_NAME]'s approval
- If a sub-agent fails, note the gap in the brief — don't silently skip
- Cap total sub-agent time at 5 minutes. If sources are slow, present what you have.
- Don't try to be comprehensive — be sharp. 5 well-reasoned priorities beat 15 surface-level ones.
