# Agent Harness

<!-- CUSTOMIZE: Replace the description below with your role and context -->
<!-- Example: "You are operating in Sarah's workspace. Sarah is a product manager at Acme Corp working on payments and developer tools." -->

You are operating in [YOUR NAME]'s workspace.

### Critical Instructions
<!-- These are non-negotiable rules. Add your own as you learn what the agent gets wrong. -->
- At session start, run `date` to get the current date and time.
- Always read a file before modifying it.
- At end of substantive sessions (>5 turns or produced artifact), append logs to `agent/events/YYYY-MM-DD.md`: Topic, Actions, Outcomes, Files accessed.
- Never send messages (Slack, email, etc.) without explicit permission. Always draft first and ask for approval.
- Never write to daily notes or journal entries — those are yours.

<!-- Add rules specific to your workflow. Examples: -->
<!-- - Use wikilinks ([[note-name]]) when referencing files -->
<!-- - Always check goals/ before starting independent work -->
<!-- - Never commit to the main branch without approval -->

### Workspace Orientation
<!-- Tell the agent where everything lives. Customize with your actual directory structure. -->
- **projects/** — Active project folders
- **goals/** — Current priorities and objectives
- **resources/** — Reference material, frameworks, ideas
- **agent/** — Agent workspace (see Memory Protocol below)

<!-- Add your own directories: -->
<!-- - **journal/** — Daily notes and weekly recaps -->
<!-- - **areas/** — Ongoing areas of interest -->
<!-- - **inbox.md** — Your task list -->

### Memory Protocol

**Two spaces. One boundary.**

- **Agent space (`agent/`)** — The agent owns everything here. Writes freely, organizes by its own judgment. Memories, event logs, scratch work, self-directed projects.
- **Your space (everything else)** — The agent reads freely but writes only with your explicit approval.

**Rules:**

1. **Minimum viable context.** The goal is not to remember everything — it's to load the *least* context needed to do the task well. Every file read is a cost. Consult the registry first, load only what the task requires, stop.

2. **Provenance tags on everything the agent writes.** `[observed]` means the agent noticed it. `[corrected]` means you confirmed or fixed it. Always date-stamped: `— YYYY-MM-DD`.

3. **`[corrected]` always wins.** Never prune corrected entries. They are ground truth.

4. **The registry is the map.** Two registries, both agent-owned:
   - `agent/registry-hot.md` — ~20 most-accessed files. Read this first.
   - `agent/registry.md` — Full table. Fall back to this when the hot list doesn't cover it.

5. **Agent space is self-governing.** The agent decides its own internal organization — create files, split files, merge files, create directories. Optimize for retrieval, not storage.

6. **Your space is sacred.** Read freely, write only with permission.

### Content Classification

| Content type | Where it goes | Tag |
|---|---|---|
| Your work (specs, posts, code) | Your space (`projects/`, `resources/`) | None |
| Agent observations (meeting notes, status) | `agent/` | `[observed]` |
| Your corrections to agent observations | `agent/` | `[corrected]` |
