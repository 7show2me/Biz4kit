# Implementation notes: prototype → product

Written 2026-10-23, after the final design check (`reports/final-design-check-2026-10-23.html`), before environment setup and end-to-end testing. `docs/decisions.md` wins over these notes and over `prep/`. Anything marked **Open** needs a person (`biz-linear-question`); do not fill it in.

## 1. What the prototype is

- `design/app/` is the **spec**: 36 screens, the business rules (`js/biz/*.js`), the data shape (`data/default.json`, `README.md`) and the acceptance checks (`#check`, about 26,000 checks, all green on 2026-10-23).
- `design/screens-v2.html` is the frozen look. The app must look the same.
- Port the rules, not the code: `js/biz` mutates one in-memory object and uses whole rupees, 8-character tokens and `meta.today`. The product needs a database, paise, 32-byte tokens and a real clock.

## 2. Monorepo as it stands (fact, 2026-10-23)

| Path | State |
|---|---|
| `apps/web` | TanStack Start scaffold (routes `index`, `login`, `success`, `_auth/dashboard`). Title "My App", `class="dark"` hard-coded. |
| `apps/server` | Hono on :3000; Better Auth at `/api/auth/*`, oRPC at `/rpc`, OpenAPI at `/api-reference`. Dockerfile on node:24-slim. |
| `apps/native` | Expo scaffold. Not Phase 1 screens. The fumadocs scaffold was deleted (D108). |
| `packages/api` | `publicProcedure`, `protectedProcedure`; router has only `healthCheck`, `privateData`. |
| `packages/auth` | Better Auth email + password, Drizzle adapter, Polar plugin with placeholder product id. |
| `packages/db` | Drizzle on node-postgres (pooled Neon URL); full Phase 1 schema with forced RLS, `withWorkspace` / `withUser` / `takeNumber`, migrations and a dev seed (WBS 1.2, 2026-10-25). |
| `infra/` | **Updated 2026-10-24 (BIZ-2):** `bootstrap/` (S3 state bucket with lock files, ECR, GitHub OIDC deploy roles) and one stack per environment (ECS Fargate API + worker, API Gateway HTTP API → VPC Link → Cloud Map, no load balancer or NAT, Secrets Manager, files bucket). `terraform test` with a mocked provider. Not applied yet; see `infra/README.md`. |
| CI | **Updated 2026-10-24 (BIZ-2):** `.github/workflows/ci.yml` (ultracite, typecheck, Vitest, Terraform tests, image build, gitleaks, audit), `deploy.yml` (staging on `main`, production on `v*` tags). `test` task in `turbo.json`; Vitest in `apps/server`. Playwright not yet. |
| Git | `apps/`, `packages/`, `design/app/`, root config are **untracked**; `infra/.terraform/` not ignored. |

Fix before E2E:

1. Commit the scaffold and `design/app/`; ignore `infra/.terraform/`.
2. **Database driver:** gap-free `INV-` numbering and payment approval need interactive transactions. `neon-http` has none: use the Neon serverless `Pool` (or `pg`) for those paths.
3. **Polar** stays as the billing provider for paid plans in Phase 2 (D98); plans are free in Phase 1, so leave it unwired for now.
4. Terraform: S3 state backend (D39), then ECS Fargate + API Gateway HTTP API + VPC Link + Cloud Map, no load balancer (D28, D38, D42); S3 bucket Mumbai (D31); Upstash Redis (D33) as a secret.
5. Add `test` to `turbo.json`, Vitest (unit + integration with a Postgres container) and Playwright (mobile first).
6. Workflow doc names `apps/api` and `apps/mobile`; the repo has `apps/server` and `apps/native`. Update CODEOWNERS paths.

## 3. Data model (from the prototype, with product changes)

Every table has `workspace_id` + RLS (Workflow §Security). Money in **paise** (Arch:41); the prototype uses rupees. Ids are UUIDs; the prototype's `L7` / `I12` ids are display only.

| Table | From prototype | Product changes |
|---|---|---|
| workspace | name, slug, vertical, address, city, pin, state, `state_code` (from GSTIN), phone, email, gstin, upi, bank, brand {primary, accent, logo}, numbering {PI, INV}, reply_valid_days, bill_due_days, approvals {manager_enabled, manager_limit}, modules {board, customers, jobs, serials}, terms | add legal name (CA checklist); numbering per financial year (**CA to confirm** reset) |
| member | name, email, phone, role, status, seen_at, mute (D87 inbox) | soft delete (`removed`), not a hard delete (DI:191) |
| catalog_item | name, category, unit, price, gst, hsn, desc, show_price, active, sort, photos, moq (D87); D85: serials, model, model_no, cover (warranty / guarantee), cover_months, track_batch | variants and add-ons: Phase 2 (D87) |
| package | name, tier, items [{item_id, qty}], price, billing, bookable, duration_min, advance_pct, desc, active, sort | — |
| customer | name, phone (unique, normalised), email, company, gstin, address, tags, token, notes | add `state_code` (place of supply; derived from GSTIN when present) |
| lead | customer, type quoted / booked, source, brief, lines, preferred_date, package, assignee, status, snoozed_until, reject_reason, priority (D87) | consent record (Arch:75); location: Phase 2 (D87) |
| invoice | kind reply / advance / balance / bill, pi_number, inv_number, lead, customer, booking, job, version, history, discount, pay_by, due_date, shared_at, cancelled, token, reminders | store or cache totals and status for lists; keep both numbers (D60, D71) |
| invoice_line | item_id, name, desc, qty, unit, rate, gst, **hsn**, optional, selected; advance lines carry `full_rate`; D85: tracked, model, model_no, cover, cover_months, track_batch, serial, batch, card | snapshot, never referenced (DI:142); unique index on (workspace_id, upper(serial)) where the invoice is not cancelled |
| payment | invoice, amount, method, reference, proof, uploaded_by, by_customer, uploaded_at, status, decided_by, decided_at, note, self_approved, version | proof in private S3, signed URLs, virus scan |
| booking | customer, lead, package, member, start, end, status | enum names: prototype stores `tentative` / `confirmed`, shown as To confirm / Agreed (D68, D69); pick one |
| job | booking, lead, customer, assignee, title, checklist, status, start, completed_at, invoice, photos (before / after), materials (D87) | time logged: Phase 2 (D87) |
| message_template (18), outbox, device, activity | as prototype | activity gets `diff`; outbox becomes the real send log |

Derived, never trusted from the client: invoice status (draft / awaiting / expired / due / part paid / overdue / pending / paid), totals, GST split, open balance, board column, cover dates, KPIs.

## 4. Rules to port (each is a test first, Workflow §TDD)

Source files in `design/app/js/biz/`; decision ids in brackets.

- **Numbers** (`invoices.takeNumber`): `PREFIX-FY-0000`; PI- at first share, INV- when approved payments cover the total; separate gap-free series; next number never goes down; prefixes differ (D60, D71).
- **Totals** (`invoices.totals`): GST only when the workspace has a GSTIN; per line; discount spread by ratio; CGST + SGST inside the state, IGST when the customer's state (stored or from GSTIN) differs. Rupee rounding: **CA to confirm**.
- **Status** (`invoices.statusOf`): reply and advance are never "owed" (D75); bill / balance: due → part paid (teal, D55) → overdue → pending → paid.
- **Advance and balance** (D70, fixed 2026-10-23): a reply with an advance % is the advance proforma, each line at pct of its rate with its own GST; the balance after the job is the rest (price less the advance's taxable value), plus the rest of the discount. Package advances work the same way. Advance GST: **CA to confirm**.
- **Payments** (`payments.*`): amount > 0 and ≤ open − pending; proof needed for UPI and bank; Owner approves any amount; Manager only strictly below the limit when enabled; never the uploader when another approver exists, else logged self-approved; never above the open balance; a payment on an older version applies to the latest (D57, D73, D74, D76).
- **Cannot pay**: cancelled, not shared, paid, rejected lead, expired reply (D73).
- **Cancel**: a draft is deleted by any writer; an issued invoice is cancelled by the Owner only (DI:177, fixed 2026-10-23); never after an approved payment; the number is kept.
- **Leads** (D59, D61, D62, D66, D72): quoted → Accept / Edit / Reject; booked → assign, confirm (message 10), advance if the package has one; Paid when every invoice on the lead is paid.
- **Board** (D65): columns derived; only moves an action can do.
- **Serials** (D85, D86): see `serials.js`.
- **Roles** (`perms.js`): write, assign, catalog, settings, export, record, approve, void. Accountant is read-only plus export (D91).
- **Messages** (D35, D67, D93): email from the business name, reply-to the Owner; SMS and WhatsApp are copy in Phase 1. 16 ready messages (8 and 9 retired); 4–7 and 18 wording approved (D95); placeholder `{doc_no}` (old `{quote_no}` still filled for saved templates).
- **Job done** (D88): marking a job done creates the draft invoice (bill, or balance after an advance); the job's step is "Review and send".
- **Tax invoice timing** (D90): `INV-` on payment approval for every vertical, wholesalers included.
- **"Made with Biz4Kit"** (D89): catalog, request, booking and My orders pages only; never on the pay page, PDF or warranty card.

## 5. Routes (target URL map)

From the screen definitions (`n`, `route`, `who`). Workspace: `/w/:slug/...` (dashboard, pipeline, leads/:id, catalog/:id, packages, bookings, jobs/:id, invoices/:id, invoices/overdue, approvals, customers/:id, reports, settings/*, serials). Customer: `<slug>.biz4kit.com`, `/request`, `/book/:package`, `/i/:token`, `/i/:token/pdf`, `/me/:token`, `/wc/:token` (warranty card). Onboarding: `/new`, `/new/brand|details|catalog|team|done`. Auth: `/login`, `/invite/:token`.

## 6. End-to-end tests

Turn `design/app/js/check.js` FLOWS and each screen's `checks` into Playwright + integration tests:

1. Quoted lead → reply → payment → approval → INV- → Paid; message 15 in the log.
2. Approval rules (Manager limit, Staff cannot, uploader refused).
3. Expired and rejected cannot be paid; reject sends message 18.
4. Board moves.
5. Numbering gap-free; prefixes differ.
6. Advance then balance = full price and full GST (new).
7. IGST from the customer's GSTIN (new).
8. Part paid, and only the Owner cancels an issued invoice (new).
9. Serials: split, unique, card, proforma without serial.

10. Approve-from-email link: 48 h, single use, all approval rules apply (D57, D87).
11. Inbox by role; mute hides a kind; first-run checklist steps; lead priority (D87).
12. Job done makes the draft invoice; Review and send shares it (D88).

Plus Workflow §TDD musts: tenant isolation fuzz, 32-byte revocable tokens, rate-limited token lookups, approval links 48 h single use, PDF matches web, Lighthouse and axe budgets, Flows 1–4 on a Moto G over throttled 4G.

## 7. Go / no-go for the pilot

D92: the pilot gate passes without CA and lawyer sign-off; every CA / lawyer placeholder stays visibly marked; their sign-off is required before paid plans.

## 8. Added after the lock (each has a decision)

- **Opening hours** (D97, D99): built in the prototype. `workspace.hours` = up to two ranges per weekday; `settings.slotsFor` gives 30-minute slots that fit the package; closed until set.
- **Starter kits** (D96): drafted in `design/app/js/biz/kits.js` for all six verticals; the five non-salon kits are marked draft (prices, units, the restaurant 50 % advance, GST left unset) and wait for the owner's approval.
- **Booking Cancelled is red** (D100), **"Request a quote"** on customer pages (D101), **customer ticks optional lines** on the pay page, fixed once a payment is made (D102, `invoices.chooseOptional`).

## 9. Placeholders that must stay placeholders until answered

Proforma terms, SAC / HSN codes and the computer-generated note (CA); consent and privacy lines (lawyer, D23); warranty terms (each business); reply validity 15 days and bill due 7 days (sample values); "Reverse charge: No" on the PDF (CA).
