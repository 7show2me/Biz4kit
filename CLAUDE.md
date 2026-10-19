# Biz4Kit

White-label workspace for small businesses (catalog, quotes, invoices, payments). Planning documents live in `Prep/`. Read the `.md` versions; the `.docx` and `.pdf` files are copies.

- `Prep/Outline.md`: product
- `Prep/WBS.md`: work packages
- `Prep/Workflow & final verification.md`: build rules, TDD, PII, security, go / no-go
- `Prep/Architecture & contracts.md`, `Prep/Design inputs.md`, `Prep/Legal & compliance.md`, `Prep/Business plan.md`, `Prep/Market fit & sales.md`
- `docs/decisions.md`: answered business questions. These override `Prep/` where they differ.

## Never assume a business fact

If work depends on a business fact that is not stated in `Prep/` or `docs/decisions.md`, **do not guess and do not put in a placeholder value.** This covers prices, plan limits, GST / tax, legal or consent wording, verticals, vendors, message wording, approvals, retention and refunds. Use the `linear-question` skill: it opens a Linear question for a person, pings Slack, and you continue only once it is answered. Figures that `Prep/` calls "assumptions" count as open questions.

## Where things go

- Work items and questions: **Linear**, team **BIZ** (workspace `kunal-gupta`). The WBS is uploaded there; Linear is the live status.
- Slack: `slackcli` (workspace PowerPlus). Questions go to `#business-questions`.
- GitHub: code and pull requests only. **Never open GitHub issues.**

## Stack decisions (see docs/decisions.md)

- Backend runs in Docker (API + workers) on an AWS container service, Mumbai (D28). Web app on Vercel (D22). Redis: Upstash free (D29).
- Postgres is on Neon, AWS Mumbai.
- Brand (Biz4Kit chrome only, local only, D10-D19): `brand/theme.css` (colours, fonts, radius, shadows), `brand/logo/*.svg` (4B mark and lockup), `brand/design-system/` (brand book, tokens, usage rules), `brand/preview.html` (open in a browser). Customer-facing pages use the business's own theme.
- Re-create the Linear board with `python scripts/linear_seed.py`. It is safe to re-run.
