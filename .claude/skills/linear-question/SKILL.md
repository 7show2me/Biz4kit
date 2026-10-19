---
name: linear-question
description: Ask a person instead of assuming. Use BEFORE writing code, copy, config or a plan that depends on a business fact not stated in Prep/*.md or docs/decisions.md. Examples are prices, plan limits, GST or tax rules, legal or consent wording, pilot verticals, vendor or hosting choices, message wording, who approves what, retention periods, refund terms, people and dates. Prep figures labelled "assumptions" count as open too. Opens a question in Linear (team BIZ, emailed to the assignee by Linear) and pings Slack #business-questions. Also use to check whether open questions have been answered and to record answers in docs/decisions.md.
---

# linear-question

Biz4Kit code is written by AI agents and checked by people. An agent that guesses a business rule creates silent bugs, so **business facts come only from `Prep/*.md`, `docs/decisions.md`, or a person's answer in Linear.**

Helper: `python .claude/skills/linear-question/ask.py` (run from the repo root; uses the `linear` and `slackcli` CLIs, already logged in).

## 1. Look first
Search before asking: `Grep` over `Prep/*.md` and `docs/decisions.md`.
- If it is stated plainly, use it and cite it in your work (`Prep/Outline.md:116`, or `D4`).
- `docs/decisions.md` overrides `Prep/` where they differ.
- If Prep gives only an "assumption", a "starting assumption", "confirm" or "TBD", it is **not** answered: ask.
- Technical choices that the Prep docs or decisions already settle (Next.js, Better Auth, Neon, Fly) are not questions. Ask about the business side, or where a vendor or cost choice is still open.

## 2. Check for an existing question
`python .claude/skills/linear-question/ask.py list`. If an open question already covers it, don't open another; add context with `linear issue comment add <KEY> --yes --body "..."` if you have any. `ask` also refuses an exact duplicate title on its own.

## 3. Ask
One question per issue, answerable by a busy owner in under a minute:

```
python .claude/skills/linear-question/ask.py ask \
  --title "Starter plan monthly price" --area pricing \
  --question "What monthly price should the Starter plan show at launch?" \
  --context "WBS 5.5 plan billing; Prep/Outline.md:117 lists ₹499 as a starting assumption to adjust after the pilot." \
  --option "₹499: as in the Outline; matches the G6 commitment ask" \
  --option "₹399: lower barrier for 1-3 person businesses" \
  --recommend "₹499, because G6 already tests it" \
  --blocks 5.5 --needed-by 2026-11-04
```

- `--area` is one of product, pricing, gst, legal, sales, vendor or people. It sets the label and the assignee (routing table in `ask.py`; everything goes to Saurabh for now, decision D2).
- Give 2–4 real options with their trade-offs. The recommendation is labelled as a suggestion, never a decision.
- `--blocks` takes WBS ids (`1.1`, `B0.2`, `S1.3`) or issue keys (`BIZ-12`). Add `--mark-blocked` only when the blocked package truly cannot move at all.
- Set `--needed-by` to the date the blocked work needs it, if the build calendar is known. Otherwise leave it out; don't invent a date.
- The output JSON gives the issue key, the URL and the Slack result. Linear emails the assignee (that is the Gmail route). If Slack reports `failed`, tell the user (usually because `#business-questions` doesn't exist yet). The question is still valid.

## 4. Don't assume while waiting
- Stop work on that path and continue other unblocked work.
- Tell the user in one line: the question key and URL, and what is paused.
- Never put a guessed value in code, copy, seed data or tests. If a structure must exist, read the value from config and add a test that fails until it is set, marked `TODO(BIZ-123)`.
- If the user is in the conversation and the question is theirs to answer, you can ask them directly too. Still record the answer (step 5) so other agents see it.

## 5. Record the answer and resume
When a question is in **Answered** (`ask.py list --state Answered`), or the user answered it directly:
1. Read the answer from the latest comments.
2. Add a row to the table in `docs/decisions.md`: next `D` number, today's date, the Linear key, the question, the decision, who decided it, and the affected WBS ids.
3. `linear issue comment add <KEY> --yes --body "Recorded as D<n> in docs/decisions.md"`, then `linear issue update <KEY> --no-input --state Done`.
4. Move any issue it blocked out of Blocked (`linear issue update <KEY> --no-input --state Todo`) and continue the work using the decision.

If an answer is unclear or contradicts Prep, don't pick one. Comment on the same issue with a precise follow-up and keep it in Needs answer.
