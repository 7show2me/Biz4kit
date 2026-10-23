---
name: biz-record-decision
description: Record answered business questions. Use when the user answers a question in chat, or when Linear BIZ questions are in the Answered state or have a new answer comment. Adds the next row to docs/decisions.md, comments on the issue, closes it out, and flags conflicts with prep/ or earlier decisions. Not for asking new questions (use biz-linear-question).
---

# biz-record-decision

`docs/decisions.md` is the only place answers live. It overrides `prep/` where they differ.

## Steps

1. **Find answers.** `python .claude/skills/biz-linear-question/ask.py list --state Answered`, or read the issue: `linear issue view BIZ-n --no-pager` (comments are at the bottom). If the user answered in chat, use their words.
2. **Check the answer is clear.** If it is vague, or contradicts `prep/` or a numbered decision, do not pick a side: comment a precise follow-up on the issue and keep it in Needs answer.
3. **Add one row** at the bottom of the table in `docs/decisions.md`:
   `| D<next> | <today> | BIZ-n | <question> | **<decision>** | <who decided> | <WBS ids> |`
   - Next number = last `D` + 1. Never edit an old row. A later row replaces an earlier one by citing its id ("replaces D3").
   - Record what the person said. Do not add facts they did not state.
4. **Flag conflicts** in your reply, one line each (for example "D23 puts the lawyer review after the day-8 gate in Prep").
5. **Close the loop in Linear:**
   - `linear issue comment add BIZ-n -b "Recorded as D<n> in docs/decisions.md"`
   - Answered issues stay in **Answered** until recorded; then `linear issue update BIZ-n --state Done`.
   - Unblock anything it blocked: `linear issue update <KEY> --state Todo`.
6. **Update derived text** only where a decision changes it (for example the stack lines in `CLAUDE.md`). Keep it one line and cite the `D` number.
7. Tell the user the row ids added and what is now unblocked. Do not commit unless asked.
