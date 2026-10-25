# Biz4Kit — One-Page SaaS Outline

Rewritten 2026-10-24 to match `docs/decisions.md` (D1–D102) and the locked prototype `design/app/` (D94). Previous version: `prep/archive/2026-10-24/Outline.md`.

Oct 18, 2026 · @Ravin

## Overview

Biz4Kit is a white-label workspace for small businesses: one app that generates the catalog, replies to quoted leads (proforma invoices), invoices, service packages and payment requests, and runs them under the business's own name, colours and logo. It is a brand kit, not a CRM: the core is track leads, quick reply, quick invoice (D63), with four Quick jobs: Catalog, Reply, Invoice and Cashflow, money in only in Phase 1 (D77).

**Launch verticals:** salons, wholesalers selling on IndiaMART, restaurants, IT services, small manufacturers, and design agencies — businesses with 1–15 staff that currently juggle WhatsApp, Excel and a PDF invoice template. Starter kits ship for all six; the pilot recruits salons and design / IT agencies (D1). All product copy and message templates are in English.

**Three audiences, one workspace:**

- **Owner** sets up the brand and the generators once.
- **Team members** turn leads into replies, bookings, jobs and paid invoices.
- **Customers** browse the menu, request a quote, book and pay from a branded link, with no login needed.

## Problem & solution

A small business loses leads because pricing a request takes hours, and loses cash because invoices go out late and get chased by hand.

| Today | With Biz4Kit |
| --- | --- |
| Price list lives in a WhatsApp image or a stale PDF | Live branded catalog page, edited in minutes |
| Prices typed by hand, inconsistent | Priced reply (proforma `PI-`) built from catalog items, sent as a link; paying it is the acceptance (D60) |
| Invoice = Word template, payment = "please transfer" | Proforma `PI-`, numbered `INV-` when the payment is approved (D60, D71), with a UPI QR and a ready-to-send message; gateway links arrive in Phase 2 |
| Leads tracked in chat threads and memory | Leads inbox for the whole team, plus an optional Board: New → Replied → Booked → In service → Invoiced → Paid (D63, D65) |
| Generic tools that look like someone else's brand | Every page, PDF and email carries the business's name, logo and colours |

## Core generators

Four generators share one data model (D60): a catalog item is the unit, and every package, reply, invoice and payment request is built from items. There is no Quote record: the priced reply to a quoted lead is an invoice (D60). **Standard rule for Phase 1:** the only external services are Google sign-in and email (Resend). Every generator produces three things the business can use by hand: a shareable link, a PDF / document export, and a ready message (WhatsApp, SMS, email). Phase 1 sends email from the app; SMS and WhatsApp messages are copy and paste (D67). Email also carries notifications and approval links. Phase 2 connectors automate the same outputs; they never change them.

| Generator | Input | Output (Phase 1, standalone) | Phase 2 adds |
| --- | --- | --- | --- |
| **Catalog** | Items: name, photos, price, unit, category, MOQ (D87); optional model, serial and warranty fields (D85) | Public branded menu page, link + QR code, PDF menu, ready "here's our price list" message; CSV import | Variants and add-ons (D87); AI ingest: photo of a price list, PDF, Excel or doc → structured items |
| **Service Packages** | Bundle of items + fixed or tiered price (Basic / Standard / Premium), advance % (D66) | Package cards on the catalog, bookable directly, usable as the start of a reply | Monthly auto-charge via gateway mandates |
| **Reply** (proforma) | A quoted lead or a package: items, quantity, discounts, GST, optional lines, validity | Doc-style editor (edit lines and text in place, comments, version history); reply link, PDF, ready message; the customer ticks optional lines and pays on the page, paying is the acceptance (D60, D102); a reply with an advance % is the advance invoice, the balance follows (D70) | Auto-expiry reminders by email / WhatsApp |
| **Invoice** | A quoted lead, a completed job (draft made when the job is marked done, D88) or manual lines | GST invoice (link + PDF); record cash / direct-UPI payments; statuses Draft, Due, Part paid, Overdue, Waiting for approval, Paid (D55); `PI-` until the payment is approved, then `INV-` (D71, D90); an unpaid reply never goes overdue, it expires (D75); serial-numbered rows and warranty cards when the feature is on (D85, D86); ready reminder messages for the team to send from the Overdue payments page (D64) | Auto-sent reminders, recurring invoices, credit notes |
| **Payment request** | Invoice or advance amount | UPI deep link + QR (static, no gateway needed), bank details block, ready "please pay" message; team or customer uploads proof (PDF / image), an approver approves, status turns Paid | Razorpay / Stripe / Polar hosted links, auto-reconcile, payouts, receipts |

## Customer portal (no login)

Customers reach the business at `yourbrand.biz4kit.com` (D47) or a custom domain. Biz4Kit appears only as the "Made with Biz4Kit" footer on the catalog, request, booking and My orders pages; never on the pay page, the invoice PDF or the warranty card (D78, D89).

- **Browse menu** — catalog and packages by category, search, photos, prices, minimum order; mobile-first.
- **Request a quote** (D101) — pick items or describe the job, add photos and preferred dates; creates a quoted lead instantly, shown in the team inbox and emailed to the assignee (Phase 1); WhatsApp push in Phase 2.
- **Book** — choose a slot for a bookable package from the business's opening hours, up to two ranges a weekday, slots every 30 minutes that fit the package (D97, D99); creates a booked lead (D59).
- **Pay** — the reply or invoice page: tick optional lines (D102), pay by UPI QR / bank details, upload proof; shown as received once the business approves. Rejected or expired replies cannot be paid (D73). Phase 2: hosted gateway link, instant receipt.
- **My orders** — one private link per customer with all requests, bookings, invoices and receipts (magic link by email).
- **Warranty card** — when the business uses serial numbers, one private card per item with a serial, phone masked (D85, D86).

## Team workspace

Mobile web first (staff work from phones on site), with a Linear-style board, keyboard shortcuts and a command palette (⌘K) for the owner on a laptop. Lite mode by default; Board, Customers and Jobs are extras the owner switches on (D63). Sidebar sections: Home · Sales · Schedule · Payments · Business, Settings on its own (D80, D81, D83). The 38 screens are locked in `design/app/` (D94).

| Module | What the team does |
| --- | --- |
| **Leads** | Inbox of everything customers request: quoted leads (asked for a price) and booked leads (booked a slot) (D59); Accept / Edit / Reject a quoted lead, Assign + Confirm a booked one (D61, D62); statuses New, Contacted, Replied, Snoozed, Rejected, Paid (D66, D72); assign, priority normal / high (D87), notes, snooze; source tracking (QR, Instagram, website, referral) |
| **Bookings** | Calendar by staff member; statuses To confirm, Agreed, Cancelled (D68, D69, D100); drag to reschedule; conflict warnings; reminder message ready 24 h before (auto-sent in Phase 2) |
| **Jobs** (an extra) | Checklist per job, photos before / after, materials used (D87); mark done → draft invoice at once, then "Review and send" (D88). Time logged moves to Phase 2 (D87) |
| **Invoices & payments** | Generate, share, record cash / direct-UPI payments with a proof PDF or image; an approver approves before status turns Paid; part payments; Overdue payments page with one-tap Remind (D64); approve from the email link (D57, D87); gateway reconciliation in Phase 2 |
| **Messages & exports** | 16 ready messages (D93, D95) for every event (reply, reminder, payment request, booking confirmation, request declined) in English, in the brand's voice; copy, or share via WhatsApp / SMS / email (Phase 1 sends email only, D67); every document exports as PDF, DOCX or CSV |
| **Notifications** | In-app inbox behind the header bell: new leads, proofs to approve, overdue bills, bookings to confirm, jobs to invoice, replies expiring; unread and per-user mute (D87) |
| **Customers** (an extra) | Timeline of every request, booking, invoice and message; tags; repeat-business prompts; serial lookup when the feature is on (D85) |
| **Reports** | Revenue, conversion lead → paid, outstanding, top services, staff utilisation; export CSV |

**Roles:** Owner (brand, settings, payment approval, cancels issued invoices, all data) · Manager (everything except settings and billing; approves payments strictly below the limit the Owner sets, D57, D74) · Staff (own bookings and jobs, create replies and invoices) · Accountant (read-only plus export, D91). Activity log on every record.

## Branded workspaces (Linear-style)

Each business is a workspace: its own slug, members, data and brand.

- **Identity** — business name, logo (light + dark), contact details, GST / tax ID, opening hours (D97, D99).
- **Brand colours** — pick primary and accent; the app derives the full theme (buttons, links, tags, PDF headers, email headers) and checks contrast automatically. Customer pages use Inter (D34).
- **Applied everywhere** — catalog page, reply and invoice pages, PDFs, payment page, emails, ready messages, customer portal.
- **Domain** — `brand.biz4kit.com` (D47) free; custom domain on the Agency plan (Phase 3) with auto-SSL.
- **Document numbering** — custom prefixes for the two series, `PI-` (proforma) and `INV-` (tax invoice), gap-free, separate (D60, D71); terms and footer text, default taxes.
- **Workspace switcher** — one login, many workspaces (useful for agencies and franchise owners); invite by email; SSO later.
- **Dark / light** and keyboard-first UI, like Linear; brand colour tints both themes.

## Core flow

&#91;embedded content: core flow · 6 steps, customer and team alternating\]

Lead → Reply (proforma) → Booking → Job → Invoice → Paid (`docs/flow.html`). Every hand-off is a status change on the same record plus an email to whoever must act next (new lead to the assignee, proof waiting to the approver with an approve link, reply and invoice copies to the customer when an email is known). WhatsApp automation arrives in Phase 2; until then staff share the ready message by hand. Nothing is retyped between reply, booking, invoice and payment.

## Tech stack & architecture

Multi-tenant from day one: every row carries a `workspace_id`, enforced in the API layer and with Postgres row-level security. Phase 1 has two external dependencies: Google OAuth and transactional email (Resend). Code is generated by AI agents and verified by one human (D24, D27), so the plan is sized in days and names what a human must verify for each package.

| Layer | Choice | Phase | Why |
| --- | --- | --- | --- |
| Monorepo | pnpm workspaces + Turborepo (D37) | 1 | One repo for web, server, native and shared packages |
| Web app | TanStack Start (D30) (React, TypeScript), Tailwind, shadcn/ui; PWA with offline cache and local drafts; mobile-web first; hosted on Vercel (D22) | 1 | SEO-friendly public catalog; one codebase for portal and workspace |
| API | Hono with oRPC (D30), in Docker | 1 | Typed contracts shared with the web app |
| Mobile | Expo (React Native) shell with Google login and persistent session; in Phase 1 the phone is for viewing, sharing, uploading proof, marking jobs done and creating replies from packages via a form; full document editing is desktop / tablet only | 1 (shell), 3 (full) | Staff on Android get the jobs they need without a rich editor on a small screen |
| Auth | **Better Auth**, self-hosted on our Postgres: Google OAuth on web + mobile, persistent sessions with refresh and device list, pending invites visible to both owner and invitee, invite email editable, invite code fallback, re-auth before billing / deleting data | 1 | Standalone, no auth vendor; customers need no account (private links) |
| Email | **Resend** (one adapter, swappable): notifications to the team (new lead, proof waiting with approve / reject links), copies to customers who gave an email, email replies, confirmations and reminders (D67), invites, My-orders magic links; sender is the business name, reply-to the owner (D35) | 1 | The owner never has to open the app to learn something needs them |
| Database | PostgreSQL on Neon, AWS Mumbai, prod + staging branches and a branch per PR preview, point-in-time restore (D4); Drizzle (D36); row-level security per workspace; money in paise | 1 | Tenant isolation |
| Doc editor | Block editor (Tiptap / ProseMirror) for replies and invoices on desktop: edit in place, comments, versions; a form-style line editor with live preview on phone; the same blocks render the web page and the PDF | 1 | Invoices behave like a doc you edit, without fighting a block editor on Android |
| Files & exports | AWS S3, Mumbai, private buckets behind expiring signed URLs (D31); server-rendered PDF, DOCX and CSV from the same React templates | 1 | Everything leaves the app as a document the owner can use by hand |
| Messages | Template engine producing ready messages per event, in the brand's voice; share via OS share sheet, `wa.me` deep links, `mailto:` | 1 | WhatsApp and SMS work with zero API setup |
| Payments (standalone) | Static UPI deep link + QR, bank details block; proof upload, approval in-app or from the 48 h single-use email link; Manager approval below an Owner-set limit (D57, D74) | 1 | Gets money moving before any gateway contract |
| Admin & safety | Super-admin console (workspace lookup, suspend, support access); abuse controls on free subdomains (reserved names, report link, phishing-pattern checks); rate limits; known link-preview bots ignored when marking replies viewed | 1 | Public pages under our domain need policing from day one |
| Connectors | Razorpay, Stripe, Polar for customer payments; Polar for plan billing (D98); WhatsApp Business API; MSG91 / Twilio (OTP) — each behind one adapter; the business picks which to enable. Applications wait for the company, after Phase 2 (D43, D49) | 2 | Add vendors without touching generators |
| AI ingest | Claude API: photo of a price list, PDF, Excel, Word or a pasted message → structured catalog items, reply lines or customer records, reviewed before saving | 2 | Fastest onboarding path for a business with messy data |
| Theming | CSS variables generated from the workspace's brand colours; logo + colours per workspace, applied to web, PDF and messages | 1 | White-label without per-tenant builds |
| Infra | Backend (API + BullMQ workers) in Docker on AWS ECS Fargate, Mumbai (D28, D38), behind API Gateway HTTP API → VPC Link → Cloud Map, no load balancer (D42); Terraform with S3 state and locking (D39); BullMQ on Upstash Redis, free plan (D33); error tracking, funnel events, per-workspace audit log | 1 | One person can run it and see where a business is stuck |

**Key entities:** Workspace, Member, Customer, CatalogItem, Package, Lead, Booking, Job, Invoice (kind reply / advance / balance / bill; proforma `PI-` until paid, then tax `INV-`; linked to the lead, D60, D70), InvoiceLine (snapshot), Payment, Message.

## Pricing & business model

Per-workspace subscription with a free tier. Everything is free during the 10-day Phase 1 build and the pilot that follows (D98); paid plans switch on after the pilot with Polar as the billing provider (D98), once the company, GST registration and CA are in place (D43). Customer payments use Razorpay (default in India), Stripe or Polar; the business chooses which to enable. **The prices, user counts and limits below are starting assumptions in INR and stay open until the pricing decision after the pilot (B2.1).** Bookings and jobs ship in Phase 1 for everyone; whether they stay free after the pilot is a pricing decision, not a build decision.

| Plan | Price (assumption) | Users | Includes (assumption) |
| --- | --- | --- | --- |
| **Free** | ₹0 | 1 | Catalog, 10 replies + 10 invoices / month, UPI QR and manual payments, "Made with Biz4Kit" footer, `brand.biz4kit.com` (D47) link |
| **Starter** | ₹499 / month | 3 | Unlimited replies and invoices, custom colours and logo, no footer, gateway payment links, auto-reminders by email / WhatsApp |
| **Team** | ₹1,499 / month | 10 | Bookings and job tracking, packages, AI ingest, reports, roles, recurring invoices |
| **Agency** | ₹3,999 / month | 25 + | Multiple workspaces, custom domain, API, accounting sync, priority support, white-label emails from own domain |

**Other revenue:** payment-gateway revenue share, SMS / WhatsApp message packs, add-on marketplace later (accounting sync, review collection).

**Go-to-market:** QR codes on shop counters and Instagram bios drive customers to the catalog; the free plan's "Made with Biz4Kit" footer on catalog, request, booking and My orders pages (never on money pages, D89) lets each business show the product to its peers.

## MVP scope & roadmap

Phase 1 is the whole product running standalone, built in 10 days from Monday 2026-10-19 (D25): AI agents generate the code and one human runs the verification loop on every package (tests, review, a real device; GST checked by a CA once engaged, D23, D92). External services are limited to Google sign-in and email. Phase 2 takes another 10 days to add connectors behind adapters plus AI ingest; nothing a connector does is new, it only automates a Phase 1 export. The human verification loop, not code writing, is the bottleneck; the WBS names what must be verified for each package.

&#91;embedded content: roadmap · 3 phases, 2 gates\]

**Decisions taken** (full list in `docs/decisions.md`)

- Name: **Biz4Kit**, domain biz4kit.com (D5, D46, D47); trademark filing waits for the lawyer (D45)
- Verticals: starter kits for all six; pilots in salons and design / IT agencies (D1); the five non-salon kits are drafted by Claude and approved by the owner (D96)
- Language: English only for the product and all message templates
- Timeline: Phase 1 in 10 days, Phase 2 in 10 days, AI-generated code with one human verifier (D24, D27)
- No Quote record: a reply is a proforma `PI-`, paying is the acceptance, `INV-` on approval for every vertical (D60, D71, D90)
- Email is in Phase 1: notifications, approval links, invites, customer copies, email replies, confirmations and reminders; SMS and WhatsApp are copy and paste (D67)
- Phone in Phase 1: view, share, upload proof, mark done, reply-from-package form; full document editing on desktop / tablet only
- Offline payments: any member except the Accountant uploads proof (D91); the Owner approves in-app or from the email link; Managers approve strictly below an Owner-set limit (D57, D74)
- Invites: pending invites are visible to the owner and to the invitee; the owner can edit the email; an invite code is the fallback when the Gmail differs
- No paid plan during Phase 1 and the pilot; Polar for plan billing afterwards (D98)
- Company, CA, lawyer, gateways, SMS DLT and WhatsApp wait until Phase 2 is complete (D23, D43, D49); the pilot gate passes with CA and lawyer placeholders visibly marked (D92)
- Support line for the pilot: the founder's phone (D8)

Internal feature name: **Apna Pradhan** is the helper layer (remembers, reminds, speaks for the owner, guards the money). It is used by the team, not shown to customers; the product name stays Biz4Kit. Details in the Market fit & sales tab.

## Gaps now in scope

Each of these was missing from the first plan and now has a WBS line.

| Gap | Resolution | WBS |
| --- | --- | --- |
| No notifications in Phase 1 | Email (Resend) + in-app inbox with per-user mute for new lead, proof waiting, booking, invite (D87) | 1.6, 2.9 |
| Approval stalls when the owner is away | Approve / reject from the email link (48 h, single use); Manager limit (D57, D87) | 2.6 |
| Rich editor on Android | Phone gets a form editor + preview; doc editor on desktop | 2.3 |
| Offline required by NFRs but unplanned | PWA cache, local drafts, sync with conflict rules | 1.7 |
| No mobile shell | Expo shell with Google login and persistent session | 4.3 |
| No super-admin console | Workspace lookup, suspend, support access, audit | 3.7 |
| Free subdomains open to phishing | Reserved names, report link, pattern checks, takedown flow | 3.8 |
| No marketing site, terms, privacy, help | One-page site, legal pages (marked drafts, D92), in-app help, first-run checklist (D87) | 3.9, 3.11 |
| No go-to-market work | GTM verification plan below; pilot recruitment is a WBS line | 4.4 |
| Invoice numbering and drafts | `PI-` until the payment is approved, then the next `INV-` (D60, D71); drafts unnumbered; gap-free | data model |
| Partially paid invoice could not go overdue | Part paid status, then Overdue past the due date (D55) | data model |
| Proforma invoice missing (wholesalers) | Every reply is a proforma `PI-`; `PI-` and `INV-` are separate series (D60) | data model |
| Serial numbers and warranty for goods | Optional feature: model, serial, batch, warranty / guarantee rows and cards (D85, D86) | 2.1, 2.5 |
| E-way bills for goods above ₹50,000 | Out of scope for Phase 1; accountant review and decision in Phase 2 | 6.4 |
| Link previews mark replies "viewed" | Known preview bots ignored | 3.8 |
| Google-only login lock-out | Invite visibility, editable email, invite code; owner can transfer ownership | 1.3 |
| No cost model | Per-workspace cost sheet (email, storage, Claude API, gateway fees) | B1.2 |

## Go-to-market verification

The pilot is an experiment with pass / fail numbers, run in the 20 days after Phase 1 ships, in the two chosen verticals (D1). Thresholds are planning assumptions.

| # | Hypothesis | How we test | Pass | Fail → action |
| --- | --- | --- | --- | --- |
| G1 | Owners will set up and share a branded catalog without help | Onboard 20 businesses (10 salons, 10 design / IT agencies, D1) from personal outreach, Nashik first | ≥ 60% share the catalog link or QR within 24 h | Shorten Flow 1; add phone-call onboarding |
| G2 | Replies get sent faster than today | Time from lead to first reply, measured in-app | Median under 10 minutes for ≥ 50% of workspaces | Fix the reply editor before anything else |
| G3 | Customers pay the reply, which is the acceptance (D60) | Paid / shared replies | ≥ 30% paid within validity | Study rejected and expired replies; test trust cues |
| G4 | UPI QR + proof + approval is enough to get paid | Invoices paid and approved | ≥ 50% of invoices paid within 7 days; approval under 24 h | Move gateway links forward in Phase 2 |
| G5 | Teams keep using it | Weekly active workspaces in weeks 2–3 | ≥ 60% | Interview churned workspaces; cut scope |
| G6 | They will pay | Ask every pilot owner for a ₹499 / month commitment at day 20 | ≥ 8 of 20 say yes | Reprice or move the free / paid line |
| G7 | The free footer brings new businesses | Sign-ups attributed to "Made with Biz4Kit" links | ≥ 5 organic sign-ups by day 30 | Add a referral incentive |
| G8 | QR on the counter is a lead channel | Leads with source = QR per workspace | ≥ 3 per salon per week | Redesign the QR card and placement |

Channels to test in parallel: WhatsApp referrals from pilot owners, IndiaMART seller groups, Instagram DMs to salons, a QR counter-card kit. Each channel gets a tagged sign-up link so G7 and G8 can be attributed.

## Risks & responses

| Risk | Likelihood | Response |
| --- | --- | --- |
| 10-day timeline slips because human verification cannot keep up with generated code | High | Verification is scheduled per package in the WBS; anything unverified by day 9 is cut from the pilot, not shipped |
| One human verifier is a single point of failure | Medium | The agent runs automated pre-checks first (axe, contrast, Lighthouse, screenshots); the human only signs off (D48) |
| Owner approval becomes a bottleneck | Medium | Email approve links in Phase 1; Manager limit (D57); gateway auto-reconcile in Phase 2 |
| Stripe or Polar refuse service businesses in India | Medium | All three adapters are built; each business enables what works for it; Razorpay is the default |
| A customer disputes what they paid for | Low–medium | Paying the reply is the acceptance (D60); the approved payment, the proof and the exact `PI-` version are on record (D76) |
| Google-only login locks someone out | Medium | Visible invites, editable email, invite code, ownership transfer; second provider in Phase 2 if needed |
| Phishing on free subdomains harms the brand | Medium | Abuse controls from day one; report link on every public page |
| WhatsApp Business verification takes weeks | High | The Meta application waits until after Phase 2 (D49); Phase 1 never depends on it |
| GST or e-way bill errors on invoices | Medium | CA placeholders stay marked until a CA reviews sample invoices, before paid plans (D23, D92); e-way bill decision in Phase 2 |
| No company, CA or lawyer during the pilot | Accepted | Deferred until Phase 2 is complete (D43); no paid plans or live gateways until then |
| Six verticals dilute the pilot | Medium | Kits for all six, pilots in two (D1) |
| No revenue in the first 20 days | Accepted | Free by design; G6 tests willingness to pay before billing is built |

Work breakdown structure with effort and dependencies: WBS

Documents to read before design: Design inputs

Market fit, moat, sales team and emotional selling: Market fit & sales

Build workflow, security, PII and the final go / no-go gate: Workflow & final verification

Architecture, API contract, adapters, acceptance criteria, test plan and vendor checklist: Architecture & contracts

Legal and compliance drafts for lawyer and CA review: Legal & compliance

Business plan, unit economics, pilot tracker, support, CA programme and hiring: Business plan
