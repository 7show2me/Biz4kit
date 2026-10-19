---
name: biz-progress-report
description: Biz4Kit 3-day progress report. Use when the user asks for a progress report, status update, "what happened in the last 3 days", a morning update, or what is pending, due and planned for today. Reads Linear (team BIZ), git history and docs/decisions.md, maps today to the WBS build day, and writes a local HTML and Markdown report under reports/. Never uploads the report anywhere.
---

# biz-progress-report

Builds a report for the last 3 days (change with `--days`) from three sources: Linear issues updated in the window, git commits, and decisions dated in the window. It also lists what is open and what the WBS plans for today.

Run from the repo root (uses the `linear` CLI, already logged in):

```
python .claude/skills/biz-progress-report/report.py
python .claude/skills/biz-progress-report/report.py --days 3 --open
```

- Writes `reports/progress-<date>.html` and `.md`. `reports/` is git-ignored.
- `--open` opens the HTML in the local browser.
- Build day 1 comes from the "Build day 1 date" row in `docs/decisions.md`. Day number = working days since then (Mon-Fri).
- "Due" lists issues with a Linear due date. If none have one, the report says so; never invent dates.

## Publishing rule (important)
Reports are shown **locally only**. Do not call the Artifact tool, upload, or send the report anywhere (claude.ai, Slack, email, a gist) unless the user asks in that conversation. Even then, ask once for confirmation first, and say it is going to a Claude/other server. If the user says never, never. See `CLAUDE.md` > Artifacts and uploads.

## After running
Summarise in chat: done in the window, pending, what to do today, what is due, and any question still in Needs answer. Point to the local file path.
