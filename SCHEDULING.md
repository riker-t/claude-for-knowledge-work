# Scheduling Automated Skills

Three of the four skills are designed to run on a schedule:

| Skill | Schedule | Purpose |
|-------|----------|---------|
| `/daily-brief` | Once each morning | Synthesize signals, present priorities |
| `/proactive-scan` | Hourly during work hours | Monitor for new signals, do small tasks |
| `/sleep` | Once at midnight | Consolidate memories, prune stale context |
| `/independent-work` | Once daily (e.g., 9am) | Self-directed projects |

## Option 1: Run Manually

You don't need automation to get started. Just type the slash command in Claude Code:

```
/daily-brief
/proactive-scan
/sleep
```

This is the recommended approach for the first week while you're calibrating.

## Option 2: macOS launchd (Recommended for Automation)

Create a plist file for each scheduled skill. Example for the daily brief:

**File:** `~/Library/LaunchAgents/com.claude-code.daily-brief.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude-code.daily-brief</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>cd /path/to/your/vault && claude -p "Run /daily-brief" --allowedTools "Read" "Write" "Edit" "Glob" "Grep" "WebSearch" "WebFetch"</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>6</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/claude-daily-brief.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/claude-daily-brief.err</string>
</dict>
</plist>
```

Load it:
```bash
launchctl load ~/Library/LaunchAgents/com.claude-code.daily-brief.plist
```

Adjust the schedule, path, and allowed tools for each skill.

## Option 3: Cron

```bash
# Edit crontab
crontab -e

# Daily brief at 6am
0 6 * * 1-5 cd /path/to/your/vault && claude -p "Run /daily-brief" > /tmp/claude-daily-brief.log 2>&1

# Proactive scan every hour, 7am-7pm weekdays
0 7-19 * * 1-5 cd /path/to/your/vault && claude -p "Run /proactive-scan" > /tmp/claude-proactive-scan.log 2>&1

# Sleep at midnight
0 0 * * * cd /path/to/your/vault && claude -p "Run /sleep" > /tmp/claude-sleep.log 2>&1

# Independent work at 9am weekdays
0 9 * * 1-5 cd /path/to/your/vault && claude -p "Run /independent-work" > /tmp/claude-independent-work.log 2>&1
```

## Notes

- **Start manual, automate later.** Run each skill by hand for a week first. Automation amplifies both good and bad patterns.
- **Check logs.** Automated runs write event logs to `agent/events/YYYY-MM-DD.md` — review these to catch issues.
- **MCP availability.** Some MCP servers (Slack, Calendar) require authentication that may expire. If a scheduled run fails, check MCP auth first.
- **Cost.** Each skill run uses Claude API tokens. The daily brief is the most expensive (~$0.50-2.00 depending on signal volume). Proactive scan is cheaper (~$0.10-0.30) since it's lighter.
- **Checking output.** Automated runs write results to the log files above AND to `agent/events/YYYY-MM-DD.md` in your vault. Review the event logs to see what the agent did. For richer notification, pipe output to a Slack webhook or notification tool of your choice.
