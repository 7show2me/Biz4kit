# Biz4Kit — Work Breakdown Structure

Rewritten 2026-10-24 to match `docs/decisions.md` (D1–D102) and the locked prototype `design/app/` (D94). Previous version: `prep/archive/2026-10-24/WBS.md`.

Oct 18, 2026 · @Ravin · day 1 = Monday 2026-10-19 (D25)

Three streams run in parallel over the same 10 + 10 days: **Dev** builds and verifies the product, **Business** sets up the company, accounts, legal and money, and **Sales & success** recruits and keeps the Founding 20. This is a one-person project: one agent does the work as assignee and one human verifies (D24, D27); where a row asks for a designer or a second reviewer, the agent runs the automated pre-checks (axe, contrast, Lighthouse, phone-size screenshots) and the human signs off (D48). The schedule is set by the human verification loop, so every Dev row names its day window and what a person must verify. Anything not verified by day 9 is cut from the pilot. Pilot verticals: salons + design / IT agencies; starter kits for all six verticals still ship (D1). Linear (team BIZ) is the live status; `scripts/linear_seed.py` reads the tables below.

The build spec is the locked prototype `design/app/` (38 screens, D94) with `docs/implementation-notes.md`; `docs/decisions.md` wins over this file where they differ.

## Dev team

One agent does the work, one human verifies; the agent runs designer and second-reviewer pre-checks first (D24, D27, D48). Rows amended after the Workflow, Architecture and Market fit tabs are marked †.

### Phase 1 · Standalone (days 1–10)

External services: Google OAuth and Resend email only. Every generator ships with link + PDF / DOCX export + ready message. Meta WhatsApp and the Razorpay / Stripe / Polar applications wait until after Phase 2, with the company (D43, D49). Phase 1 sends email only; SMS and WhatsApp messages are copy and paste (D67). Plans are free in Phase 1 (D98).

| WBS | Work package | Done when | Days | Depends on | Human verifies | Status |
| --- | --- | --- | --- | --- | --- | --- |
| **0.0** | **Workflow** |  | **1** |  |  |  |
| 0.1 † | Build workflow set-up | Linear projects, statuses, labels and automations; GitHub branch protection, required checks, PR template, CODEOWNERS (the one human on every path, D48); Slack channels and bot; worktree script; one tiny PR run through the whole flow (Workflow tab) | 1 | — | The human walks a test issue from Todo to Done | Not started |
| **1.0** | **Foundation** |  | **1–2** |  |  |  |
| 1.1 | Repo, CI/CD, environments | Monorepo (pnpm + Turborepo, D37: web, native, server); backend (API + BullMQ workers) as Docker images in ECR, docker compose for local dev; deployed to ECS Fargate in Mumbai (ap-south-1) behind API Gateway HTTP API -> VPC Link -> Cloud Map, no load balancer (D28, D38, D42); Terraform state in S3 with locking (D39); web app on Vercel (D22); Upstash Redis for BullMQ (D33); Neon Postgres in AWS Mumbai with prod + staging branches and a Neon branch per PR preview; point-in-time restore (D4); preview deploys; error tracking | 1 | 0.1 | Deploy a hello-world API to ECS Fargate behind API Gateway and the web app to Vercel; restore a Neon branch to an earlier point in time | Not started |
| 1.2 | Data model & tenancy | Schema for all entities incl. ActivityLog (Architecture tab; money in paise; invoice kinds with both `PI-` and `INV-` numbers, D60, D71); migrations; RLS per workspace; seed data | 1 | 1.1 | Cross-tenant read attempt fails in a test | Not started |
| 1.3 | Auth (Better Auth) | Google OAuth web + Expo; refresh sessions; device list; invites visible to owner and invitee, editable email, invite code; ownership transfer; re-auth before billing / delete | 1–2 | 1.2 | Sign in on two phones and a laptop; revoke one; accept an invite from a different Gmail via code | Not started |
| 1.4 | Workspace & brand setup | Slug on `<slug>.biz4kit.com` (D47), logos, two colours → theme tokens with contrast gate; GST ID, UPI ID, numbering prefixes (`PI-` and `INV-`, D60), terms; opening hours per weekday, up to two ranges a day, closed until set (D97, D99); "which app do you use today" question for familiar-word hints; Done step `/new/done` with catalog link, QR and share price list (Design inputs onboarding step 7) | 2 | 1.3 | Agent pre-checks, the human signs off (D48): 5 real logos light and dark | Not started |
| 1.5 † | Design system & app shell | Mobile-web-first layout, board / list, ⌘K, dark / light, brand-tinted components; Lite mode by default (catalog, reply, invoice, payment), other modules opt-in; Board, Customers and Jobs are extras (D63); four core Quick jobs: Catalog, Reply, Invoice, Cashflow, money in only in Phase 1 (D77); compact density (D52); sidebar sections Home · Sales · Schedule · Payments · Business, Settings its own item (D80, D81, D83); 4B mark at the sidebar top, business logo on the profile button (D78, D79); header bell opens the notification inbox (D87); status colours unique within a record, booking Cancelled red (D55, D100); the 38 screens of `design/app/` (D94) | 2 | 1.4 | Agent pre-checks, the human reviews (D48) on a Moto G-class phone | Not started |
| 1.6 † | Email (Resend) | Adapter; SPF / DKIM / DMARC; templates for invite, new lead, proof waiting with approve / reject links, customer copies, invoice email, email replies, confirmations and reminders (D67), My-orders magic link; sender is the business name, reply-to the owner, never "via Biz4Kit" (D35); bounce handling | 2 | 1.3 | Receive each email on Gmail and Outlook; links work once and expire; authentication passes | Not started |
| 1.7 | PWA offline | Service-worker cache of last 7 days of bookings and jobs; local reply and invoice drafts; sync with last-write-wins and a conflict banner | 2 | 1.5 | Airplane-mode test: read, draft, reconnect, no loss | Not started |
| **2.0** | **Generators** |  | **3–6** |  |  |  |
| 2.1 | Catalog | Items, categories, photos and MOQ (D87), show / hide price, drag order; optional serial number, model, warranty / guarantee and batch fields per item when the business has the feature on (D85); CSV import with header mapping from Vyapar / Zoho / Refrens / Dukaan; public page; QR; PDF menu; price-list message. Variants and add-ons move to Phase 2 (D87) | 3 | 1.5 | Import a real IndiaMART price list CSV; open the page from a WhatsApp preview | Not started |
| 2.2 | Service packages | Tiers, bookable flag (a booking makes a booked lead, D59), advance % per package (no fixed default, D66), package → reply starter | 3 | 2.1 | Salon owner builds a bridal package unaided | Not started |
| 2.3 † | Doc editor | Desktop block editor (lines, totals, GST, scope text, comments, versions); phone form editor with live preview, no block editing on phones; same blocks render web and PDF; used for invoices and replies, no quote editor (D60) | 3–4 | 1.5 | Diff-test web vs PDF; agent pre-checks and the human tests the phone form one-handed (D48) | Not started |
| 2.4 | Reply (proforma) generator | From lead or package; optional lines the customer ticks on the pay page (D102); validity; private link; every reply is a proforma `PI-` and paying is the acceptance (D60); PDF; ready message; approved payment → tax invoice `INV-` (D60); a reply with an advance % is the advance proforma, the balance follows as a second invoice (D70) | 4 | 2.2, 2.3 | Pay a reply from a forwarded link on a phone; preview bot does not mark viewed | Not started |
| 2.5 | Invoice generator | `PI-` until the payment is approved, then the next `INV-` (D60, D71), gap-free, for every vertical (D90); GST fields and CGST / SGST / IGST (customer state from their GSTIN; HSN copied into each line); partial payments with a Part paid status (teal, D55) → overdue; advance then balance as two invoices, nothing taxed twice (D70); only the Owner cancels an issued invoice; serial number, model and warranty / guarantee rows when the feature is on: one row per unit once serials are entered, serial unique per business, proforma shows model and cover but not serial, cover runs from the invoice date, a warranty card per row with a serial (D85, D86); PDF in the business's brand, no "Made with Biz4Kit" (D78, D89); reminder messages | 4–5 | 2.3 | Accountant checks 5 sample invoices (B2B, B2C, inter-state) when engaged; until then the human checks them against the Legal tab checklist (D23, D92) | Not started |
| 2.6 † | Payment request & approval | UPI link + QR, bank block, pay message with the "shown as received once {owner} confirms" line; proof upload (PDF / image) by any member except the Accountant (D91); owner approval in-app and from the approve-from-email page, link valid 48 h and single use (D57, D87); Manager limit set by the Owner, Managers approve strictly below it; a sole Owner may approve their own upload, logged as self-approved (D57, D74); approval above the open balance refused, payment on an older `PI-` version applied to the latest (D76); Snoozed lead warns, rejected or expired reply blocked (D73); unpaid `PI-` is not a receivable and turns Expired (D75); Overdue payments page with one-tap Remind, messages 13 / 14 (D64, D67); receipt | 5 | 2.5, 1.6 | Owner approves from the email on a phone without opening the app | Not started |
| 2.7 † | Message templates & share | Template engine, 16 defaults (8 and 9 retired; 4–7 and 18 wording approved, D93, D95), placeholder `{doc_no}`, owner edits, share sheet, wa.me / mailto / SMS, Message log; Devanagari-capable fonts in PDFs so translated templates can follow | 5 | 1.4 | Send each template from Android share sheet to WhatsApp | Not started |
| 2.8 | Export service | Queued PDF render; DOCX and CSV; download and share from every record; warranty card page and PDF per serial row (D86) | 5–6 | 2.3 | Open DOCX in Word and Google Docs | Not started |
| 2.9 † | Notifications & inbox | In-app inbox (new leads, proofs to approve, overdue bills, bookings to confirm, jobs to invoice, replies expiring) by role, with unread and per-user mute (D87); email for lead, proof waiting, booking, invite; optional morning brief (today's bookings, who owes what, leads waiting for a reply) | 6 | 1.6 | Each event lands once, in-app and email | Not started |
| **3.0** | **Team workspace & operations** |  | **6–8** |  |  |  |
| 3.1 | Leads inbox | Portal form → lead (quoted or booked, D59), customer button "Request a quote" (D101); Accept / Edit / Reject a quoted lead (D61); statuses New, Contacted, Replied, Snoozed, Rejected, Paid (D66, D72); assign, priority normal / high with high first (D87), notes, snooze; source tags; Board, an extra: New → Replied → Booked → In service → Invoiced → Paid (D63, D65). Lead location moves to Phase 2 (D87) | 6 | 2.1 | Submit from Instagram in-app browser | Not started |
| 3.2 | Bookings | Availability from each business's opening hours, up to two ranges a weekday, slots every 30 min that fit the package length (D97, D99); calendar per member, drag to move, conflict warning, confirmation message; statuses To confirm / Agreed, Cancelled red (D68, D69, D100); booked lead: assign a staff member, confirm by email or SMS (D62) | 6–7 | 2.2 | Double-book attempt is blocked | Not started |
| 3.3 † | Jobs & staff day view | Checklist, photos before / after, materials (no prices) (D87); done → draft invoice at once, the next step is "Review and send" (D88); a staff "my day" view with their jobs, completed work and customer thank-yous. Time logged moves to Phase 2 (D87) | 7 | 3.2, 2.5 | Staff completes a job on a phone in under 1 minute; staff member says the day view is useful | Not started |
| 3.4 | Customers & My orders | Timeline (action New invoice, D60); per-customer private page; magic link email; phone masked on public pages; serial lookup and warranty cards when the feature is on (D85, D86) | 7 | 2.4, 2.5, 1.6 | Customer sees every record from one link | Not started |
| 3.5 | Roles & audit | Owner / Manager / Staff / Accountant; the Accountant is read-only plus export (D91); only the Owner cancels an issued invoice; activity log; ownership transfer | 7 | 1.3 | Staff cannot see reports or approvals | Not started |
| 3.6 | Reports v1 | Revenue, lead → paid funnel, outstanding, top items, staff utilisation; CSV | 8 | 3.3 | Numbers tie to the invoice list | Not started |
| 3.7 | Super-admin console | Workspace search, suspend, impersonate with consent log, usage view, abuse report queue | 8 | 3.5 | Suspend and restore a test workspace | Not started |
| 3.8 † | Abuse & safety | Reserved subdomains, phishing-pattern checks, report link, takedown within 4 hours per the Legal tab procedure, rate limits, preview-bot list | 8 | 2.1 | Try a bank-lookalike slug; it is refused; a report reaches the admin queue | Not started |
| 3.9 † | Site & help | One-page marketing site, in-app help, five one-minute FAQ videos embedded, first-run checklist on Today (6 steps, Owner only, can be hidden, D87) | 8 | 1.4 | Agent pre-checks, the human reviews (D48) | Not started |
| 3.11 † | Legal pages live | Terms, privacy, consent lines, acceptable use, refunds wired into sign-up, portal form, footer and checkout; drafts stay visibly marked until the lawyer is engaged after Phase 2 (D23, D92) | 9 | 3.9, Business 0.5 | Marked drafts are live in every place they belong; lawyer-approved text replaces them before paid plans (D92) | Not started |
| **4.0** | **Verify & launch** |  | **8–10** |  |  |  |
| 4.1 | Verification sweep | Test suite green (the prototype flows in `docs/implementation-notes.md` §6); OWASP checklist; RLS fuzz; restore drill; axe accessibility; Lighthouse budgets; DPDP export and erasure jobs; licence scan; pilot gate without CA and lawyer sign-off, their placeholders still marked (D92) | 8–9 | all | The human verifier signs off (D27) per checklist item | Not started |
| 4.2 | Vertical starter kits | Seed catalog, packages, message nouns for all six verticals (D1); Claude drafts the five non-salon kits with every value marked "[Draft]" and the owner approves before shipping (D96); serial numbers and warranty on by default for the Wholesaler and Manufacturer kits (D85); onboarding picks a kit | 9 | 2.7 | One real owner per vertical reviews their kit | Not started |
| 4.3 | Expo shell | Store-less build (APK / TestFlight) with Google login, persistent session, web views of the workspace, share sheet | 9 | 1.3 | Install on 3 Android phones; session survives a week | Not started |
| 4.6 † | Analytics events | Every event in the Architecture tab's event plan implemented (`reply_shared`, not `quote_shared`, D60), with dashboards per GTM test and the daily Slack #pilot snapshot | 9 | 2.4–2.6 | A test workspace walks lead → paid and every event appears once | Not started |
| 4.4 † | Pilot launch | Tag `v0.1.0-pilot`; go / no-go checklist from the Workflow tab passed (D92); tagged sign-up links live; the Founding 20 (recruited by Sales) onboarded | 10 | 4.1, 4.2, 4.6, Sales 2.3 | Go / no-go meeting record | Not started |

### Phase 2 · Connect (days 11–20)

Every connector sits behind the adapter from 5.1 and falls back to the Phase 1 export when absent. Engineering builds all three payment providers; each business enables the ones it wants (Razorpay recommended in India). Gateway, SMS DLT and WhatsApp applications need the company, which is formed after Phase 2 (D43, D49), so live mode waits on it. The pilot runs in parallel; its findings may reorder this list.

| WBS | Work package | Done when | Days | Depends on | Human verifies | Status |
| --- | --- | --- | --- | --- | --- | --- |
| **5.0** | **Connectors & billing** |  | **11–17** |  |  |  |
| 5.1 | Connector framework | Adapter interfaces (payments, messaging, OTP), per-workspace enable / disable with a recommended default, encrypted secrets, health checks, fallback to export | 11 | Phase 1 | Disable a connector; the export path reappears | Not started |
| 5.2 | Razorpay payments | Hosted link per invoice, UPI / cards / net banking, webhooks reconcile, receipts, payout view; unmatched webhook → approval queue | 11–12 | 5.1 | Real ₹1 payment end to end in test and live mode | Not started |
| 5.3 | Stripe payments | Same flow, multi-currency; confirm Indian account eligibility on day 1 | 12–13 | 5.2 | Test-mode card payment; eligibility confirmed in writing | Not started |
| 5.4 | Polar payments | Same flow via Polar as merchant of record; confirm service-business eligibility on day 1 | 13 | 5.2 | Sandbox payment; eligibility confirmed in writing | Not started |
| 5.5 | Plan billing | Free / Starter / Team / Agency with Polar as the billing provider (D98); limits enforced; upgrade / downgrade; our invoices; grace period for pilots. Prices and limits are open until the pricing decision (B2.1) | 14–15 | 5.2–5.4 | Upgrade, downgrade and failed-payment paths | Not started |
| 5.6 | WhatsApp Business API | Approved templates, send + delivery status, inbound replies attached to the record; verification starts once the company exists (D49) | 15–16 | 5.1 | Template sends to a non-team number; reply lands on the lead | Not started |
| 5.7 | OTP (MSG91 / Twilio) | Customer portal login, per-workspace toggle (no OTP acceptance: paying is the acceptance, D60) | 16 | 5.1 | OTP on two carriers; fallback to link when SMS fails | Not started |
| 5.8 | Automation | Scheduled reminders (+3 / +7 / +14) for overdue bills only, unpaid `PI-` gets the expiry follow-up, message 6 (D64, D75), booking reminders, expiry nudges, through any enabled channel; quiet hours | 17 | 5.6, 1.6 | No duplicate sends across channels in a 7-day simulation | Not started |
| **6.0** | **AI ingest & finance** |  | **14–20** |  |  |  |
| 6.1 | Ingest pipeline | Upload image / PDF / Excel / Word / pasted text → Claude structures → review-and-edit → save; confidence flags; cost cap per workspace | 14–16 | Phase 1 | 10 real price lists from pilots parse with ≤ 2 corrections each | Not started |
| 6.2 | Ingest targets | Catalog items, reply lines from a brief, customer records from IndiaMART or contact exports | 17 | 6.1 | Pilot owner imports their own data unaided | Not started |
| 6.3 | Recurring invoices & credit notes | Schedules, mandates where a provider supports them, credit notes against paid invoices | 18 | 5.5 | Accountant reviews a credit-note PDF | Not started |
| 6.4 | E-way bill decision | Implement the Business team's decision (B2.2): build, integrate a provider, or add a referral hint | 18 | pilot | Written recommendation | Not started |
| 6.5 | Pilot readout & Phase 3 plan | G1–G8 results, churn interviews, pricing decision, Phase 3 reordered | 19–20 | 4.4 | Owner signs off | Not started |

### Phase 3 · Scale (weeks 5–12, scoped after the pilot readout)

| WBS | Work package | Done when | Weeks | Depends on | Human verifies | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 7.1 | Custom domains | CNAME setup, auto-SSL, domain on catalog, invoices, emails (Agency plan) | 5 | 1.6 | Agency pilot maps a real domain | Not started |
| 7.2 | Multi-workspace & agency | Workspace switcher, agency roles across workspaces, consolidated billing | 5–6 | 5.5 | Agency with 3 client workspaces bills once | Not started |
| 7.3 | Public API | REST API, keys, outbound webhooks, docs | 6–7 | 5.1 | External script creates a reply end to end | Not started |
| 7.4 | Accounting sync | Tally and Zoho Books export / sync of invoices and payments | 7–8 | 7.3 | Accountant reconciles a month in Tally | Not started |
| 7.5 | Native team app | Store release, push notifications, offline job checklist | 6–10 | 4.3 | Store review passes; push arrives with app closed | Not started |
| 7.6 | Advanced reports | Cohorts, staff performance, package margin, scheduled report emails | 9–10 | 6.3 | Owner matches numbers to bank statement | Not started |

## Business team

The founder alone during the pilot (D24, D44). The company, PAN, GST, bank, the CA and lawyer retainers, the trademark filing and the gateway / DLT / WhatsApp applications all wait until Phase 2 is complete (D23, D43, D45, D49). Prefixed B so Dev rows can depend on them ("Business 0.5"). Everything legal stays a marked draft until the lawyer or CA signs it off (D92).

| WBS | Work package | Done when | Days | Depends on | Verified by | Status |
| --- | --- | --- | --- | --- | --- | --- |
| B0.1 | Vendor and account set-up | Accounts that need no company, under a company email with MFA: domain biz4kit.com (D46, D47), Google OAuth consent screen, Resend, AWS, Vercel, Neon, Upstash, GitHub, Linear, Slack (D49). Razorpay, Stripe, Polar, SMS DLT and Meta WhatsApp move to after Phase 2 (D49) | 1–2 | — | The human confirms credentials are in the secret store | Not started |
| B0.2 | Retainers | CA and lawyer engaged with scope and dates; deferred until Phase 2 is complete (D23, D43) | after Phase 2 | — | Signed engagement letters | Not started |
| B0.3 | Company, PAN, GST, bank | Entity registration; bank account; GST registration (needed before any paid plan); deferred until Phase 2 is complete (D43) | after Phase 2 | B0.2 | CA confirms filings | Not started |
| B0.4 | Name and trademark | Name locked as Biz4Kit, no three-name test (D5); trademark search and application filed once the lawyer is engaged (D45) | after Phase 2 | B0.2 | Attorney search report; application receipt | Not started |
| B0.5 | Legal drafts to lawyer | Terms, privacy notice, consent lines, refund terms, acceptable use and takedown (Legal tab) drafted and marked as drafts on every screen; sent to the lawyer when engaged (D23, D92) | 4–8 | B0.2 | Lawyer sign-off on each document before paid plans (D92) | Not started |
| B0.6 | Vendor terms file | Accepted terms of every vendor stored with date and version; Claude API data-retention terms recorded before Phase 2 | 2–11 | B0.1 | The human spot-checks the folder | Not started |
| B1.1 | GST invoice checklist | CA completes the checklist in the Legal tab and reviews five sample invoices when engaged (D23); until then CA items stay marked placeholders (D92) | after Phase 2 | Dev 2.5 | CA written sign-off | Not started |
| B1.2 | Cost sheet and unit economics | Per-workspace cost model in the Business plan tab filled with real vendor prices and offers; monthly budget per environment with an 80% alert | 6–9 | B0.1 | Founder reviews; the human confirms infra numbers | Not started |
| B1.3 | Privacy operations | Grievance officer named; export and erasure request process; breach notice template; retention schedule agreed with CA and lawyer when engaged | 7–9 | B0.5 | Lawyer confirms duties | Not started |
| B1.4 | Hiring | Cancelled: no hires in the pilot (D44) | — | — | — | Cancelled |
| B1.5 | Go / no-go participation | Founder attends the day-10 gate; business lines of the checklist (legal drafts live and marked, support line live, Founding 20 named) evidenced (D8, D92) | 10 | all | Decision recorded | Not started |
| B2.1 | Plan billing readiness | Pricing decision after the day-20 readout; GST on our own fees confirmed with CA; refund terms live; Polar account approved once the company exists (D43, D98) | 11–20 | B0.3, Dev 5.5 | CA and lawyer confirm | Not started |
| B2.2 | E-way bill decision | Accountant review with wholesaler and manufacturer pilots; build, integrate or refer out; recorded (feeds Dev 6.4) | 15–18 | B1.1 | Written recommendation | Not started |
| B2.3 | Pilot readout and plan update | G1–G8 results, churn interviews, pricing, Phase 3 reorder, raise-or-bootstrap note | 19–22 | Sales 2.6 | Founder signs off | Not started |

## Sales & success team

The founder runs every step in the pilot (D24, D44); the CA partner lead joins once a CA is engaged. Prefixed S.

| WBS | Work package | Done when | Days | Depends on | Verified by | Status |
| --- | --- | --- | --- | --- | --- | --- |
| S0.1 | Sales playbook adopted | Market fit & sales tab read; five opening questions, three-minute demo and objection answers rehearsed; introduction cards designed and printed | 1–4 | — | Founder runs a role-play | Not started |
| S0.2 | Channel kit | Tagged sign-up links per channel; QR counter-card design; WhatsApp forward message; Instagram DM script; local business group list | 2–5 | Dev 1.4 (links) | Each tag resolves to a working sign-up | Not started |
| S1.1 | Founding 20 recruitment | Twenty named businesses in the two pilot verticals (salons and design / IT agencies, D1) with a yes, logged in the Business plan tracker with channel tag and buddy | 2–10 | S0.1 | Founder confirms each name personally | Not started |
| S1.2 | Vertical kit review | One real owner per vertical reviews their starter kit wording and items with Dev (Dev 4.2, D96) | 8–9 | S1.1 | Owner's notes attached to the Dev issue | Not started |
| S1.3 | Human support live | The founder's phone is the support line, no separate WhatsApp Business number (D8); hours, response-time promise, escalation path, five FAQ videos recorded | 6–9 | Dev 3.9 | A test owner gets a human reply within 30 minutes | Not started |
| S1.4 | Set-up visits scheduled | Each Founding 20 business has a visit date in days 10–14 and a named buddy | 8–10 | S1.1 | Calendar reviewed at go / no-go | Not started |
| S2.1 | Set-up visits | Every business leaves the visit with a real reply sent from the owner's phone and the catalog link shared | 10–14 | Dev 4.4 | `catalog_shared` and `reply_shared` events per business | Not started |
| S2.2 | Check-in rhythm | Day 1, 3, 7, 14 and 20 contacts per business from the playbook, logged on the business record | 11–30 | S2.1 | Weekly review shows no missed check-in | Not started |
| S2.3 | Weekly G-review | Monday 30-minute review of G1–G8, three owner quotes, one decision; daily snapshot in Slack #pilot | 11–30 | Dev 4.6 | Notes in Linear | Not started |
| S2.4 | Churn interviews | Any business inactive 5 days is interviewed within 48 hours; reasons tagged | 14–30 | S2.3 | Interview notes attached | Not started |
| S2.5 | CA partner programme | Once a CA is engaged (D23): CA brief and demo workspace ready; three introductions asked; five CA partners by day 30 | 11–30 | B1.1 | Partner list with introductions made | Not started |
| S2.6 | Commitment ask (G6) | Every pilot owner asked for a ₹499 commitment on day 20; answers recorded; founding rate and Founding Members wall offered | 20–22 | S2.2 | Count of yes / no / later in the tracker | Not started |
| S2.7 | Testimonials and stories | With consent, three short owner videos and one CA quote after something has gone well | 20–30 | S2.6 | Consent on file | Not started |

## Schedule summary

| Team | Window | Packages | Critical path | Cut line |
| --- | --- | --- | --- | --- |
| Dev · Phase 1 | Days 1–10 | 32 | 0.1 → 1.2 → 1.3 → 1.5 → 2.3 → 2.4 → 2.5 → 2.6 → 4.1 → 4.4 | Unverified by day 9: 3.6 reports, 3.7 admin console, 4.3 Expo shell can slip to days 11–12 |
| Dev · Phase 2 | Days 11–20 | 13 | 5.1 → 5.2 → 5.5 | Live payments, SMS and WhatsApp wait on the company (D43, D49) |
| Dev · Phase 3 | Weeks 5–12 | 6 | Set after B2.3 | — |
| Business | Days 1–22 | 14 | B0.1 → Dev 1.1; company, CA and lawyer after Phase 2 (D43) | Legal text ships as marked drafts for the pilot (D92); nothing else is cut, only late |
| Sales & success | Days 1–30 | 13 | S0.1 → S1.1 → S1.4 → S2.1 → S2.6 | Fewer than 20 yeses by day 10 launches with what there is and keeps recruiting |

**Cross-team dependencies to watch**: Dev 3.11 ships the B0.5 drafts marked until the lawyer signs them (D92); Dev 4.4 needs Sales S1.1 (the Founding 20) by day 10; Dev 5.2–5.4 live mode needs the company (D43, D49); Dev 6.4 needs Business B2.2; Sales S2.3 needs Dev 4.6 (events) on day 9.

Assumptions (open until confirmed): AI agents generate code for several packages at once; the one human runs the verification column (D27); an accountant reviews invoices once engaged (D23); the owner recruits the 20 pilots during days 1–10 so launch is not waiting on outreach. The doc editor (2.3) and the approval flow (2.6) are the riskiest packages; 1.3 runs days 1–2 and there are no day-1 prototypes (D50).
