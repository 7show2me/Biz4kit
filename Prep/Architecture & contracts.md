# Architecture & contracts

Oct 18, 2026 · @Ravin

One Next.js app serves the workspace and the customer portal, one API owns every rule, one Postgres with row-level security holds every workspace, and everything external (payments, email, messaging, AI) sits behind an adapter with a standalone fallback. This tab is the spec AI agents build from; the Data model section of Design inputs defines the entities it refers to.

## System architecture

&#91;embedded content: system architecture · 3 clients, 1 core, 4 adapters, external services by phase\]

Clients never talk to an external service directly; every call goes through the API and then an adapter, so a missing or disabled connector always lands on the Phase 1 fallback. In Phase 1 only the email adapter and Google OAuth have a real provider behind them.

## Services and modules

One deployable API, split into modules with an owner each; a module may only call another through its exported service, never its tables.

| Module | Owns | Exposes | Owner (fill in) |
| --- | --- | --- | --- |
| `auth` | Better Auth config, sessions, invites, roles, re-auth | `requireUser`, `requireRole`, invite service |  |
| `workspace` | Workspace, Member, brand theme generation, numbering settings | theme tokens, numbering allocator |  |
| `catalog` | CatalogItem, Package, CSV import, public catalog read model | item and package services, public page data |  |
| `leads` | Lead, portal request form, assignment | lead service, source tagging |  |
| `documents` | Quote and Invoice blocks, versions, totals, GST, QuoteLine snapshots, render model shared by web and PDF | quote service, invoice service, `renderDocument` |  |
| `payments` | Payment, proof files, approval queue, thresholds, receipts | payment service, approval service |  |
| `bookings` | Booking, availability, conflicts, Job, checklists | booking and job services |  |
| `customers` | Customer, timeline, My-orders tokens | customer service, timeline read model |  |
| `messages` | Templates, rendering, share logging, in-app inbox, notification routing | `notify(event, record)` |  |
| `exports` | PDF / DOCX / CSV jobs, storage, signed URLs | `export(record, format)` |  |
| `connectors` | Adapter registry, per-workspace settings, secrets, health | `getAdapter(kind, workspace)` |  |
| `admin` | Super-admin console, abuse controls, audit views | admin service |  |
| `jobs` | BullMQ queues: pdf, email, expiry, reminders (Phase 2), ingest (Phase 2) | queue names and payload schemas |  |

Shared packages: `db` (schema, migrations, RLS policies), `ui` (design system), `templates` (React templates for web and PDF), `connectors` (adapter interfaces and implementations).

## API contract

Internal calls use tRPC with shared types; the customer portal and Phase 3 public API use REST on the same services. Conventions first, then the Phase 1 surface.

**Conventions**

- Base `/api/v1`; JSON; UTC timestamps in ISO 8601; money as integer paise with a `currency` field.
- Auth: session cookie for members (Better Auth); `Authorization: Bearer <portal token>` for customer links; every request resolves a `workspace_id` or is rejected before any query.
- Errors: `{ error: { code, message, field? } }` with codes `unauthenticated`, `forbidden`, `not_found`, `validation`, `conflict`, `rate_limited`, `state` (invalid transition); HTTP status matches.
- Pagination: cursor-based, `?cursor=&limit=` (max 100); list responses return `{ items, next_cursor }`.
- Idempotency: `Idempotency-Key` header required on create and on any money or send action; replays return the first result.
- Rate limits: portal endpoints 60 requests per minute per IP and per token; member endpoints 600 per minute per workspace.
- Versioning: additive changes only within v1; a breaking change is v2.

**Phase 1 endpoints (members)**

| Method | Path | Does |
| --- | --- | --- |
| POST | `/workspaces` | Create workspace (onboarding step 2) |
| PATCH | `/workspaces/:id/brand` | Logos, colours; returns generated theme tokens and contrast warnings |
| POST | `/workspaces/:id/invites` · `/invites/:token/accept` | Invite, accept; invite code variant `POST /invites/claim` |
| GET/POST/PATCH | `/catalog/items`, `/catalog/items/:id` | Items with variants and add-ons; `POST /catalog/import` for CSV with a mapping preview |
| GET/POST/PATCH | `/packages`, `/packages/:id` | Packages and tiers |
| GET/POST/PATCH | `/leads`, `/leads/:id` · `POST /leads/:id/assign` | Leads inbox |
| POST | `/quotes` (from lead or package) · `PATCH /quotes/:id` (draft blocks) · `POST /quotes/:id/share` · `POST /quotes/:id/revise` | Quote lifecycle; share returns the private link and the ready message |
| POST | `/invoices` (from quote, job or manual) · `POST /invoices/:id/share` (assigns the number) · `POST /invoices/:id/void` | Invoice lifecycle |
| POST | `/invoices/:id/payments` (amount, method, proof files) · `POST /payments/:id/approve` · `POST /payments/:id/reject` | Record and approve payments; approve also accepts a signed email token |
| GET/POST/PATCH | `/bookings`, `/bookings/:id` · `GET /availability` | Calendar |
| GET/PATCH | `/jobs/:id` · `POST /jobs/:id/complete` | Jobs; complete creates the draft invoice |
| GET | `/customers`, `/customers/:id/timeline` | Customers |
| POST | `/records/:type/:id/share` | Logs a Message row and returns the rendered text for the chosen channel |
| POST | `/exports` · `GET /exports/:id` | Queue and fetch PDF / DOCX / CSV |
| GET | `/inbox` · `POST /inbox/:id/read` | In-app notifications |
| GET | `/reports/summary?from&to` | Reports v1 |

**Phase 1 endpoints (customer portal, token auth)**

| Method | Path | Does |
| --- | --- | --- |
| GET | `/p/:slug/catalog` | Public catalog read model (cacheable) |
| POST | `/p/:slug/requests` | Quote request → Lead (rate-limited, consent flag required) |
| GET | `/q/:token` · `POST /q/:token/accept` | Quote page and acceptance (name, phone, selected optional lines) |
| GET | `/book/:package/slots` · `POST /book/:package` | Booking picker |
| GET | `/i/:token` · `POST /i/:token/proof` | Invoice page, UPI deep link and QR, proof upload |
| GET | `/me/:token` | My orders |

**Webhooks (Phase 2, inbound)**: `/webhooks/:provider` with signature verification and an idempotency table; unmatched payment webhooks create a `pending_approval` Payment rather than failing silently.

## Connector adapter interface

Four adapter kinds, one registry. A workspace enables zero or more providers per kind; the API asks the registry for the best available adapter and always receives one, because the standalone fallback is itself an adapter.

| Kind | Interface (TypeScript sketch) | Fallback adapter (Phase 1) | Providers (Phase 2) |
| --- | --- | --- | --- |
| Payments | `createPaymentRequest(invoice) → { kind: 'link' \| 'static', url?, upi?, bank?, qr }`, `verifyWebhook(req)`, `reconcile(event) → Payment`, `refund?()` | `static-upi`: returns the UPI deep link, QR and bank block; reconciliation is the approval queue | `razorpay`, `stripe`, `polar` |
| Email | `send(template, to, data) → { id }`, `status(id)` | `mailto`: returns a ready message and logs it as shared; used only if Resend is down | `resend` (Phase 1 default), SES later |
| Messaging | `send(channel, template, to, data)`, `status(id)`, `inbound(req)` | `share-sheet`: returns the rendered text and a `wa.me` / `sms:` link | `whatsapp-business`, `msg91` |
| OTP | `start(phone) → { challenge }`, `verify(challenge, code)` | `link-possession`: the private link is the proof; no code | `msg91`, `twilio` |
| Ingest | `structure(file \| text, target) → { draft, confidence }` | `csv`: column mapping only | `claude` |

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
| `lead_created` | Portal request or manual entry | source (qr / web / instagram / referral / manual) | G2, G8 |
| `quote_shared` | First share of a quote | minutes\_since\_lead, from\_package | G2 |
| `quote_viewed` | First portal open, bots excluded | hours\_since\_share | G3 |
| `quote_accepted` | Customer accepts | version, hours\_since\_share, optional\_lines\_selected | G3 |
| `invoice_shared` | Number assigned and shared | from (quote / job / manual), total\_bucket | G4 |
| `payment_recorded` | Proof uploaded or cash recorded | method, has\_proof | G4 |
| `payment_approved` | Owner or Manager approves | hours\_since\_recorded, via (app / email) | G4 |
| `invoice_paid` | Invoice turns Paid | days\_since\_share | G4 |
| `booking_confirmed`, `job_completed` | As named | staff\_count | usage |
| `member_active_day` | First action of a member each day | role | G5 |
| `commitment_asked`, `commitment_answered` | Day-20 ask logged by the success buddy | answer (yes / no / later) | G6 |
| `signup_attributed` | Workspace created from a tagged link or the free-plan badge | channel | G7 |
| `template_shared` | Any ready message copied or shared | event number, channel | messages |
| `export_created` | PDF / DOCX / CSV | format, record type | usage |

Dashboards: one per GTM test with its pass line drawn; a daily snapshot posts to Slack #pilot. Event names are frozen once the pilot starts; new events are added, old ones never renamed.

## Acceptance criteria (Phase 1)

Each line becomes a test in the package's first commit and a checkbox in its Linear issue. The WBS "Done when" column is the summary; this is the contract.

| WBS | Given / when / then |
| --- | --- |
| 1.2 | Given a member of workspace A, when they query any table with B's ids, then zero rows and no error leak; given a migration, when run twice, then it is a no-op |
| 1.3 | Given a Google account, when it signs in on web and on the Expo shell, then one user, two sessions, both listed and individually revocable; given an invite to `a@x`, when `b@y` signs in, then the invite is visible to the owner, editable, and claimable with the invite code; given a billing or delete action, when the session is older than 15 minutes, then re-auth is required |
| 1.4 | Given two brand colours, when saved, then tokens exist for light and dark and every text-on-primary pair is ≥ 4.5:1 or the owner is warned and the colour adjusted |
| 1.6 | Given each notification event, when it fires, then exactly one email is sent to the right person with a working single-use link; given a bounce, then the member sees a warning in settings |
| 1.7 | Given airplane mode, when staff open today's bookings and jobs and draft a quote, then data is shown from cache, the draft is kept, and syncs on reconnect with a visible conflict banner if the server changed |
| 2.1 | Given a CSV with Vyapar headers, when imported, then columns are mapped with a preview and unmapped columns are listed; given a hidden-price item, when the portal renders, then price is replaced by "ask for a quote"; given a WhatsApp preview bot, when it fetches the catalog, then no analytics event fires |
| 2.3 | Given a quote edited on desktop and the same quote opened on a phone, when lines change on either, then totals match to the paisa and the PDF matches the web render pixel-for-pixel in the visual test |
| 2.4 | Given a shared quote, when the customer opens a forwarded link, then they can accept with name and phone and the acceptance stores version, IP and time; given an expired quote, when accept is attempted, then `state` error; given a revise, then the number is unchanged and version + 1 |
| 2.5 | Given 100 invoices shared in parallel, then numbers are gap-free and unique; given a draft, then no number; given customer state ≠ workspace state, then IGST; given a void, then the number is retained and the invoice is excluded from totals |
| 2.6 | Given a proof upload by staff, when the owner taps the email link, then the payment is approved once and the link is dead afterwards; given a Manager and an amount above the threshold, then approve is forbidden; given approval, then the invoice turns Paid and the receipt message is offered |
| 2.7 | Given every template and a sample record, when rendered, then no unresolved `{variable}` remains and WhatsApp length ≤ 60 words; given a share, then a Message row exists on the record |
| 2.8 | Given any quote or invoice, when exported, then PDF, DOCX and CSV are produced within 3 s (p95) and the DOCX opens in Word and Google Docs with the brand header intact |
| 2.9 | Given a new lead, when created, then the assignee gets one inbox item and one email; given the same event twice (idempotency replay), then still one |
| 3.1–3.3 | Given overlapping bookings for one member, then the second is refused with a conflict; given a job marked done with an incomplete required checklist, then refused; given done, then a draft invoice exists linked to the job |
| 3.4 | Given a customer's My-orders link, then every quote, booking, invoice and receipt of that customer and no other customer's |
| 3.5 | Given each role, when each endpoint is called, then the permission matrix holds (Staff cannot read reports or approve; Accountant is read-only); every mutation writes an ActivityLog row |
| 3.7–3.8 | Given a slug containing a reserved or bank-like word, then creation is refused; given an abuse report, then the workspace is flagged in the console within one request; given admin impersonation, then a consent log entry exists |
| 4.1 | Given the full suite, then it runs green in under 5 minutes; given Lighthouse on the four portal pages, then LCP ≤ 2.5 s under the NFR profile; given axe, then zero serious violations |
| 4.3 | Given the Expo shell, when installed on three Android phones and left a week, then the session is still valid and the share sheet opens WhatsApp with the message prefilled |

## Test plan and device matrix

**Scope by day**: unit and integration from day 1; end-to-end on previews from day 3; non-functional and security sweeps on days 8–9; a real-owner session on day 7 and day 10.

**Device matrix** (buy or borrow these before day 3)

| Device | Why | Browser | Flows |
| --- | --- | --- | --- |
| Mid-range Android, 4 GB RAM, Android 12–14 (Moto G / Redmi class) | The staff and customer phone | Chrome, WhatsApp in-app browser, Instagram in-app browser | All four flows, offline test, share sheet |
| Low-end Android, 2–3 GB RAM, Android 10–11 | Worst case customer | Chrome | Catalog, quote accept, pay page |
| iPhone (two versions back) | Owners and agency clients | Safari | Portal flows, PDF download |
| Laptop, Windows + Chrome; Mac + Safari | Owners in the evening | Chrome, Safari, Edge | Workspace, doc editor, exports |
| Printer | Invoices and QR cards are printed | — | PDF print at A4, QR scannable from paper |

**Network profiles**: Lighthouse Slow 4G for budgets; a throttled 3G run once for the pay page.

**Data**: generated demo workspaces for each vertical in preview and staging; one consented real pilot owner's data in production on days 7 and 10; never real data in lower environments.

**Exit criteria**: all acceptance tests green; zero open severity-1 or severity-2 bugs; device matrix passed by a human on days 9–10 with evidence in Linear; NFR budgets met; the go / no-go checklist in the Workflow tab.

## Vendor and account checklist

Start everything in the first column on day 1; lead times are from general experience and vary, so confirm each with the provider.

| Account | Needed for | Phase | Typical lead time | Start | Owner (fill in) |
| --- | --- | --- | --- | --- | --- |
| Domain, DNS, TLS | Everything | 1 | Hours | Day 1 |  |
| Google Cloud project, OAuth consent screen (external, verified) | Google sign-in | 1 | Hours; verification days to weeks if sensitive scopes are requested (avoid them) | Day 1 |  |
| Resend account, sending domain with SPF / DKIM / DMARC | Email | 1 | Hours; warm-up over a week for volume | Day 1 |  |
| Cloud hosting (Vercel / Fly.io), managed Postgres and S3-compatible storage in Mumbai | Infra | 1 | Hours | Day 1 |  |
| Error tracking, analytics, uptime, status page | Observability | 1 | Hours | Day 2 |  |
| GitHub organisation, Linear workspace, Slack workspace | Workflow | 1 | Hours | Day 1 |  |
| WhatsApp Business number for support | Human support | 1 | Days (number + app) | Day 2 |  |
| Meta Business verification and WhatsApp Business API access, template approval | WhatsApp automation | 2 | Days to several weeks | Day 1 |  |
| SMS provider (MSG91 / Twilio) and Indian sender / template registration | OTP, SMS | 2 | Days to weeks (regulatory registration) | Day 1 |  |
| Razorpay account and KYC | Payments, plan billing | 2 | Days; depends on documents | Day 1 |  |
| Stripe account (confirm Indian eligibility first) | International payments | 2 | Unknown; may be restricted | Day 1 |  |
| Polar account (confirm service-business eligibility first) | International billing as merchant of record | 2 | Days | Day 1 |  |
| Claude API billing account and usage caps | AI ingest | 2 | Hours | Day 11 |  |
| Apple Developer and Google Play accounts | Native app | 3 | Days; Apple requires a legal entity | Week 4 |  |
| Company registration, GST, bank account | Charging money | before Phase 2 billing | Weeks | Now |  |
| Trademark search and filing for the product name | Brand | before pilot | Search: days; registration: months | Now |  |

Each account is created with a shared company email, MFA on, and credentials in the secret store; no account lives under a personal login.
