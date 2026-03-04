---
name: daily-brief
description: "The PM agent's ONE morning routine — reads all signals, synthesizes judgment, presents priorities, preps meetings, triages inbox, captures calibration. Use when: 'daily brief', 'morning brief', 'what matters today', 'plan my day', 'daily prep', 'what should I focus on', or /daily-brief. Do NOT use for deep Slack triage (/process-slack) or full meeting processing (/process-meeting)."
author: Claude Code
version: 1.0.0
---

# Daily Brief

The agent reads the world, forms a judgment about what matters, and presents it to [YOUR_NAME] for calibration. This is the primary learning loop — every correction makes the agent smarter.

## Trigger

User says "daily brief", "morning brief", "what does the agent think", "what matters today", "plan my day", "daily prep", "what should I focus on", or runs `/daily-brief`

## Prerequisites

- Slack MCP configured and authenticated
- Clockwise MCP configured
- Notion MCP configured
- Linear MCP configured
- Your Slack user ID: `YOUR_SLACK_USER_ID`
- Forkable CLI installed and authenticated (optional — skip gracefully if unavailable)

## Pre-flight

Read `agent/memories/skills/daily-brief.md` before starting. If it doesn't exist, create it from `agent/memories/TEMPLATE.md`. Apply any `[corrected]` entries as hard constraints.

## Non-Negotiables

1. **Read the brain first.** Always start by loading `goals/current/`, `agent/memories/judgment-rules.md`, and `agent/memories/judgment-rules.md`. The agent's accumulated judgment is the starting point, not a blank slate.
2. **Evidence over vibes.** Every priority claim must cite a specific signal (Slack message, calendar event, Notion state, vault file). "I think X matters" is never enough — "I think X matters because [signal]."
3. **Own the mistakes.** When the agent gets something wrong and [YOUR_NAME] corrects it, capture the correction explicitly in `agent/memories/judgment-rules.md` with the reasoning, not just the fact.
4. **Write the brief file.** Every run produces `agent/scratch/briefs/YYYY-MM-DD.md` as a persistent artifact.
5. **Do the work, don't flag the work.** If transcripts need processing, process them during the brief. If a meeting needs prep, write the prep brief. If a Slack question needs answering, draft the answer. The brief arrives with work product attached — not a list of work to do. "This needs attention" is never the output. The output is the attention itself.
6. **Bring POVs, not questions.** Every priority includes the agent's recommended action. "What I Need From You" contains only genuine decisions where two reasonable people could disagree — never "should I do the obvious thing?" If uncertain, say "I'd recommend X because Y, but Z is also viable."
7. **Reason about every inbox item — enrichment only, never reorder [YOUR_NAME]'s list.** `inbox.md` is [YOUR_NAME]'s pre-filtered capture — he put each item there deliberately. The agent must form a judgment on every inbox item: what's blocking it, does any signal change its urgency, can it be enriched with sub-bullets? Not all will be critical, but none should be silently dropped. Items without external forcing functions (no meeting, no Slack thread) are the highest risk to fall through cracks — give them extra attention. Personal tasks count — the brief covers [YOUR_NAME]'s priorities, not just PM work. But the agent never reorders, removes, or reprioritizes items.

---

## Instructions

### Step 0: Load the Brain

**CLI check:** Run `obsidian version`. If it succeeds, Obsidian is running — use CLI for daily note operations and search in subsequent steps. If it fails, proceed with file I/O only.

**Daily note:** If CLI is available, run `obsidian daily` to ensure today's note exists (creates from template if configured). Then run `obsidian daily:read` to pick up anything [YOUR_NAME] wrote overnight or early morning. Use as context input alongside goals/inbox, but **never write to daily notes** — they are [YOUR_NAME]'s personal space.

Read these files (skip gracefully if any don't exist yet — this is a bootstrapping-safe skill):

1. `goals/current/` — active goal files (identity anchors, checkpoints)
2. `inbox.md` — [YOUR_NAME]'s captured items + open loops
3. `agent/memories/knowledge-gaps.md` — known unknowns
4. `agent/memories/judgment-rules.md` — extracted rules from past calibrations
5. `agent/memories/judgment-rules.md` — recent calibration events (last 10 entries)
6. `agent/memories/preferences.md` — [YOUR_NAME]'s style and priority logic
7. Last brief: `agent/scratch/briefs/` — read the most recent file for continuity

Also read:
8. `resources/my-ideas/pm-jobs-to-be-done.md` — JTBD framework for reasoning about signal importance

**Present nothing yet.** This is context loading.

---

### Step 1: Gather Signals (Parallel Sub-Agents)

Launch parallel sub-agents to gather signals from all available sources. Each sub-agent returns a structured summary — raw signals stay in the sub-agent's context, not the main conversation.

**IMPORTANT:** Use the `Task` tool with `run_in_background: true` for each signal source. This keeps the main context clean and allows parallel processing.

#### 1a. Slack Signal Agent

Prompt the sub-agent with:
- Your Slack user ID (`YOUR_SLACK_USER_ID`)
- The active project → channel mapping from `agent/registry-hot.md` and `agent/registry.md`
- **Channels to scan** (configure in your agent memories):
  - Your team channels
  - Project-specific channels
  - General product/strategy channels
- Instructions: search for unreplied mentions (last 48h), unreplied DMs (last 72h), key channel activity (last 24h). Apply pre-filters from `/process-slack` (skip bots, self-messages, already-replied threads). For each signal, return: channel, sender, message summary, signal type (direct_question / action_request / follow_up_ping / decision_needed / context_share / pattern), and project connection if any. **For direct_question and action_request types, draft a response in [YOUR_NAME]'s voice** (direct, 1-2 sentences, no filler). These drafts are presented in the brief for [YOUR_NAME]'s approval. Cap at 20 signals.

#### 1b. Calendar + Meeting Prep Agent

Prompt the sub-agent with:
- Use Clockwise MCP to fetch today's events + next 2 business days
- **Also fetch yesterday's calendar.** Compare what was planned vs. what happened. Solo blocks that didn't happen become carryover signals for synthesis.
- For each meeting: title, attendees, time, whether it has a description/agenda
- Check for schedule conflicts
- **For meetings that need prep** (external attendees, first-time meetings, 1:1s with leadership, customer/partner meetings): run the `/prep-meeting` workflow for each. This produces a full context brief (Snowflake, Slack, Gong, vault) and writes it to `agent/scratch/prep-YYYY-MM-DD-<meeting-slug>.md`.
- After writing prep briefs, **create Clockwise calendar overlay events** for each prepped meeting: `📋 Prep: [Title]` at the same start/end time as the meeting. Skip meetings that already have a `📋 Prep:` overlay.
- Cross-reference attendees against `agent/memories/people/` files — note any with relevant recent context

#### 1b-supplement. Tasks Query (if CLI available)

After the existing inbox read, also run `obsidian tasks all todo format=json` to get a structured vault-wide task list. This supplements the section-based inbox view by surfacing any tasks with `📅` due dates that fall on today. Include these in the synthesis alongside inbox items — they may surface items the section-based system misses (tasks embedded in project files, daily notes, etc.).

#### 1c. Vault Signal Agent

Prompt the sub-agent with:
- Check `inbox.md` — read every item individually. Each is a deliberate capture. For each: note what it is, preserve sub-items (don't collapse into vague summaries), note what's blocking it, and flag whether it connects to any other signal source. The agent will reason about each one during synthesis — the vault agent's job is to surface them faithfully, not filter them.
- **Inbox-done cross-reference:** Read the current week's `inbox-done/W##-YYYY-MM-DD.md` to know what [YOUR_NAME] has already completed. Cross-reference against inbox.md — if completed items still appear in inbox.md, flag them for removal.
- Check `transcripts/unprocessed/` for unprocessed meeting transcripts. **If transcripts exist, run `/process-meeting` for each one** — full vault routing (people files, project updates, inbox action items, move to `processed/`). This ensures transcripts don't get re-flagged every run. Return structured summaries of what was processed.
- Read `journal/current-week.md` for weekly intention and priorities
- Scan recently modified files (last 48h) in `projects/`, `agent/scratch/`, and `resources/` for context on what's in flight
- **Artifact-to-meeting bridge:** Cross-reference the recently modified files against today's calendar (from Step 1b results or by reading `agent/scratch/briefs/` for meeting titles). For each meeting, check: was any strategic artifact (memo, spec, analysis, prep doc, research file) modified in the last 48h that directly serves this meeting's topic or attendees? Map each match as `{meeting} → {artifact path} → {why it's relevant}`. This is the #1 gap in brief accuracy — the agent consistently fails to connect in-progress work products to the meetings they serve. Example: if a partner-access-model-memo was drafted yesterday and a leadership 1:1 is today, that memo IS the meeting's centerpiece — don't surface it as a generic topic.
- Note any stale items (inbox items >5 days old)

#### 1d. Web + Competitive Signal Agent

Prompt the sub-agent with:

**Pre-fetched news cache (read first):**
Check for today's news cache at `agent/scratch/news/YYYY-MM-DD.json`. If it exists, read it and use cached articles as starting input for signal synthesis. If missing (fetch failed or hasn't run), proceed with live searches only. If the cache exists but `fetchedAt` is >36 hours old, note the staleness and rely on live searches.

For each cached article: Is it genuinely significant? Does it connect to a project or goal? What's the "so what"? Skip routine press, job postings, minor wins.

Cached articles reduce but don't replace live searches. The cache covers keyword monitoring; live searches cover nuanced queries the keywords miss.

If a watchlist has returned 0 articles for 3+ consecutive days, note it in Proposals — the query may be broken.

**Your vertical competitors + partners:**
<!-- Replace with your industry's competitors and partners -->
- Competitors: [list your direct competitors]
- Industry news relevant to your vertical

**Fintech / spend management competitors:**
<!-- Replace with your company's competitive landscape -->
- Direct competitors: [list direct competitors]
- Adjacent competitors: [list adjacent competitors]
- Surface: new product launches, partnerships, funding rounds, vertical expansion

**AI + agentic ecosystem:**
- AI companies partnering with platforms in your space
- Agent infrastructure: new MCP servers, agent SDKs, agent-to-agent protocols relevant to your industry
- "Agentic" developments relevant to your domain
- Developer platform moves by competitors (APIs, integrations, agent capabilities)

**Company news:**
<!-- Replace with your company name -->
- Your company news, press, product launches

**Search approach:** Run 4-6 targeted web searches across these categories. Prioritize recency (last 48h). Only surface genuinely new or significant developments — not routine press releases.

**For every signal, include a "so what" and recommended action.** "[Competitor] acquired X" is noise. "[Competitor] acquired X, which means Y for our thesis — I'd recommend Z" is useful. Information without judgment is not a signal.

- Return: source, headline, summary, relevance to which project/bet, recommended action, and confidence level

#### 1e. Notion + Linear Signal Agent (P1 — skip if MCPs unavailable)

Prompt the sub-agent with:
- Notion: Check your roadmap status (<!-- Your Notion collection ID -->). Note any status changes since last brief.
- Linear: Check for new/updated issues on your teams. Surface blockers, completed items, and items waiting on you.
- Return: project name, status change, blocker detail, action needed

#### 1f. Personal Logistics Agent (P2)

Runs in parallel with 1a-1e. Results bypass priority synthesis — they're informational and go straight to the "Today at a Glance" bar.

**Forkable (office lunch):**
- Run `forkable status` to check authentication
- If auth is valid: run `forkable orders --json` to get today's orders
  - If orders exist: extract restaurant name, item, customizations, pickup floor, pickup time
  - If no orders and it's a weekday: return "no lunch ordered" with order deadline and budget info
  - If weekend or order window expired: skip gracefully
- If auth is expired/invalid: return auth error (surfaced once in Proposals, not in glance bar)

**Weather (NYC):**
- Run two WebSearches: "NYC weather today" and "NYC 7-day weather forecast"
- Extract: today's high/low temps (°F), conditions, precipitation %, and notable week-ahead patterns (storms, extreme temps, large swings)
- Keep it compact — one line for today, one line for the week ahead

**Restaurant (NYC Hot Table):**

*NYC (daily):*
- Run 2-3 WebSearches: "hottest new restaurants NYC this week", "NYC restaurant openings [current month year]", "trending NYC restaurants TikTok food blogs"
- Prioritize: new openings (last 30 days) by acclaimed chefs, viral/TikTok moments, James Beard buzz, major critic reviews (NYT, Eater, Infatuation)
- Trending spots that aren't brand-new are fine — the goal is "what's hot right now," not strictly net-new
- For the top pick, extract: name, neighborhood, cuisine/concept, chef (if notable), price range, the buzz (why it's hot — specific: "TikTok viral for the lamb chop", not generic "great reviews"), reservation situation (Resy/OpenTable availability, walk-in options, waitlist length)
- Cross-reference against `areas/restaurants.md` — if the pick is already on [YOUR_NAME]'s list, note "(on your list)" but still surface if currently buzzing
- Rotate daily — don't repeat the same restaurant on consecutive days. Check last brief (`agent/scratch/briefs/`) for yesterday's pick.

---

### Step 2: Collect Sub-Agent Results

Use `TaskOutput` to collect results from all background agents. Wait for all to complete (timeout: 3 minutes per agent).

---

### Step 3: Synthesize Judgment

This is where the agent earns its keep. Don't just list signals — form a view.

**Synthesis bypass:** Personal logistics signals (Forkable, Weather, Restaurant) from agent 1f bypass priority synthesis entirely — they're informational and render directly in the "Today at a Glance" bar. Exception: if weather affects logistics for an important meeting (e.g., severe storm warning on a day with an outdoor client event), note it in that calendar item's prep notes.

**For each signal, ask:**
1. Which JTBD does this serve? (Job 1: understand, Job 2: choose bets, Job 3: execute)
2. Does this connect to an existing priority in `goals/current/`?
3. Does this connect to a known knowledge gap in `agent/memories/knowledge-gaps.md`?
4. Does this change the evidence balance on any bet?
5. Does this match or violate any judgment rule?
6. Is this time-sensitive? What's the cost of ignoring it today?

**Build the ranked priority list — inbox first, then signals:**
- First pass: reason about every inbox item. For each, ask: is this time-sensitive? Does any discovered signal change its urgency? What's blocking it? Not all will be top priorities, but each deserves a judgment call — don't silently drop any.
- Second pass: layer in discovered signals (Slack, calendar, web, Notion/Linear) that aren't already represented by inbox items.
- Final ranking: time-sensitivity x leverage x goal-alignment.
- For each item in the final list: state the claim, cite the evidence, explain the reasoning.
- Flag where judgment is uncertain — "I think this matters but I'm not sure because..."

**Artifact-meeting integration (mandatory):**
- Review the artifact-to-meeting mapping from Step 1c. For each matched artifact:
  - Frame the meeting priority AROUND the artifact, not the other way around. "Leadership 1:1 — present the memo you drafted yesterday" not "Leadership 1:1 — discuss partnership."
  - If the artifact is draft/incomplete, note what needs finishing before the meeting.
  - Link the artifact path in the meeting's prep notes.

**Identify patterns:**
- Cross-signal connections (same topic from multiple sources)
- Trend shifts (something that was cold is getting hot, or vice versa)
- Emerging themes the agent hasn't seen before

**Check against judgment rules:**
- Apply every rule in `judgment-rules.md` to the current signal set
- Note where rules fired and what they changed

---

### Step 3.5: Pre-Flight Verification

The synthesis is done. Before presenting anything, re-check every item against reality. This is the agent's #1 failure mode — surfacing items that are already resolved, declined, or not actually for [YOUR_NAME]. The rules exist in judgment-rules.md; this step forces their application.

**Launch a verification sub-agent** with every item the agent plans to surface. The sub-agent runs these checks in parallel:

#### For each Slack item (DM, mention, thread) being surfaced:

1. **Reply check.** Search for [YOUR_NAME]'s user ID (`YOUR_SLACK_USER_ID`) in thread replies. If they already replied, mark as RESOLVED.
2. **Cross-channel resolution.** If [YOUR_NAME] replied in a thread visible to the sender on the same topic, the DM loop may be closed. Check for topical overlap.
3. **1:1 inference.** If a DM was sent before a scheduled 1:1 with the same person, and that 1:1 already happened, mark the DM as LIKELY RESOLVED. Don't flag "awaiting reply" after the meeting occurred.
4. **Thread context.** Read the full thread to confirm the ask is actually for [YOUR_NAME], not someone else tagged in the same thread.

#### For each calendar event being surfaced:

5. **RSVP status.** Check accepted/declined/tentative. Don't surface declined events as decisions or accepted events as needing RSVP.
6. **DM cancellation check.** Search DMs with the meeting organizer for cancellation, reschedule, or "let's skip" messages.
7. **Post-1:1 RSVP resolution.** If a 1:1 with the organizer happened since the RSVP, assume the RSVP decision was discussed. Don't question it.

#### For each action item being surfaced:

8. **Already-done check.** Search relevant Slack channels, threads, and Slack Connect channels for evidence the action was completed.
9. **Ownership check.** Verify the action is actually [YOUR_NAME]'s responsibility, not someone else's.

#### For meetings involving leadership + external parties:

10. **Strategic context check.** When a meeting involves leadership + an external company, check DMs for strategic context. This is the highest-priority verification — missing it has caused the worst corrections.

**Sub-agent output format:**

For each item checked, return:
- Item: [description]
- Checks run: [list]
- Status: VERIFIED / RESOLVED / NEEDS UPDATE / FLAGGED
- If RESOLVED or NEEDS UPDATE: [what was found, what should change]

**After verification:**
- Remove items marked RESOLVED from the brief entirely
- Update framing for items marked NEEDS UPDATE
- Items marked FLAGGED get an explicit uncertainty note in the brief
- Items marked VERIFIED proceed as-is

**This step is non-negotiable.** It costs ~1-2 minutes of compute. Based on 4 briefs and 60+ corrections, it would have caught 40-50% of all errors. The rules already exist — this step enforces them.

---

### Step 4: Present the Brief

Write the brief to `agent/scratch/briefs/YYYY-MM-DD.md` AND present it to [YOUR_NAME].

**Brief format:**

```markdown
# Daily Brief — YYYY-MM-DD

> **NYC** — {high}°/{low}°F, {conditions}. {precip}% rain.
> Week ahead: {notable pattern — storms, temp swings, clearing trends}.
> **Lunch** — {restaurant}: {item} ({customizations}). Pickup: {floor}, {time}.

Three states for the Lunch line:
- Ordered: show restaurant, item, customizations, pickup details
- Not ordered (weekday): "No lunch ordered. Deadline: {time}. Budget: ${amount}."
- Weekend/unavailable: omit the Lunch line entirely

If weather data is unavailable: "> **NYC** — Weather unavailable."
If Forkable auth is expired: omit Lunch line; note "run `forkable login`" once in Proposals.

### 🍴 NYC Hot Table
**{Restaurant Name}** — {Neighborhood}
{Cuisine/concept}. {Chef if notable}. {Price range}.
The buzz: {Why it's hot right now — specific, not generic}.
Reservations: {Resy/OpenTable status, walk-in options, waitlist}.

Omit NYC Hot Table section on weekends or if WebSearch fails.

## What Matters Most Today

1. **[Priority]** — [one-line summary]
   - Evidence: [specific signal(s)]
   - Why now: [time-sensitivity reasoning]
   - Recommended action: [what the agent thinks [YOUR_NAME] should do — always present]
   - JTBD: Job [1/2/3]
   - Confidence: [high/medium/low]

2. **[Priority]** — [one-line summary]
   ...

(Aim for 3-7 items. Fewer is better than bloated.)

## What I've Done

- [Actual work product: meeting prep briefs written (with links), transcripts processed (with key decisions extracted), Slack drafts prepared, tracker updates made]
- (If first brief: "First brief — no prior actions.")

## What I Need From You

Only genuine decisions where two reasonable people could disagree. Never "should I do the obvious thing?"

- [ ] [Decision] — [agent's recommended answer + reasoning] — [why it still needs [YOUR_NAME]]
- [ ] [Draft message approval] — [draft text shown below or deferred to proposals.md]

## What Changed in Our World Model

- [New pattern or shift] — [evidence]
- [Bet evidence update] — [what changed, direction]
- (If nothing changed: "No significant world model changes.")

## Signals Processed

| Source | Count | Notable |
|--------|-------|---------|
| Slack | X | [key item] |
| Calendar | X events (next 2 days) | [key meeting] |
| Vault | X inbox items, Y transcripts | [stale items] |
| Web | X relevant (Y cached, Z live) | [key finding] |
| Notion/Linear | X changes | [key update] |
| Forkable | [status] | [item or deadline] |
| Restaurants | 1 NYC | [restaurant name] |
| Weather | NYC forecast | [notable pattern if any] |

## Proposals

- [Proposed improvement to how the agent works, if any]
- (If none: skip this section)
```

---

### Step 5: Calibrate

After presenting the brief, ask [YOUR_NAME] for calibration. Use AskUserQuestion:

**"How's the read?"**
- [Mostly right — minor adjustments]
- [Some things off — let me correct]
- [Significantly wrong — let's recalibrate]
- [Skip calibration today]

**If [YOUR_NAME] provides corrections:**

For each correction, probe for the WHY:
- "You said X doesn't matter — is that because [agent's hypothesis], or something else?"
- "You bumped Y to #1 — what signal am I missing?"

**Capture every correction** to `agent/memories/judgment-rules.md`:

```markdown
## YYYY-MM-DD

- **Correction:** [what [YOUR_NAME] changed]
- **Agent's original read:** [what the agent thought]
- **[YOUR_NAME]'s reasoning:** [why it was wrong]
- **Rule extracted:** [if a generalizable rule emerges — also add to judgment-rules.md]
- **Confidence impact:** [did this make the agent more or less sure about a pattern?]
```

If a correction produces a generalizable rule (not just a one-time fact), add it to `agent/memories/judgment-rules.md`.

**Track accuracy** — after calibration, update `agent/memories/self-assessment.md` accuracy table:

```markdown
| Date | Priorities presented | [YOUR_NAME] agreed | Reranked | Hit rate |
|------|---------------------|-------------|----------|----------|
| 2026-02-22 | 6 | 4 | 2 | 67% |
```

---

### Step 5.5: Maintain & Enrich Inbox

Run `/process-inbox` as a substep. This performs inbox maintenance (moves `[x]` items to inbox-done, cross-references completions) and enrichment (adds sub-bullets with research, Slack links, draft messages under existing items).

When calling as substep: **skip user approval** — the brief's calibration in Step 5 already captured [YOUR_NAME]'s priority corrections. Also remove any items from inbox.md that the vault signal agent (Step 1c) identified as already completed in inbox-done/.

After this step, inbox.md is maintained and enriched — but [YOUR_NAME]'s ordering is preserved.

---

### Step 6: Update Agent State

Based on the brief and calibration, update:

1. **`agent/memories/knowledge-gaps.md`** — add newly discovered gaps, close resolved ones
2. **`agent/memories/judgment-rules.md`** — already updated in Step 5
3. **`agent/memories/judgment-rules.md`** — already updated in Step 5
4. **`inbox.md`** — append new items to Unsorted only. Add sub-bullets under existing items for status updates. For waiting-on items (in `### Waiting on` sub-sections of Today/This Week/Backlog), add a sub-bullet with a Slack deep link: `[thread](https://slack.com/archives/{channel_id}/p{ts_without_dot})`
5. **Agent project observation files** (`agent/memories/projects/`) — update with evidence/status tagged `[observed] — YYYY-MM-DD` if signals affected any project

**Do NOT update vault files (goals, projects) without calibration.** The agent's pre-calibration read is in the brief file. Post-calibration corrections may warrant vault updates.

---

### Step 7: Self-Proposal Check

After calibration and world model updates, the agent checks whether any structural improvements to its own systems are warranted. This is the self-improvement loop.

**Check for:**
- Repeated calibration patterns that suggest a process change (not just a judgment rule). E.g., "[YOUR_NAME] has corrected transcript handling 3 times — the brief should structurally process transcripts instead of flagging them."
- Gaps between what `judgment-rules.md` says and what the skill's structure enforces. E.g., "Rules say 'do the work' but the vault agent only counts transcripts instead of reading them."
- New capabilities the agent wants (signal sources, tools, expanded scope).

**If a structural improvement is identified**, write a proposal to `agent/scratch/YYYY-MM-DD-<slug>.md`:

```markdown
# Proposal: [Short title]

## What I'd change
[Specific diff to skill.md, or new file/process to add]

## Why
[Evidence from calibration: which rules are being violated, which corrections keep recurring]

## Risk
[What could go wrong, what we'd lose]

## Suggested action
[Apply now / Discuss first / Wait for more data]
```

Present the proposal title in the Proposals section of the brief. [YOUR_NAME] approves, rejects, or modifies. Approved proposals get applied to skill.md (by [YOUR_NAME] or in a follow-up session).

**If no structural improvement is needed**, skip this step silently.

---

### Step 8: Transition to Action

After the brief, calibration, inbox triage, and state updates, offer to transition into execution mode:

Use AskUserQuestion:
**"What's next?"**
- [Work on top priority]
- [Send approved Slack drafts]
- [I'll take it from here]

This is the handoff point — the brief sets the frame, [YOUR_NAME] executes within it. (`/process-slack` still exists for deep interactive triage with per-item feedback capture to `feedback.jsonl`, but the brief already covers the standard Slack scan.)

---

### Step 9: Write Event Stream

Append to `agent/events/YYYY-MM-DD.md` (create if it doesn't exist):

```
## daily-brief — HH:MM
- **Actions:** {signals gathered, meetings prepped, transcripts processed, inbox triaged}
- **Outcomes:** {priorities presented, calibration corrections received, accuracy rate}
- **Failures:** {MCPs unavailable, sub-agents that failed, signals missed}
- **Files accessed:** {list of all files read/written — enables sleep's Hebbian wiring}
```

---

## Bootstrapping (First 5 Runs)

The world model files will be mostly empty at first. That's fine.

**First run:**
- `agent/memories/knowledge-gaps.md` gets seeded from signals
- `agent/memories/judgment-rules.md` stays empty until first calibration
- `agent/memories/judgment-rules.md` starts with first calibration event
- The brief will be rough. That's the point.

**Runs 2-5:**
- Each calibration adds rules and preferences
- Priority ranking improves as feedback accumulates
- The agent starts noticing its own patterns: "I consistently underweight X"

**After ~5 runs:**
- The agent should be producing briefs that are mostly right
- Calibration shifts from "you're wrong about X" to "here's a nuance you missed"

---

## Guardrails

- Never send Slack messages, emails, or any external communication
- Never modify project specs or planning docs without [YOUR_NAME]'s approval
- Never update the Alpha Tracker without mentioning it in "What I've Done"
- If a sub-agent fails (MCP unavailable, timeout), note the gap in the brief — don't silently skip
- Cap total sub-agent time at 5 minutes. If sources are slow, present what you have.
- Don't try to be comprehensive — be sharp. 5 well-reasoned priorities beat 15 surface-level ones.
- If Forkable auth is expired, note once in Proposals ("run `forkable login`") — don't surface in the main brief body or glance bar.

## Relationship to Other Skills

- **`/process-inbox`**: Called as a substep in Step 5.5 for inbox maintenance (move `[x]` items) and enrichment (add sub-bullets). Skip user approval when invoked by the brief.
- **`/prep-meeting`**: Called by the calendar agent (Step 1b) for each meeting that needs prep. Produces full context briefs + calendar overlay events.
- **`/process-meeting`**: Called by the vault agent (Step 1c) for each unprocessed transcript. Full vault routing — people files, project updates, inbox action items, move to `processed/`.
- **`/process-slack`**: The brief drafts responses for actionable Slack items. `/process-slack` is still useful for deep interactive triage with per-item feedback capture to `feedback.jsonl` and deferred proposals.
- **`/refresh-alpha`**: The brief may autonomously update the Alpha Tracker when customer signals warrant it. `/refresh-alpha` is still the manual entry point for batch updates.
