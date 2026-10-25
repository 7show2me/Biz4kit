# Biz4Kit — One-Page SaaS Outline

Oct 18, 2026 · @Ravin

## Overview

Biz4Kit is a white-label operating workspace for small businesses: one app that generates the catalog, ~~quotes~~ replies to quoted leads (D60), invoices, service packages and payment requests, and runs them under the business's own name, colours and logo.

**Launch verticals:** salons, wholesalers selling on IndiaMART, restaurants, IT services, small manufacturers, and design agencies — businesses with 1–15 staff that currently juggle WhatsApp, Excel and a PDF invoice template. All product copy and message templates are in English.

**Three audiences, one workspace:**

- **Owner** sets up the brand and the generators once.
- **Team members** convert leads into bookings, services and paid invoices.
- **Customers** browse the menu, request a quote, book and pay from a branded link, with no login needed.

## Problem & solution

A small business loses leads because quoting takes hours, and loses cash because invoices go out late and get chased by hand.

| Today                                                | With BizKit                                                                                                          |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Price list lives in a WhatsApp image or a stale PDF  | Live branded catalog page, edited in minutes                                                                         |
| Quotes typed by hand, inconsistent pricing           | ~~Quote built from catalog items + rules, sent as a link, accepted with one tap~~ Priced reply (proforma `PI-`) built from catalog items + rules, sent as a link; paying it is the acceptance (D60) |
| Invoice = Word template, payment = "please transfer" | ~~Accepted quote becomes a numbered invoice~~ Proforma (`PI-`), numbered `INV-` when the payment is approved (D60), with a UPI QR and a ready-to-send message; gateway links arrive in Phase 2 |
| Leads tracked in chat threads and memory             | ~~Lead → Quote → Booking → Service → Paid pipeline~~ New → Replied → Booked → In service → Invoiced → Paid board (D65), visible to the whole team                                          |
| Generic tools that look like someone else's brand    | Every page, PDF and email carries the business's name, logo and colours                                              |

## Core generators

~~Five~~ Four generators (D60) share one data model: a catalog item is the unit, and every ~~quote,~~ package, invoice and payment request is built from items. **Standard rule for Phase 1:** the only external services are Google sign-in and email (Resend). Every generator produces three things the business can use by hand: a shareable link, a PDF / document export, and a pre-written message (WhatsApp, SMS, email) the team copies or shares with one tap (Phase 1 sends email from the app; SMS and WhatsApp are copy and paste, D67); email also carries notifications and approval links. Phase 2 connectors automate the same outputs; they never change them.

| Generator            | Input                                                                            | Output (Phase 1, standalone)                                                                                                                                                                    | Phase 2 adds                                                              |
| -------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Catalog**          | Items: name, photo, price, unit (hr / piece / sqft), category, variants, add-ons | Public branded menu page, link + QR code, PDF menu, copy-ready "here's our price list" message; CSV import                                                                                      | AI ingest: photo of a price list, PDF, Excel or doc → structured items    |
| ~~**Custom Quote**~~ Reply (proforma `PI-`, from the Invoice generator, D60) | Picked items or a package, quantity, discounts, GST, notes, validity date        | Doc-style editor (edit lines and text in place, comments, version history, like editing a doc here); ~~quote link~~ reply link (D60), PDF, pre-written send message; ~~customer accepts on the link with their name~~ paying is the acceptance (D60) | ~~OTP-verified acceptance,~~ (D60) auto-expiry reminders by email / WhatsApp        |
| **Service Packages** | Bundle of items + fixed or tiered price (Basic / Standard / Premium)             | Package cards on the catalog, bookable directly, usable as the starting point of a ~~quote~~ reply (D60)                                                                                                        | Monthly auto-charge via gateway mandates                                  |
| **Invoice**          | ~~Accepted quote~~ Quoted lead (D60), completed job or manual lines                                    | Numbered, GST-compliant invoice (link + PDF); record cash / direct-UPI payments; ~~status Draft → Sent → Paid → Overdue~~ status Draft, Due, Part paid, Overdue, Waiting for approval, Paid (D55); `PI-` until the payment is approved, then `INV-` (D71); an unpaid `PI-` expires, it never goes overdue (D75); advance and balance are two invoices (D70); pre-written reminder messages at +3 / +7 / +14 days for the team to send, from the Overdue payments page (D64) | Auto-sent reminders, recurring invoices, credit notes                     |
| **Payment request**  | Invoice or deposit amount                                                        | UPI deep link + QR (static, no gateway needed), bank details block, pre-written "please pay" message; team uploads proof (PDF / image), owner approves, status turns Paid                       | Razorpay / Stripe / Polar hosted links, auto-reconcile, payouts, receipts |

## Customer portal (no login)

Customers reach the business at ~~`yourbrand.biz4kit.app`~~ `yourbrand.biz4kit.com` (D47) or a custom domain and ~~never see the Biz4Kit name~~ see Biz4Kit only in the "Made with Biz4Kit" footer (D78).

- **Browse menu** — catalog and packages by category, search, photos, prices; mobile-first.
- **Ask for a quote** — pick items or describe the job, add photos, preferred dates and location; creates a lead instantly, shown in the team inbox and emailed to the assignee (Phase 1); WhatsApp push in Phase 2.
- ~~**Accept** — open the quote link, choose optional items, accept with name + phone (the private link is the proof in Phase 1; OTP verification in Phase 2).~~ No Accept step: the reply is a proforma on the pay page and paying it is the acceptance; rejected or expired replies cannot be paid (D60, D73).
- **Book** — choose a slot from the team's availability for packages that are bookable directly.
- **Pay** — Phase 1: UPI QR / bank details on the invoice, upload proof (PDF or image), owner approves and marks paid. Phase 2: hosted gateway link, instant receipt.
- **My orders** — one private link per customer with all ~~quotes,~~ (D60) bookings, invoices and receipts (emailed magic links in Phase 2).

## Team workspace

The team sees ~~one pipeline: **Lead → Quoted → Booked → In service → Invoiced → Paid**~~ one Board, an extra the owner switches on (D63): **New → Replied → Booked → In service → Invoiced → Paid** (D65). Mobile web first (staff work from phones on site), with a Linear-style board, keyboard shortcuts and a command palette (⌘K) for the owner on a laptop.

| Module                  | What the team does                                                                                                                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Leads**               | ~~Inbox of quote requests and form fills~~ Inbox of everything customers request: quoted leads (asked for a price) and booked leads (booked a slot) (D59); Accept / Edit / Reject a quoted lead, Assign + Confirm a booked one (D61, D62); statuses New, Contacted, Replied, Snoozed, Rejected, Paid (D66); assign owner, set priority, add notes, snooze; source tracking (QR, Instagram, website, referral)                                                                                                  |
| ~~**Quotes**~~          | ~~Generate from a lead or a package, edit as a doc, duplicate, share; see opened / accepted / expired; follow-up nudges~~ No Quotes module: the reply to a quoted lead is a proforma invoice (`PI-`) made from the lead (D60) |
| **Bookings**            | Calendar by staff member; drag to reschedule; conflict warnings; reminder message ready 24 h before (auto-sent in Phase 2)                                                                                                                 |
| **Services / Jobs** (an extra, D63) | Checklist per job, photos before / after, time logged, materials used; mark complete → auto-creates invoice                                                                                                                                |
| **Invoices & payments** | Generate, share, record cash / direct-UPI payments with a proof PDF or image; owner approves before status turns Paid; partial payments, ~~overdue list~~ Overdue payments page with one-tap Remind (D64); gateway reconciliation in Phase 2                                                   |
| **Messages & exports**  | Every event has a pre-written message (~~new quote~~ reply to a lead (D60), reminder, payment request, booking confirmation) in English, in the brand's voice; copy, or share via the WhatsApp / SMS / email share sheet (Phase 1 sends email from the app; SMS and WhatsApp are copy and paste, D67); every document exports as PDF, DOCX or CSV |
| **Customers** (an extra, D63) | Timeline of every ~~quote,~~ (D60) booking, invoice and message; tags; repeat-business prompts                                                                                                                                                       |
| **Reports**             | Revenue, conversion lead→paid, outstanding, top services, staff utilisation; export CSV                                                                                                                                                    |

**Roles:** Owner (billing, brand, payment-proof approval, all data) · Manager (everything except billing) · Staff (own bookings and jobs, create ~~quotes and~~ (D60) invoices) · Accountant (read-only finance + export). Activity log on every record.

## Branded workspaces (Linear-style)

Each business is a workspace: its own slug, members, data and brand; BizKit is invisible to the customer.

- **Identity** — business name, logo (light + dark), favicon, tagline, contact details, GST / tax ID.
- **Brand colours** — pick primary and accent; the app derives the full theme (buttons, links, tags, PDF headers, email headers) and checks contrast automatically.
- **Applied everywhere** — catalog page, ~~quote and~~ (D60) invoice pages, PDFs, payment page, emails, WhatsApp templates, customer portal.
- **Domain** — ~~`brand.biz4kit.app`~~ `brand.biz4kit.com` (D47) free; custom domain (`quotes.yourbrand.com`) on the Agency plan (Phase 3) with auto-SSL.
- **Document numbering** — custom prefixes (`INV-2026-001`, ~~`QT-`~~ `PI-` (D60)), terms and footer text, default taxes and currency.
- **Workspace switcher** — one login, many workspaces (useful for agencies and franchise owners); invite by email; SSO later.
- **Dark / light** and keyboard-first UI, like Linear; brand colour tints both themes.

## Core flow

&#91;embedded content: core flow · 6 steps, customer and team alternating\]

Every hand-off is a status change on the same record plus an email to whoever must act next (new lead to the assignee, proof waiting to the owner with an approve link, ~~quote and~~ (D60) invoice copies to the customer when an email is known). WhatsApp automation arrives in Phase 2; until then staff share the ready message by hand. Nothing is retyped between ~~quote~~ reply (D60), booking, invoice and payment.

## Tech stack & architecture

Multi-tenant from day one: every row carries a `workspace_id`, enforced in the API layer and with Postgres row-level security. Phase 1 has two external dependencies: Google OAuth and transactional email (Resend). Most code is generated by AI agents and verified by humans in a review loop, so the plan is sized in days and names what a human must verify for each package.

| Layer                 | Choice                                                                                                                                                                                                                                                               | Phase               | Why                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------- |
| Web app               | ~~Next.js~~ TanStack Start (D30) (React, TypeScript), Tailwind, shadcn/ui; PWA with offline cache and local drafts; mobile-web first                                                                                                                                                          | 1                   | SEO-friendly public catalog; one codebase for portal and workspace              |
| Mobile                | Expo (React Native) shell with Google login and persistent session; in Phase 1 the phone is for viewing, sharing, uploading proof, marking jobs done and creating ~~quotes~~ replies (D60) from packages via a form; full document editing is desktop / tablet only                    | 1 (shell), 3 (full) | Staff on Android get the jobs they need without a rich editor on a small screen |
| Auth                  | **Better Auth**, self-hosted on our Postgres: Google OAuth on web + mobile, persistent sessions with refresh and device list, pending invites visible to both owner and invitee, invite email editable, invite code fallback, re-auth before billing / deleting data | 1                   | Standalone, no auth vendor; customers need no account (private links)           |
| Email                 | **Resend** (one adapter, swappable): notifications to team (new lead, proof waiting with approve / reject links, ~~quote accepted~~ (D60)), copies to customers who gave an email, email replies, confirmations and reminders to customers (D67), invites, magic links for My-orders                                                          | 1                   | The owner never has to open the app to learn something needs them               |
| Database              | PostgreSQL on Neon, Mumbai (D4) (~~Drizzle / Prisma~~ Drizzle, D36), row-level security per workspace                                                                                                                                                                                                      | 1                   | Tenant isolation; JSONB for catalog variants                                    |
| Doc editor            | Block editor (Tiptap / ProseMirror) for ~~quotes and~~ (D60) invoices on desktop: edit in place, comments, versions; a form-style line-item editor with live preview on phone; the same blocks render the web page and the PDF                                                 | 1                   | ~~Quotes~~ Invoices (D60) behave like a doc you edit, without fighting a block editor on Android   |
| Files & exports       | S3-compatible storage (Mumbai region); server-rendered PDF, DOCX and CSV from the same React templates                                                                                                                                                               | 1                   | Everything leaves the app as a document the owner can use by hand               |
| Messages              | Template engine producing pre-written messages per event, in the brand's voice; share via OS share sheet, `wa.me` deep links, `mailto:`                                                                                                                              | 1                   | WhatsApp and SMS work with zero API setup                                       |
| Payments (standalone) | Static UPI deep link + QR, bank details block; proof upload, owner approval (email link or in-app), optional threshold below which a Manager may approve                                                                                                             | 1                   | Gets money moving before any gateway contract                                   |
| Admin & safety        | Super-admin console (workspace lookup, suspend, support access); abuse controls on free subdomains (reserved names, report link, phishing-pattern checks); rate limits; known link-preview bots ignored when marking ~~quotes~~ replies (D60) viewed                                   | 1                   | Public pages under our domain need policing from day one                        |
| Connectors            | Razorpay, Stripe, Polar for customer payments and plan billing; WhatsApp Business API; MSG91 / Twilio (OTP) — each behind one adapter; the business picks which providers to enable                                                                                  | 2                   | Add vendors without touching generators                                         |
| AI ingest             | Claude API: photo of a price list, PDF, Excel, Word or a pasted message → structured catalog items, ~~quote~~ reply (D60) lines or customer records, reviewed before saving                                                                                                          | 2                   | Fastest onboarding path for a business with messy data                          |
| Theming               | CSS variables generated from the workspace's brand colours; logo + colours per workspace, applied to web, PDF and messages                                                                                                                                           | 1                   | White-label without per-tenant builds                                           |
| Infra                 | Vercel ~~/ Fly.io + managed Postgres~~ (web, D22) + Docker on AWS ECS Fargate, Mumbai (D28, D38) + Neon Postgres (D4); background jobs (BullMQ) for PDF generation and email; error tracking, funnel events, per-workspace audit log                                                                                                                    | 1                   | Small team can run it and see where a business is stuck                         |

**Key entities:** Workspace, Member, Customer, CatalogItem, Package, Lead, ~~Quote,~~ Booking, Job, Invoice (proforma `PI-` or tax `INV-`, linked to the lead, D60), Payment, Message.

## Pricing & business model

Per-workspace subscription with a free tier. Everything is free during the 10-day Phase 1 build and the pilot that follows; paid plans switch on with Phase 2 plan billing on all three providers, Razorpay (default in India), Stripe and Polar (merchant of record internationally); the business chooses which to enable. Prices are starting assumptions in INR; adjust after the pilot. Bookings and jobs ship in Phase 1 for everyone; whether they stay free after the pilot is a pricing decision, not a build decision.

| Plan        | Price          | Users | Includes                                                                                                                    |
| ----------- | -------------- | ----- | --------------------------------------------------------------------------------------------------------------------------- |
| **Free**    | ₹0             | 1     | Catalog, 10 quotes + 10 invoices / month, UPI QR and manual payments, Biz4Kit badge, ~~`brand.biz4kit.app`~~ `brand.biz4kit.com` (D47) link               |
| **Starter** | ₹499 / month   | 3     | Unlimited quotes and invoices, custom colours and logo, no badge, gateway payment links, auto-reminders by email / WhatsApp |
| **Team**    | ₹1,499 / month | 10    | Bookings and job tracking, packages, AI ingest, reports, roles, recurring invoices                                          |
| **Agency**  | ₹3,999 / month | 25 +  | Multiple workspaces, custom domain, API, accounting sync, priority support, white-label emails from own domain              |

**Other revenue:** payment-gateway revenue share, SMS / WhatsApp message packs, add-on marketplace later (accounting sync, review collection).

**Go-to-market:** QR codes on shop counters and Instagram bios drive customers to the catalog; every ~~quote and~~ (D60) invoice carries a subtle "Made with Biz4Kit" link on the free plan, so each business markets the product to its peers.

## MVP scope & roadmap

Phase 1 is the whole product running standalone, built in 10 days: AI agents generate the code in parallel and humans run a verification loop on every package (tests, review, a real device, an accountant for GST). External services are limited to Google sign-in and email. Phase 2 takes another 10 days to add connectors behind adapters plus AI ingest; nothing a connector does is new, it only automates a Phase 1 export. The human verification loop, not code writing, is the bottleneck; the WBS names what must be verified for each package.

&#91;embedded content: roadmap · 3 phases, 2 gates\]

**Decisions taken**

- Name: **Biz4Kit** (domain available)
- Launch verticals: salons, IndiaMART wholesalers, restaurants, IT services, small manufacturers, design agencies; engineering builds all six starter kits, the Biz4Kit team picks two to recruit pilots in (~~recommended: salons and IndiaMART wholesalers~~ chosen: salons and design / IT agencies, D1)
- Language: English only for the product and all message templates
- Timeline: Phase 1 in 10 days, Phase 2 in 10 days, AI-generated code with a human verification loop
- Email is in Phase 1: notifications, approval links, invites, customer copies; the app sends email replies, confirmations and reminders, SMS and WhatsApp are copy and paste (D67)
- Phone in Phase 1: view, share, upload proof, mark done, ~~quote-from-package~~ reply-from-package (D60) form; full document editing on desktop / tablet only
- Plan billing and payments: Razorpay, Stripe and Polar, all built, behind one adapter; each business enables the providers it wants
- Offline payments: any team member uploads proof (PDF or image); the owner approves in-app or from the email link; an optional amount threshold lets a Manager approve small payments
- Invites: pending invites are visible to the owner and to the invitee; the owner can edit the email; an invite code is the fallback when the Gmail differs
- No paid plan during Phase 1 and the pilot

Internal feature name: **Apna Pradhan** is the helper layer (remembers, reminds, speaks for the owner, guards the money). It is used by the team, not shown to customers; the product name stays Biz4Kit. Details in the Market fit & sales tab.

## Gaps now in scope

Each of these was missing from the first plan and now has a WBS line.

| Gap                                         | Resolution                                                                        | WBS        |
| ------------------------------------------- | --------------------------------------------------------------------------------- | ---------- |
| No notifications in Phase 1                 | Email (Resend) + in-app inbox for new lead, proof waiting, ~~quote accepted~~ (D60), invite | 1.6, 2.9   |
| Approval stalls when the owner is away      | Approve / reject links in the email; Manager threshold                            | 2.6        |
| Rich editor on Android                      | Phone gets a form editor + preview; doc editor on desktop                         | 2.3        |
| Offline required by NFRs but unplanned      | PWA cache, local drafts, sync with conflict rules                                 | 1.7        |
| No mobile shell                             | Expo shell with Google login and persistent session                               | 4.3        |
| No super-admin console                      | Workspace lookup, suspend, support access, audit                                  | 3.7        |
| Free subdomains open to phishing            | Reserved names, report link, pattern checks, takedown flow                        | 3.8        |
| No marketing site, terms, privacy, help     | One-page site, legal pages, in-app help                                           | 3.9        |
| No go-to-market work                        | GTM verification plan below; pilot recruitment is a WBS line                      | 4.4        |
| Invoice numbering and drafts                | ~~Number assigned at first share~~ `PI-` until the payment is approved, then the next `INV-` (D60, D71); drafts unnumbered; gap-free after                 | data model |
| Partially paid invoice could not go overdue | State machine fixed                                                               | data model |
| Proforma invoice missing (wholesalers)      | ~~Quote can be issued as a proforma with its own prefix~~ Every reply is a proforma `PI-`; `PI-` and `INV-` are separate series (D60)                             | data model |
| E-way bills for goods above ₹50,000         | Out of scope for Phase 1; accountant review and decision in Phase 2               | 6.4        |
| Link previews mark ~~quotes~~ replies (D60) "viewed"          | Known preview bots ignored                                                        | 3.8        |
| Google-only login lock-out                  | Invite visibility, editable email, invite code; owner can transfer ownership      | 1.3        |
| No cost model                               | Per-workspace cost sheet (email, storage, Claude API, gateway fees)               | 4.5        |

## Go-to-market verification

The pilot is an experiment with pass / fail numbers, run in the 20 days after Phase 1 ships, in the two chosen verticals.

| #   | Hypothesis                                                  | How we test                                                                                      | Pass                                                      | Fail → action                             |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | ----------------------------------------- |
| G1  | Owners will set up and share a branded catalog without help | Onboard 20 businesses (10 salons, ~~10 IndiaMART wholesalers~~ 10 design / IT agencies, D1) from personal outreach, Nashik first | ≥ 60% share the catalog link or QR within 24 h            | Shorten Flow 1; add phone-call onboarding |
| G2  | ~~Quotes~~ Replies (D60) get sent faster than today                           | Time from lead to first ~~quote~~ reply (D60), measured in-app                                                   | Median under 10 minutes for ≥ 50% of workspaces           | Fix the ~~quote~~ reply (invoice) editor (D60) before anything else |
| G3  | Customers ~~accept on the page~~ pay the reply, which is the acceptance (D60)                                | ~~Accepted / shared quotes~~ Paid / shared replies (D60)                                                                         | ≥ 30% acceptance within validity                          | Study ~~declined quotes~~ rejected and expired replies (D60); test trust cues    |
| G4  | UPI QR + proof + approval is enough to get paid             | Invoices paid and approved                                                                       | ≥ 50% of invoices paid within 7 days; approval under 24 h | Move gateway links forward in Phase 2     |
| G5  | Teams keep using it                                         | Weekly active workspaces in weeks 2–3                                                            | ≥ 60%                                                     | Interview churned workspaces; cut scope   |
| G6  | They will pay                                               | Ask every pilot owner for a ₹499 / month commitment at day 20                                    | ≥ 8 of 20 say yes                                         | Reprice or move the free / paid line      |
| G7  | The free badge brings new businesses                        | Sign-ups attributed to "Made with Biz4Kit" links                                                 | ≥ 5 organic sign-ups by day 30                            | Add a referral incentive                  |
| G8  | QR on the counter is a lead channel                         | Leads with source = QR per workspace                                                             | ≥ 3 per salon per week                                    | Redesign the QR card and placement        |

Channels to test in parallel: WhatsApp referrals from pilot owners, IndiaMART seller groups, Instagram DMs to salons, a QR counter-card kit. Each channel gets a tagged sign-up link so G7 and G8 can be attributed.

## Risks & responses

| Risk                                                                                | Likelihood | Response                                                                                                          |
| ----------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| 10-day timeline slips because human verification cannot keep up with generated code | High       | Verification is scheduled per package in the WBS; anything unverified by day 9 is cut from the pilot, not shipped |
| Owner approval becomes a bottleneck                                                 | Medium     | Email approve links in Phase 1; Manager threshold; gateway auto-reconcile in Phase 2                              |
| Stripe or Polar refuse service businesses in India                                  | Medium     | All three adapters are built; each business enables what works for it; Razorpay is the default                    |
| Private-link acceptance is disputed                                                 | Low–medium | Store name, phone, IP, timestamp and the exact version accepted; OTP in Phase 2                                   |
| Google-only login locks someone out                                                 | Medium     | Visible invites, editable email, invite code, ownership transfer; second provider in Phase 2 if needed            |
| Phishing on free subdomains harms the brand                                         | Medium     | Abuse controls from day one; report link on every public page                                                     |
| WhatsApp Business verification takes weeks                                          | High       | ~~Start Meta verification on day 1~~ Meta application waits until after Phase 2 (D49); Phase 1 never depends on it                                                     |
| GST or e-way bill errors on invoices                                                | Medium     | Accountant review of sample invoices before pilot; e-way bill decision in Phase 2                                 |
| Six verticals dilute the pilot                                                      | Medium     | Kits for all six, pilots in two                                                                                   |
| No revenue in the first 20 days                                                     | Accepted   | Free by design; G6 tests willingness to pay before billing is built                                               |

Work breakdown structure with effort and dependencies: WBS

Documents to read before design: Design inputs

Market fit, moat, sales team and emotional selling: Market fit & sales

Build workflow, security, PII and the final go / no-go gate: Workflow & final verification

Build workflow, security, PII and the final go / no-go gate: Workflow & final verification

Architecture, API contract, adapters, acceptance criteria, test plan and vendor checklist: Architecture & contracts

Legal and compliance drafts for lawyer and CA review: Legal & compliance

Business plan, unit economics, pilot tracker, support, CA programme and hiring: Business plan
