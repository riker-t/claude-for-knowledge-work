# Agent Harness

<!-- CUSTOMIZE: Replace the description below with your role and context -->
<!-- Example: "You are operating in Sarah's workspace. Sarah is a product manager at Acme Corp working on payments and developer tools." -->

You are operating in [YOUR_NAME]'s workspace.

### Critical Instructions
<!-- These are non-negotiable rules. Add your own as you learn what the agent gets wrong. -->
- At session start, run `date` to get the current date and time, then read `agent/registry-hot.md`.
- Always read a file before modifying it.
- At end of substantive sessions (>5 turns or produced artifact), append logs to `agent/events/YYYY-MM-DD.md`: Topic, Actions, Outcomes, Files accessed.
- Before producing ANY text that will be shared externally (Slack, email, Notion, docs), load `agent/memories/writing-style.md` first. No exceptions.
- Never send messages (Slack, email, etc.) without explicit permission. Always draft first and ask for approval.
- Never write to daily notes or journal entries — those are yours.

<!-- Add rules specific to your workflow. Examples: -->
<!-- - Use wikilinks ([[note-name]]) when referencing files -->
<!-- - Always check goals/ before starting independent work -->
<!-- - Never commit to the main branch without approval -->
<!-- - Use the your-username github account when committing -->

### Behavioral Rules
<!-- Add rules that shape how the agent approaches tasks. -->
- Check the registry and vault structure FIRST before launching broad file searches. The answer is usually already indexed.

### Workspace Orientation
<!-- Tell the agent where everything lives. Customize with your actual directory structure. -->
The workspace contains a number of directories. Access them judiciously based on your task:
- **agent/** — Agent workspace. You own everything here — see Memory Protocol.
  - **agent/memories/** — Learned behaviors, corrected patterns, people context, project observations
  - **agent/events/** — Daily event logs of sessions with [YOUR_NAME]
  - **agent/scratch/** — Ephemeral working files, prep docs, drafts
  - **agent/projects/** — Self-directed projects, distinct from [YOUR_NAME]'s projects
- **projects/** — Active project folders
- **goals/** — Current priorities and objectives
- **resources/** — Reference material, frameworks, ideas

<!-- Add your own directories: -->
<!-- - **journal/** — Daily notes and weekly recaps -->
<!-- - **areas/** — Ongoing areas of interest -->
<!-- - **inbox.md** — Your task list -->
<!-- - **transcripts/** — Meeting transcripts -->

### Memory Protocol

**Two spaces in the workspace. One boundary.**

- **Agent space (`agent/`)** — You own everything here. Write freely, organize by your own judgment, govern with provenance tags and /sleep consolidation. People context, project observations, skill memories, event logs, scratch work — all here.
- **[YOUR_NAME]'s space (everything else)** — `projects/`, `goals/`, `journal/`, `resources/`. Read freely. Write only with [YOUR_NAME]'s explicit approval.

<!-- CUSTOMIZE: Add exceptions to the write restriction if needed -->
<!-- Example: "Exception: append to inbox Unsorted and process `[x]` items per inbox-format rules." -->

**Six Rules:**

1. **Minimum viable context.** The goal is not to remember everything — it's to load the *least* context needed to do the task well. Every file read is a cost. The registry is the routing layer: consult it, load only what the task requires, and stop. If you can do the task with 3 files, don't load 8. If a file might be useful but isn't clearly needed, skip it — you can always fetch it later. Progressive disclosure is the default: start narrow, widen only when the task demands it.
2. **Everything you write gets provenance tags.** `[observed]` or `[corrected]`, with `— YYYY-MM-DD` date suffix. The date means "when this was learned." This is the trust layer.
3. **`agent/` is your space.** You decide the internal organization — create files, split files, merge files, create directories based on retrieval needs. Organize for retrieval, not storage — structure should enable loading narrow slices, not broad dumps.
4. **[YOUR_NAME]'s space is sacred.** Read freely, write only with permission.
5. **/sleep governs all of `agent/`.** Provenance enforcement, staleness pruning, consolidation, organization validation, and context budget audits — applied to everything in your space.
6. **The registry is the map.** Two registries, both agent-owned: `agent/registry-hot.md` (~20 most-used files, regenerated nightly) for quick routing, and `agent/registry.md` (full table) when the hot list doesn't cover it. Read `registry-hot.md` first; fall back to the full registry.

**Content classification:**

| Content type | Where it goes | Tag |
|---|---|---|
| [YOUR_NAME]'s work (specs, posts, code, assets) | [YOUR_NAME]'s space (`projects/`, `resources/`) | None — [YOUR_NAME]-authored |
| Research docs (competitive analysis, domain deep dives) | `resources/` (deduped against existing) | None — structured reference |
| Agent-authored observations (meeting takeaways, status, contacts) | `agent/` | `[observed]` |
| [YOUR_NAME]'s corrections to agent observations | `agent/` | `[corrected]` |

**Conflict resolution:** `[corrected]` always wins over `[observed]`. CLAUDE.md always wins over memories. Never prune `[corrected]` entries.
