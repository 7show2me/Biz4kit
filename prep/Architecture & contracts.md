# Architecture & contracts

Rewritten 2026-10-24 to match `docs/decisions.md` (D1–D102) and the locked prototype `design/app/` (D94). Previous version: `prep/archive/2026-10-24/Architecture & contracts.md`.

Oct 18, 2026 · @Ravin

One TanStack Start web app (D30) serves the workspace and the customer portal, one API (Hono + oRPC, D30) owns every rule, one Postgres (Neon, D4) with row-level security holds every workspace, and everything external (payments, email, messaging, AI) sits behind an adapter with a standalone fallback. This tab is the spec AI agents build from, together with the locked prototype `design/app/` (rules in `js/biz/`, 38 screens, D94) and `docs/implementation-notes.md`. `docs/decisions.md` wins where they differ.

## System architecture

&#91;embedded content: system architecture · 3 clients, 1 core, 4 adapters, external services by phase\]

Clients never talk to an external service directly; every call goes through the API and then an adapter, so a missing or disabled connector always lands on the Phase 1 fallback. In Phase 1 only the email adapter and Google OAuth have a real provider behind them.

**Deployment** (all in Mumbai, ap-south-1):

| Piece | Where | Decision |
| --- | --- | --- |
| Monorepo | pnpm workspaces + Turborepo: `apps/web`, `apps/server`, `apps/native`, `packages/*` | D37 |
| Web app | TanStack Start on Vercel | D22, D30 |
| API + workers | Docker images in ECR, ECS Fargate; API Gateway HTTP API → VPC Link → Cloud Map → Fargate, no load balancer; 30 s request timeout and 10 MB body accepted (files go to S3 by signed URL); workers have no inbound traffic; tasks in public subnets with a public IP, no NAT gateway; the security group admits only the VPC Link | D28, D38, D42 |
| Database | Neon Postgres, AWS Mumbai; prod + staging branches, a branch per PR preview; point-in-time restore; Drizzle. Gap-free numbering and approvals run in transactions, so they use the Neon serverless Pool, not `neon-http` | D4, D36 |
| Queue | BullMQ on Upstash Redis (free plan while the command cap allows) | D33 |
| Files | AWS S3, private buckets, expiring signed URLs | D31 |
| Infra as code | Terraform, state in S3 with locking | D39 |
| Billing (Phase 2) | Polar for plan billing; plans are free in Phase 1 | D98 |

## Services and modules

One deployable API, split into modules; a module may only call another through its exported service, never its tables. This is a one-person project: the agent builds every module and the one human verifies (D24, D27).

| Module | Owns | Exposes |
| --- | --- | --- |
| `auth` | Better Auth config, sessions, invites, roles, re-auth | `requireUser`, `requireRole`, invite service |
| `workspace` | Workspace, Member, brand theme generation, numbering settings (`PI-`, `INV-`), opening hours (D97, D99), modules (board, customers, jobs, serials), first-run checklist | theme tokens, numbering allocator |
| `catalog` | CatalogItem (photos, MOQ, serial fields), Package, CSV import, public catalog read model | item and package services, public page data |
| `leads` | Lead (type, status, priority), portal request form, assignment | lead service, source tagging |
| `documents` | Invoice (kind reply / advance / balance / bill; proforma `PI-` until paid, then tax `INV-`; linked to the lead, D60, D70), versions, totals, GST, InvoiceLine snapshots, serials and warranty cards (D85, D86), render model shared by web and PDF | invoice service, serial service, `renderDocument` |
| `payments` | Payment, proof files, approval queue, Manager limit, approve-from-email tokens, receipts | payment service, approval service |
| `bookings` | Booking, availability from opening hours, conflicts, Job, checklists, job photos and materials | booking and job services |
| `customers` | Customer, timeline, My-orders tokens | customer service, timeline read model |
| `messages` | 16 ready templates (D93, D95), rendering, share logging, in-app inbox (derived items, read state, per-user mute, D87), notification routing | `notify(event, record)` |
| `exports` | PDF / DOCX / CSV jobs, storage, signed URLs | `export(record, format)` |
| `connectors` | Adapter registry, per-workspace settings, secrets, health | `getAdapter(kind, workspace)` |
| `admin` | Super-admin console, abuse controls, audit views | admin service |
| `jobs` | BullMQ queues: pdf, email, expiry, reminders (Phase 2), ingest (Phase 2) | queue names and payload schemas |

Shared packages: `db` (schema, migrations, RLS policies), `api` (oRPC routers), `auth`, `ui` (design system), `templates` (React templates for web and PDF), `connectors` (adapter interfaces and implementations).

## Data model

From the prototype (`design/app/data/default.json`, `js/biz/`) with the product changes in `docs/implementation-notes.md` §3. Every table has `workspace_id` and RLS. Money is integer **paise**; the prototype's whole rupees are display only. Ids are UUIDs.

| Table | Fields |
| --- | --- |
| workspace | name, legal name, slug (`<slug>.biz4kit.com`, D47), vertical, address, city, pin, state, state_code (from GSTIN), phone, email, gstin, upi, bank, brand {primary, accent, logo}, numbering {PI, INV: prefix, next}, reply_valid_days, bill_due_days, approvals {manager_enabled, manager_limit}, modules {board, customers, jobs, serials}, opening_hours (per weekday, up to two ranges, D99), terms, setup_dismissed |
| member | name, email, phone, role, status (invited / active / removed, soft delete), seen_at, mute (per inbox kind) |
| catalog_item | name, category, unit, price, gst, hsn, desc, show_price, active, sort, photos, moq (D87); serials, model, model_no, cover (warranty / guarantee), cover_months, track_batch (D85). Variants and add-ons: Phase 2 (D87) |
| package | name, tier, items [{item_id, qty}], price, billing, bookable, duration_min, advance_pct (no default, D66), desc, active, sort |
| customer | name, phone (unique, normalised), email, company, gstin, state_code (from GSTIN when present), address, tags, token, notes |
| lead | customer, type quoted / booked (D59), source, brief, lines, preferred_date, package, assignee, status New / Contacted / Replied / Snoozed / Rejected / Paid (D66, D72), priority normal / high (D87), snoozed_until, reject_reason, consent flag. Location: Phase 2 (D87) |
| invoice | kind reply / advance / balance / bill, pi_number, inv_number, lead, customer, booking, job, version, history, discount, pay_by, due_date, shared_at, cancelled, token, reminders; cached totals and status for lists |
| invoice_line | item_id, name, desc, qty, unit, rate, gst, hsn, optional, selected, sort; advance lines keep `full_rate` (D70); tracked, model, model_no, cover, cover_months, track_batch, serial, batch, card token (D85, D86). A snapshot, never a reference to the item. Unique index on (workspace_id, upper(serial)) where the invoice is not cancelled |
| payment | invoice, amount, method (upi / bank / cash / card), reference, proof, uploaded_by, by_customer, uploaded_at, status pending / approved / rejected, decided_by, decided_at, note, self_approved, version, approve_token (48 h, single use, D57) |
| booking | customer, lead, package, member, start, end, status To confirm / Agreed / in progress / completed / Cancelled / no-show (D68, D69, D100) |
| job | booking, lead, customer, assignee, title, checklist, status open / in progress / done / invoiced, start, completed_at, invoice, photos (before / after), materials (name, qty, unit, note; no prices) (D87). Time logged: Phase 2 |
| message_template | 16 ready messages (8 and 9 retired, D93): id, event, name, subject, body; placeholder `{doc_no}` |
| message | sent and shared log: channel, to, subject, body, record, template, by |
| device, activity_log | as the prototype; activity gets a `diff` |

**Derived, never stored as truth:** invoice status (draft, awaiting payment, expired, due, part paid, overdue, waiting for approval, paid; D55, D75), totals and the GST split (IGST when the customer's state differs), open balance, board column (D65), cover start and end (from the invoice date, D85), inbox items, KPIs.

**Roles** (`perms.js`): `write` Owner, Manager, Staff · `assign` and `catalog` Owner, Manager · `settings` Owner · `export` Owner, Accountant · `record` Owner, Manager, Staff (D91) · `approve` Owner, Manager (Manager strictly below the limit when turned on, D57, D74) · `void` (cancel an issued invoice) Owner. The Accountant is read-only plus export (D91); Super-admin is a read-only support view.

## API contract

Internal calls use oRPC on Hono (D30) with shared types; the customer portal and the Phase 3 public API use REST on the same services. Conventions first, then the Phase 1 surface.

**Conventions**

- Base `/api/v1`; JSON; UTC timestamps in ISO 8601; money as integer paise with a `currency` field.
- Auth: session cookie for members (Better Auth); `Authorization: Bearer <portal token>` for customer links (32-byte, revocable, rate-limited lookups); every request resolves a `workspace_id` or is rejected before any query.
- Errors: `{ error: { code, message, field? } }` with codes `unauthenticated`, `forbidden`, `not_found`, `validation`, `conflict`, `rate_limited`, `state` (invalid transition); HTTP status matches. Messages are sentences the UI shows as is, as in the prototype's `BizError`.
- Pagination: cursor-based, `?cursor=&limit=` (max 100); list responses return `{ items, next_cursor }`.
- Idempotency: `Idempotency-Key` header required on create and on any money or send action; replays return the first result.
- Rate limits: portal endpoints 60 requests per minute per IP and per token; member endpoints 600 per minute per workspace.
- Versioning: additive changes only within v1; a breaking change is v2.

**Phase 1 endpoints (members)**

| Method | Path | Does |
| --- | --- | --- |
| POST | `/workspaces` | Create workspace (onboarding step 2); the vertical picks the starter kit and turns serials on for Wholesaler and Manufacturer (D85, D96) |
| PATCH | `/workspaces/:id/brand` · `/workspaces/:id/hours` · `/workspaces/:id/modules` | Logos, colours (returns theme tokens and contrast warnings); opening hours, up to two ranges per weekday (D99); extras on / off (D63, D85) |
| POST | `/workspaces/:id/invites` · `/invites/:token/accept` | Invite, accept; invite code variant `POST /invites/claim` |
| GET/POST/PATCH | `/catalog/items`, `/catalog/items/:id` | Items with photos, MOQ and serial fields; `POST /catalog/import` for CSV with a mapping preview |
| GET/POST/PATCH | `/packages`, `/packages/:id` | Packages and tiers |
| GET/POST/PATCH | `/leads`, `/leads/:id` · `POST /leads/:id/assign` · `/accept` · `/reject` · `/confirm` · `/snooze` | Leads inbox; type quoted / booked, statuses, priority (D59, D66, D72, D87); quoted lead: Accept (prices and shares the reply, with an optional advance %), Edit or Reject with message 18 (D61, D95); booked lead: assign a staff member and confirm with message 10 (D62) |
| POST | `/invoices` (from a lead, package, job or manual) · `PATCH /invoices/:id` · `POST /invoices/:id/share` · `/revise` · `/remind` · `/void` | Invoice lifecycle. Share assigns the next `PI-` and returns the private link and the ready message; revise is a new version under the same `PI-` (D60); `INV-` comes on payment approval, its own gap-free series (D60, D71, D90); advance and balance are two invoices (D70); an unpaid reply is not a receivable and turns Expired past its pay-by date (D75); void needs the Owner and no approved payment, the number is kept |
| POST | `/invoices/:id/serials` · `GET /serials?q=` | Save serials, batch and cover per unit (a line splits into one row per unit; unique per workspace; allowed after payment, no new version); lookup by serial, model, batch or customer (D85, D86) |
| POST | `/invoices/:id/payments` (amount, method, proof) · `POST /payments/:id/approve` · `/reject` | Record and approve. Approval turns a `PI-` into the next `INV-` (D60); a Manager may approve only strictly below the Owner's limit, and only when Manager approvals are on (D57, D74); the uploader cannot approve while another approver exists, a sole Owner may and it is logged as self-approved (D74); approval above the open balance is refused; a payment against an older `PI-` version applies to the latest (D76); a Rejected lead or an expired reply cannot be paid, a Snoozed lead can, with a warning (D73); the Accountant cannot record (D91) |
| GET/POST/PATCH | `/bookings`, `/bookings/:id` · `GET /availability` | Calendar; availability from opening hours, 30-minute slot starts that fit the package (D99); statuses To confirm / Agreed / Cancelled (D68, D69, D100) |
| GET/PATCH | `/jobs/:id` · `POST /jobs/:id/done` · `/photos` · `/materials` | Jobs; done creates the draft invoice at once (bill, or balance after an advance) and the next step is Review and send (D88); photos and materials until invoiced (D87) |
| GET | `/customers`, `/customers/:id/timeline` | Customers |
| POST | `/records/:type/:id/share` | Logs a Message row and returns the rendered text for the chosen channel; in Phase 1 the app sends email only (business name as sender, reply-to the owner), SMS and WhatsApp text is copied (D35, D67) |
| POST | `/exports` · `GET /exports/:id` | Queue and fetch PDF / DOCX / CSV |
| GET | `/inbox` · `POST /inbox/read` · `PATCH /members/me/mute` | In-app inbox (derived items by role), mark read, per-user mute (D87) |
| GET | `/reports/summary?from&to` | Reports v1 |

**Phase 1 endpoints (approver link, token auth)**

| Method | Path | Does |
| --- | --- | --- |
| GET/POST | `/a/:token` · `/a/:token/approve` · `/reject` | Approve-from-email page for one payment; link valid 48 h from upload and single use; every approval rule above applies (D57, D87) |

**Phase 1 endpoints (customer portal, token auth)**

| Method | Path | Does |
| --- | --- | --- |
| GET | `/p/:slug/catalog` | Public catalog read model (cacheable) |
| POST | `/p/:slug/requests` | "Request a quote" (D101) → quoted lead (D59); quantities raised to the item's MOQ; rate-limited, consent flag required |
| GET | `/book/:package/slots` · `POST /book/:package` | Booking picker from opening hours (D99); creates a booked lead, booking To confirm until Agreed (D59, D62, D68, D69) |
| GET | `/i/:token` · `POST /i/:token/selection` · `POST /i/:token/proof` | Pay page (proforma `PI-` or tax `INV-`), UPI deep link and QR; the customer ticks optional lines and the amount updates (D102); proof upload; a Rejected lead or an expired reply says it is no longer valid (D73) |
| GET | `/i/:token/pdf` | Invoice PDF; no "Made with Biz4Kit" (D89) |
| GET | `/me/:token` | My orders |
| GET | `/wc/:token` | Warranty card for one row with a serial; open to anyone with the link, phone masked (D86) |

**Webhooks (Phase 2, inbound)**: `/webhooks/:provider` with signature verification and an idempotency table; unmatched payment webhooks create a `pending_approval` Payment rather than failing silently.

**Web routes** (the URL map of the 38 locked screens, D94): workspace `/w/:slug` (Today), `/pipeline`, `/leads/:id`, `/catalog/:id`, `/packages`, `/bookings`, `/jobs/:id`, `/invoices/:id`, `/invoices/overdue`, `/approvals`, `/customers/:id`, `/reports`, `/settings/*`, `/serials`, `/inbox`; approver `/a/:token`; customer `<slug>.biz4kit.com`, `/request`, `/book/:package`, `/i/:token`, `/i/:token/pdf`, `/me/:token`, `/wc/:token`; onboarding `/new`, `/new/brand|details|catalog|team|done`; auth `/login`, `/invite/:token`.

## Connector adapter interface

Four adapter kinds plus ingest, one registry. A workspace enables zero or more providers per kind; the API asks the registry for the best available adapter and always receives one, because the standalone fallback is itself an adapter.

| Kind | Interface (TypeScript sketch) | Fallback adapter (Phase 1) | Providers (Phase 2) |
| --- | --- | --- | --- |
| Payments | `createPaymentRequest(invoice) → { kind: 'link' \| 'static', url?, upi?, bank?, qr }`, `verifyWebhook(req)`, `reconcile(event) → Payment`, `refund?()` | `static-upi`: returns the UPI deep link, QR and bank block; reconciliation is the approval queue | `razorpay`, `stripe`, `polar` |
| Email | `send(template, to, data) → { id }`, `status(id)` | `mailto`: returns a ready message and logs it as shared; used only if Resend is down | `resend` (Phase 1 default), SES later |
| Messaging | `send(channel, template, to, data)`, `status(id)`, `inbound(req)` | `share-sheet`: returns the rendered text and a `wa.me` / `sms:` link | `whatsapp-business`, `msg91` |
| OTP | `start(phone) → { challenge }`, `verify(challenge, code)` | `link-possession`: the private link is the proof; no code | `msg91`, `twilio` |
| Ingest | `structure(file \| text, target) → { draft, confidence }` | `csv`: column mapping only | `claude` |

Plan billing for paid plans uses Polar (D98). Gateway, SMS DLT and WhatsApp accounts need the company, formed after Phase 2 (D43, D49).

**Rules**

- Adapters never touch the database; they return typed results and the owning module writes.
- Each provider has a `health()` check and a settings schema; the settings UI is generated from the schema, with secrets write-only.
- Selection order per kind is a workspace setting with a recommended default (Razorpay in India); if the chosen provider fails health, the next enabled one is used, then the fallback, and the owner is told in the inbox.
- Every outbound call is logged with provider, latency and a scrubbed payload; every inbound webhook is stored raw before processing.
- Contract tests run against each provider's sandbox nightly and against a recorded fixture on every PR.

## Analytics event plan

Events are named `object_verb`, carry `workspace_id`, `actor` (owner / staff / customer / system) and `source` where known, never a name, phone or email. One event per row below is enough to compute every GTM test.

| Event | Fired when | Properties | Feeds |
| --- | --- | --- | --- |
| `workspace_created` | Onboarding step 2 | vertical, channel tag from sign-up link | G1, G7 |
| `catalog_shared` | Owner copies the link, downloads the QR or shares the price-list message | method | G1 |
| `lead_created` | Portal request, booking or manual entry | type (quoted / booked), source (qr / web / instagram / referral / manual) | G2, G8 |
| `reply_shared` | First share of the proforma reply to a quoted lead (D60) | minutes\_since\_lead, from\_package, has\_advance | G2 |
| `reply_viewed` | First portal open, bots excluded | hours\_since\_share | G3 |
| `reply_paid` | Payment on the reply approved; paying is the acceptance (D60) | version, hours\_since\_share, optional\_lines\_selected (D102) | G3 |
| `invoice_shared` | Shared (kind and `PI-`; `INV-` comes on approval, D60, D71) | from (lead / job / manual), total\_bucket | G4 |
| `payment_recorded` | Proof uploaded or cash recorded | method, has\_proof, by (member / customer) | G4 |
| `payment_approved` | Owner or Manager approves | hours\_since\_recorded, via (app / email) | G4 |
| `invoice_paid` | Invoice turns Paid | days\_since\_share | G4 |
| `booking_confirmed`, `job_completed` | As named (a booking is confirmed when it turns Agreed, D69) | staff\_count | usage |
| `member_active_day` | First action of a member each day | role | G5 |
| `commitment_asked`, `commitment_answered` | Day-20 ask logged by the success buddy | answer (yes / no / later) | G6 |
| `signup_attributed` | Workspace created from a tagged link or the free-plan footer | channel | G7 |
| `template_shared` | Any ready message copied or shared | event number, channel | messages |
| `export_created` | PDF / DOCX / CSV | format, record type | usage |

Dashboards: one per GTM test with its pass line drawn; a daily snapshot posts to Slack #pilot. Event names are frozen once the pilot starts; new events are added, old ones never renamed.

## Acceptance criteria (Phase 1)

Each line becomes a test in the package's first commit and a checkbox in its Linear issue. The WBS "Done when" column is the summary; this is the contract. The prototype checks (`design/app/js/check.js`, every screen's `checks`; 28,121 green at the lock, D94) are the reference behaviour; `docs/implementation-notes.md` §6 lists the flows to port.

| WBS | Given / when / then |
| --- | --- |
| 1.2 | Given a member of workspace A, when they query any table with B's ids, then zero rows and no error leak; given a migration, when run twice, then it is a no-op |
| 1.3 | Given a Google account, when it signs in on web and on the Expo shell, then one user, two sessions, both listed and individually revocable; given an invite to `a@x`, when `b@y` signs in, then the invite is visible to the owner, editable, and claimable with the invite code; given a billing or delete action, when the session is older than 15 minutes, then re-auth is required |
| 1.4 | Given two brand colours, when saved, then tokens exist for light and dark and every text-on-primary pair is ≥ 4.5:1 or the owner is warned and the colour adjusted; given opening hours with two ranges on a weekday and none on Sunday, then only those ranges are bookable and Sunday is closed (D99) |
| 1.6 | Given each notification event, when it fires, then exactly one email is sent to the right person with a working single-use link, from the business name with reply-to the owner (D35); given a bounce, then the member sees a warning in settings |
| 1.7 | Given airplane mode, when staff open today's bookings and jobs and draft an invoice, then data is shown from cache, the draft is kept, and syncs on reconnect with a visible conflict banner if the server changed |
| 2.1 | Given a CSV with Vyapar headers, when imported, then columns are mapped with a preview and unmapped columns are listed; given a hidden-price item, when the portal renders, then price is replaced by a "Request a quote" prompt (D101); given an item with MOQ 10, then the request form starts at 10 and raises a lower number to 10; given a WhatsApp preview bot, when it fetches the catalog, then no analytics event fires |
| 2.3 | Given a proforma invoice edited on desktop and the same invoice opened on a phone, when lines change on either, then totals match to the paisa and the PDF matches the web render in the visual test |
| 2.4 | Given a shared proforma (`PI-`), when the customer opens a forwarded link, ticks optional lines and pays, then the amount follows the ticks (D102) and paying is the acceptance (D60); given an expired reply or a Rejected lead, when payment is attempted, then `state` error (D73); given a revise, then the `PI-` number is unchanged and version + 1; given a reply with a 50% advance, then it is an advance invoice for half and the balance after the job brings the total to the full price and GST, nothing taxed twice (D70) |
| 2.5 | Given 100 invoices shared in parallel, then `PI-` numbers are unique; given 100 payments approved in parallel, then `INV-` numbers are gap-free and unique, a series separate from `PI-` (D60, D71); given a draft, then no number; given a customer GSTIN from another state, then IGST, otherwise CGST + SGST; given a part payment approved before the due date, then Part paid (D55); given a void by a Manager, then `forbidden`; given a void by the Owner, then the number is retained and the invoice is excluded from totals; given serials entered for a line of qty 3, then 3 rows of qty 1 with the same totals, a duplicate serial in the workspace is refused, and the proforma PDF shows no serial (D85, D86) |
| 2.6 | Given a proof upload by staff, when the owner taps the email link, then the payment is approved once and the link is dead afterwards; given a link older than 48 h, then it shows expired (D57, D87); given a Manager and an amount at or above the Owner's limit, or Manager approvals turned off, then approve is forbidden (D57, D74); given the Owner as the only approver, then they may approve their own upload and it is logged as self-approved (D74); given an amount above the open balance, then approve is refused (D76); given the Accountant, then record is forbidden (D91); given approval of the full amount, then the invoice turns Paid, a proforma takes the next `INV-` number (D60) and the receipt message is offered |
| 2.7 | Given every template and a sample record, when rendered, then no unresolved `{variable}` remains and WhatsApp length ≤ 60 words; given a share, then a Message row exists on the record; there are 16 templates (D93) |
| 2.8 | Given any invoice (proforma or tax), when exported, then PDF, DOCX and CSV are produced within 3 s (p95) and the DOCX opens in Word and Google Docs with the brand header intact; no "Made with Biz4Kit" on the PDF (D89) |
| 2.9 | Given a new lead, when created, then the assignee gets one inbox item and one email; given the same event twice (idempotency replay), then still one; given Staff, then no approval items; given a muted kind, then it is hidden from the list and the count (D87) |
| 3.1–3.3 | Given overlapping bookings for one member, then the second is refused with a conflict; given a job marked done with an incomplete required checklist, then refused; given done, then a draft invoice exists linked to the job, unnumbered until Review and send shares it (D88); given a high-priority lead, then it comes first in Leads to answer (D87) |
| 3.4 | Given a customer's My-orders link, then every request, booking, invoice and receipt of that customer and no other customer's; given a warranty card link, then the customer's phone is masked (D86) |
| 3.5 | Given each role, when each endpoint is called, then the permission matrix holds (Staff cannot read reports or approve; Accountant is read-only plus export, D91; only the Owner voids); every mutation writes an ActivityLog row |
| 3.7–3.8 | Given a slug containing a reserved or bank-like word, then creation is refused; given an abuse report, then the workspace is flagged in the console within one request; given admin impersonation, then a consent log entry exists |
| 4.1 | Given the full suite, then it runs green in under 5 minutes; given Lighthouse on the portal pages, then LCP ≤ 2.5 s under the NFR profile; given axe, then zero serious violations |
| 4.3 | Given the Expo shell, when installed on three Android phones and left a week, then the session is still valid and the share sheet opens WhatsApp with the message prefilled |

## Test plan and device matrix

**Scope by day**: unit and integration from day 1; end-to-end on previews from day 3; non-functional and security sweeps on days 8–9; a real-owner session on day 7 and day 10. Layers: Vitest unit, Vitest + a Postgres container for integration, Playwright mobile-first end-to-end on the preview (`docs/implementation-notes.md` §6).

**Device matrix** (buy or borrow these before day 3)

| Device | Why | Browser | Flows |
| --- | --- | --- | --- |
| Mid-range Android, 4 GB RAM, Android 12–14 (Moto G / Redmi class) | The staff and customer phone | Chrome, WhatsApp in-app browser, Instagram in-app browser | All four flows, offline test, share sheet |
| Low-end Android, 2–3 GB RAM, Android 10–11 | Worst case customer | Chrome | Catalog, request, pay page |
| iPhone (two versions back) | Owners and agency clients | Safari | Portal flows, PDF download |
| Laptop, Windows + Chrome; Mac + Safari | Owners in the evening | Chrome, Safari, Edge | Workspace, doc editor, exports |
| Printer | Invoices and QR cards are printed | — | PDF print at A4, QR scannable from paper |

**Network profiles**: Lighthouse Slow 4G for budgets; a throttled 3G run once for the pay page.

**Data**: generated demo workspaces for each vertical in preview and staging; one consented real pilot owner's data in production on days 7 and 10; never real data in lower environments.

**Exit criteria**: all acceptance tests green; zero open severity-1 or severity-2 bugs; device matrix passed by the human verifier on days 9–10 with evidence in Linear (D27); NFR budgets met; the go / no-go checklist in the Workflow tab, with CA and lawyer items as marked placeholders for the pilot (D92).

## Vendor and account checklist

Lead times are from general experience and vary, so confirm each with the provider. Accounts that need no company start now (D49); the rest wait for the company after Phase 2 (D43).

| Account | Needed for | Phase | Typical lead time | Start |
| --- | --- | --- | --- | --- |
| Domain biz4kit.com, DNS, TLS (D46, D47) | Everything | 1 | Hours | Day 1 |
| Google Cloud project, OAuth consent screen (external, verified) | Google sign-in | 1 | Hours; verification days to weeks if sensitive scopes are requested (avoid them) | Day 1 |
| Resend account, sending domain with SPF / DKIM / DMARC | Email | 1 | Hours; warm-up over a week for volume | Day 1 |
| AWS (ECR, ECS Fargate, API Gateway, S3, Terraform state bucket), Vercel, Neon, Upstash (D22, D28, D31, D33, D38, D39, D42) | Infra | 1 | Hours | Day 1 |
| Error tracking, analytics, uptime, status page | Observability | 1 | Hours | Day 2 |
| GitHub organisation, Linear workspace, Slack workspace | Workflow | 1 | Hours | Day 1 |
| Founder's phone as the support line (D8) | Human support | 1 | — | Day 2 |
| Meta Business verification and WhatsApp Business API access, template approval | WhatsApp automation | 2 | Days to several weeks | After Phase 2 (D49) |
| SMS provider (MSG91 / Twilio) and Indian sender / template registration | OTP, SMS | 2 | Days to weeks (regulatory registration) | After Phase 2 (D49) |
| Razorpay account and KYC | Customer payments | 2 | Days; depends on documents | After Phase 2 (D49) |
| Stripe account (confirm Indian eligibility first) | International payments | 2 | Unknown; may be restricted | After Phase 2 (D49) |
| Polar account (confirm service-business eligibility first) | Plan billing (D98), payments as merchant of record | 2 | Days | After Phase 2 (D49) |
| Claude API billing account and usage caps | AI ingest | 2 | Hours | Day 11 |
| Apple Developer and Google Play accounts | Native app | 3 | Days; Apple requires a legal entity | Week 4 |
| Company registration, GST, bank account | Charging money | before paid plans | Weeks | After Phase 2 (D43) |
| Trademark search and filing for the product name | Brand | after Phase 2 | Search: days; registration: months | After Phase 2, with the lawyer (D45) |

Each account is created with a shared company email, MFA on, and credentials in the secret store; no account lives under a personal login.
