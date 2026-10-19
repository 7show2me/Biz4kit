# Biz4Kit

White-label workspace for small businesses (catalog, quotes, invoices, payments). Planning documents live in `Prep/`. Read the `.md` versions; the `.docx` and `.pdf` files are copies.

- `Prep/Outline.md`: product
- `Prep/WBS.md`: work packages
- `Prep/Workflow & final verification.md`: build rules, TDD, PII, security, go / no-go
- `Prep/Architecture & contracts.md`, `Prep/Design inputs.md`, `Prep/Legal & compliance.md`, `Prep/Business plan.md`, `Prep/Market fit & sales.md`
- `docs/decisions.md`: answered business questions. These override `Prep/` where they differ.

## Never assume a business fact

If work depends on a business fact that is not stated in `Prep/` or `docs/decisions.md`, **do not guess and do not put in a placeholder value.** This covers prices, plan limits, GST / tax, legal or consent wording, verticals, vendors, message wording, approvals, retention and refunds. Use the `biz-linear-question` skill: it opens a Linear question for a person, pings Slack, and you continue only once it is answered. Figures that `Prep/` calls "assumptions" count as open questions.

## Where things go

- Work items and questions: **Linear**, team **BIZ** (workspace `kunal-gupta`). The WBS is uploaded there; Linear is the live status.
- Slack: `slackcli` (workspace PowerPlus). Questions go to `#business-questions`.
- GitHub: code and pull requests only. **Never open GitHub issues.**

## Stack decisions (see docs/decisions.md)

- Backend runs in Docker (API + workers) on an AWS container service, Mumbai (D28). Web app on Vercel (D22). Redis: Upstash free (D29).
- Postgres is on Neon, AWS Mumbai.
- Brand (Biz4Kit chrome only, local only, D10-D19): `brand/theme.css` (colours, fonts, radius, shadows), `brand/logo/*.svg` (4B mark and lockup), `brand/design-system/` (brand book, tokens, usage rules), `brand/preview.html` (open in a browser). Customer-facing pages use the business's own theme.
- Re-create the Linear board with `python scripts/linear_seed.py`. It is safe to re-run.

## Artifacts and uploads

- Show every artifact, report, page or design **locally** (files in the repo or `reports/`, opened in the local browser). This includes progress reports and design-system pages (D19).
- **Do not upload or publish anything to a Claude server or any other host** (the Artifact tool, claude.ai docs, Slack file uploads, gists) unless the user asks for it in that conversation. Even then, ask once for confirmation first and say where it will go. If the user says never, never.
- Publishing is outward-facing and hard to undo. Approval for one artifact does not cover the next.

## Skills

- Every project skill in `.claude/skills/` is named with the prefix `biz-` (folder and `name:`), and its description says plainly when to use it.
- Current skills: `biz-linear-question` (ask a person instead of assuming), `biz-progress-report` (3-day report: Linear, git, decisions, today's WBS items).
