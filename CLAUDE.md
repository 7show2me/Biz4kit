# Biz4Kit

White-label workspace for small businesses (catalog, quick replies (proforma invoices), invoices, payments). Planning documents live in `prep/` as Markdown, rewritten on 2026-10-24 to match `docs/decisions.md`. The earlier versions and their `.docx` / `.pdf` copies are in `prep/archive/2026-10-24/`.

- `prep/Outline.md`: product
- `prep/WBS.md`: work packages
- `prep/Workflow & final verification.md`: build rules, TDD, PII, security, go / no-go
- `prep/Architecture & contracts.md`, `prep/Design inputs.md`, `prep/Legal & compliance.md`, `prep/Business plan.md`, `prep/Market fit & sales.md`
- `docs/decisions.md`: answered business questions. These override `prep/` where they differ.
- `design/app/`: the locked functional prototype and build spec (D94); `design/screens-v2.html` is its frozen look. `docs/implementation-notes.md`: prototype → product notes.
- `docs/flow.html`: how Lead → Reply (proforma) → Booking → Job → Invoice → Paid fit together, who approves what, and how it changes by business type (open in a browser).

## Never assume a business fact

If work depends on a business fact that is not stated in `prep/` or `docs/decisions.md`, **do not guess and do not put in a placeholder value.** This covers prices, plan limits, GST / tax, legal or consent wording, verticals, vendors, message wording, approvals, retention and refunds. Use the `biz-linear-question` skill: it opens a Linear question for a person, pings Slack, and you continue only once it is answered. Figures that `prep/` calls "assumptions" count as open questions.

## Where things go

- Work items and questions: **Linear**, team **BIZ** (workspace `kunal-gupta`). The WBS is uploaded there; Linear is the live status.
- Slack: `slackcli` (workspace PowerPlus). Questions go to `#business-questions`.
- GitHub: code and pull requests only. **Never open GitHub issues.**

## Stack decisions (see docs/decisions.md)

- Backend runs in Docker (API + workers) on ECS Fargate behind API Gateway, no load balancer, Mumbai (D28, D38, D42). Terraform state in S3 with locking (D39). Web app on Vercel (D22). Queue: Upstash Redis free + BullMQ (D33). Files: S3 Mumbai (D31).
- TanStack Start web, Hono + oRPC API (D30). Monorepo: pnpm + Turborepo (D37).
- Postgres is on Neon, AWS Singapore `aws-ap-southeast-1` (D4, D111; Mumbai not offered to our account), branches `prod`, `dev` and `test`; CI and PR previews use `test`, no branch per PR (D105, D114, D115), via Drizzle (D36).
- Email sender is the business name only, reply-to the owner, never "via Biz4Kit" (D35).
- Brand (Biz4Kit chrome only, local only, D10-D19): `brand/theme.css` (colours, fonts, radius, shadows), `brand/logo/*.svg` (4B mark and lockup), `brand/design-system/` (brand book, tokens, usage rules), `brand/preview.html` (open in a browser). Customer-facing pages use the business's own theme.
- Re-create the Linear board with `python scripts/linear_seed.py`. It is safe to re-run.

## Artifacts and uploads

- Show every artifact, report, page or design **locally** (files in the repo or `reports/`, opened in the local browser). This includes progress reports and design-system pages (D19).
- **Do not upload or publish anything to a Claude server or any other host** (the Artifact tool, claude.ai docs, Slack file uploads, gists) unless the user asks for it in that conversation. Even then, ask once for confirmation first and say where it will go. If the user says never, never.
- Publishing is outward-facing and hard to undo. Approval for one artifact does not cover the next.

## Skills

- Every project skill in `.claude/skills/` is named with the prefix `biz-` (folder and `name:`), and its description says plainly when to use it.
- Current skills: `biz-linear-question` (ask a person instead of assuming), `biz-record-decision` (record answers in docs/decisions.md), `biz-wbs-task` (one WBS package to a verified PR), `biz-progress-report` (3-day report: Linear, git, decisions, today's WBS items).
