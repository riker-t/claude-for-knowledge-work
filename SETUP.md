# Setup Prompt

Copy the prompt below, open Claude Code in the directory where you keep your work, and paste it.

---

```
I want to set up a personal agent using the starter kit from the claude-for-knowledge-work repo.

The repo is cloned at: [REPLACE WITH PATH TO YOUR CLONE]

Please:
1. Ask me about my role, my main projects (2-3), and what tools I use daily (Slack, calendar, etc.)
2. Customize templates/CLAUDE.md with my answers and copy it to ./CLAUDE.md in my working directory
3. Copy the templates/agent/ scaffold to ./agent/ in my working directory
4. Copy the skills/ folder to ~/.claude/skills/
5. Walk me through what each skill does and how to run them

Start by asking me about my role and projects.
```

---

After setup, try running your first daily brief:

```
/daily-brief
```

The agent will ask you to configure your signal sources (Slack channels, calendar, etc.) on first run. After that, it runs in under a minute.
