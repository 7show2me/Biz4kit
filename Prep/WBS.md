# Biz4Kit — Work Breakdown Structure

Oct 18, 2026 · @Ravin

Three teams run in parallel over the same 10 + 10 days: the **Dev team** builds and verifies the product, the **Business team** sets up the company, accounts, legal and money, and the **Sales & success team** recruits and keeps the Founding 20. AI agents generate code; the schedule is set by the human verification loop, so every Dev row names its day window and what a person must verify. Anything not verified by day 9 is cut from the pilot. Tick Status as work moves. Open decision: the pilot verticals below are still salons and IndiaMART wholesalers; the Market fit review recommends salons plus design or IT agencies instead.

## Dev team

Two engineers as reviewers of record, one designer, AI agents writing the code. Rows amended after the Workflow, Architecture and Market fit tabs are marked †.

### Phase 1 · Standalone (days 1–10)

External services: Google OAuth and Resend email only. Every generator ships with link + PDF / DOCX export + ready message. Day 1 also starts the Meta WhatsApp verification and the Razorpay / Stripe / Polar account applications so Phase 2 is not blocked.

| WBS | Work package | Done when | Days | Depends on | Human verifies | Status |
| --- | --- | --- | --- | --- | --- | --- |
| **0.0** | **Workflow** |  | **1** |  |  |  |
| 0.1 † | Build workflow set-up | Linear projects, statuses, labels and automations; GitHub branch protection, required checks, PR template, CODEOWNERS; Slack channels and bot; worktree script; one tiny PR run through the whole flow (Workflow tab) | 1 | — | Lead walks a test issue from Todo to Done | Not started |
| **1.0** | **Foundation** |  | **1–2** |  |  |  |
| 1.1 | Repo, CI/CD, environments | Monorepo (web, mobile, api), preview deploys, prod + staging Postgres (Mumbai), backups, error tracking | 1 | 0.1 | Deploy a hello-world to prod; restore a backup | Not started |
| 1.2 | Data model & tenancy | Schema for all entities incl. ActivityLog; migrations; RLS per workspace; seed data | 1 | 1.1 | Cross-tenant read attempt fails in a test | Not started |
| 1.3 | Auth (Better Auth) | Google OAuth web + Expo; refresh sessions; device list; invites visible to owner and invitee, editable email, invite code; ownership transfer; re-auth before billing / delete | 1–2 | 1.2 | Sign in on two phones and a laptop; revoke one; accept an invite from a different Gmail via code | Not started |
| 1.4 | Workspace & brand setup | Slug, logos, two colours → theme tokens with contrast gate; GST ID, UPI ID, numbering prefixes, terms; "which app do you use today" question for familiar-word hints | 2 | 1.3 | Designer checks 5 real logos light and dark | Not started |
| 1.5 † | Design system & app shell | Mobile-web-first layout, board / list, ⌘K, dark / light, brand-tinted components; Lite mode by default (catalog, quote, invoice, payment), other modules opt-in | 2 | 1.4 | Designer reviews on a Moto G-class phone | Not started |
| 1.6 † | Email (Resend) | Adapter; SPF / DKIM / DMARC; templates for invite, new lead, proof waiting with approve / reject links, quote accepted, customer copies, My-orders magic link; sender is the business, reply-to the owner, never "via Biz4Kit"; bounce handling | 2 | 1.3 | Receive each email on Gmail and Outlook; links work once and expire; authentication passes | Not started |
| 1.7 | PWA offline | Service-worker cache of last 7 days of bookings and jobs; local quote drafts; sync with last-write-wins and a conflict banner | 2 | 1.5 | Airplane-mode test: read, draft, reconnect, no loss | Not started |
| **2.0** | **Generators** |  | **3–6** |  |  |  |
| 2.1 | Catalog | Items, variants, add-ons, categories, show / hide price, drag order; CSV import with header mapping from Vyapar / Zoho / Refrens / Dukaan; public page; QR; PDF menu; price-list message | 3 | 1.5 | Import a real IndiaMART price list CSV; open the page from a WhatsApp preview | Not started |
| 2.2 | Service packages | Tiers, bookable flag, package → quote starter | 3 | 2.1 | Salon owner builds a bridal package unaided | Not started |
| 2.3 † | Doc editor | Desktop block editor (lines, totals, GST, scope text, comments, versions); phone form editor with live preview, no block editing on phones; same blocks render web and PDF | 3–4 | 1.5 | Engineer diff-tests web vs PDF; designer tests phone form one-handed | Not started |
| 2.4 | Quote generator | From lead or package; optional lines; validity; private link; accept page with the lawyer-reviewed wording; proforma mode; PDF; ready message; accepted → invoice | 4 | 2.2, 2.3 | Accept a quote from a forwarded link on a phone; preview bot does not mark viewed | Not started |
| 2.5 | Invoice generator | Number at first share, gap-free; GST fields and CGST / SGST / IGST; partial payments; status machine incl. partially-paid → overdue; PDF; reminder messages | 4–5 | 2.3 | Accountant checks 5 sample invoices (B2B, B2C, inter-state) | Not started |
| 2.6 † | Payment request & approval | UPI link + QR, bank block, pay message with the "shown as received once {owner} confirms" line; proof upload (PDF / image) by any member; owner approval in-app and from the single-use email link; Manager threshold setting; receipt | 5 | 2.5, 1.6 | Owner approves from the email on a phone without opening the app | Not started |
| 2.7 † | Message templates & share | Template engine, 17 defaults, owner edits, share sheet, wa.me / mailto / SMS, Message log; Devanagari-capable fonts in PDFs so translated templates can follow | 5 | 1.4 | Send each template from Android share sheet to WhatsApp | Not started |
| 2.8 | Export service | Queued PDF render; DOCX and CSV; download and share from every record | 5–6 | 2.3 | Open DOCX in Word and Google Docs | Not started |
| 2.9 † | Notifications & inbox | In-app inbox + email for lead, proof waiting, accepted, booking, invite; per-user mute; optional morning brief (today's bookings, who owes what, quotes waiting) | 6 | 1.6 | Each event lands once, in-app and email | Not started |
| **3.0** | **Team workspace & operations** |  | **6–8** |  |  |  |
| 3.1 | Leads inbox | Portal form → lead; assign, priority, notes, snooze; source tags; pipeline board | 6 | 2.1 | Submit from Instagram in-app browser | Not started |
| 3.2 | Bookings | Availability, calendar per member, drag to move, conflict warning, confirmation message | 6–7 | 2.2 | Double-book attempt is blocked | Not started |
| 3.3 † | Jobs & staff day view | Checklist, photos, time, materials; done → draft invoice; a staff "my day" view with their jobs, completed work and customer thank-yous | 7 | 3.2, 2.5 | Staff completes a job on a phone in under 1 minute; staff member says the day view is useful | Not started |
| 3.4 | Customers & My orders | Timeline; per-customer private page; magic link email; phone masked on public pages | 7 | 2.4, 2.5, 1.6 | Customer sees every record from one link | Not started |
| 3.5 | Roles & audit | Owner / Manager / Staff / Accountant; activity log; ownership transfer | 7 | 1.3 | Staff cannot see reports or approvals | Not started |
| 3.6 | Reports v1 | Revenue, lead → paid funnel, outstanding, top items, staff utilisation; CSV | 8 | 3.3 | Numbers tie to the invoice list | Not started |
| 3.7 | Super-admin console | Workspace search, suspend, impersonate with consent log, usage view, abuse report queue | 8 | 3.5 | Suspend and restore a test workspace | Not started |
| 3.8 † | Abuse & safety | Reserved subdomains, phishing-pattern checks, report link, takedown within 4 hours per the Legal tab procedure, rate limits, preview-bot list | 8 | 2.1 | Try a bank-lookalike slug; it is refused; a report reaches the admin queue | Not started |
| 3.9 † | Site & help | One-page marketing site, in-app help, five one-minute FAQ videos embedded, onboarding checklist | 8 | 1.4 | Designer and support person review | Not started |
| 3.11 † | Legal pages live | Terms, privacy, consent lines, acceptable use, refunds wired into sign-up, portal form, footer and checkout; text supplied by the Business team after lawyer review | 9 | 3.9, Business 0.5 | Lawyer-approved text matches what is live | Not started |
| **4.0** | **Verify & launch** |  | **8–10** |  |  |  |
| 4.1 | Verification sweep | Test suite green; OWASP checklist; RLS fuzz; backup restore drill; axe accessibility; Lighthouse budgets; DPDP export and erasure jobs; licence scan | 8–9 | all | Two engineers sign off per checklist item | Not started |
| 4.2 | Vertical starter kits | Seed catalog, packages, message nouns for all six verticals; onboarding picks a kit | 9 | 2.7 | One real owner per vertical reviews their kit | Not started |
| 4.3 | Expo shell | Store-less build (APK / TestFlight) with Google login, persistent session, web views of the workspace, share sheet | 9 | 1.3 | Install on 3 Android phones; session survives a week | Not started |
| 4.6 † | Analytics events | Every event in the Architecture tab's event plan implemented, with dashboards per GTM test and the daily Slack #pilot snapshot | 9 | 2.4–2.6 | A test workspace walks lead → paid and every event appears once | Not started |
| 4.4 † | Pilot launch | Tag `v0.1.0-pilot`; go / no-go checklist from the Workflow tab passed; tagged sign-up links live; the Founding 20 (recruited by Sales) onboarded | 10 | 4.1, 4.2, 4.6, Sales 2.3 | Go / no-go meeting record | Not started |

### Phase 2 · Connect (days 11–20)

Every connector sits behind the adapter from 5.1 and falls back to the Phase 1 export when absent. Engineering builds all three payment providers; each business enables the ones it wants (Razorpay recommended in India). The pilot runs in parallel; its findings may reorder this list.

| WBS | Work package | Done when | Days | Depends on | Human verifies | Status |
| --- | --- | --- | --- | --- | --- | --- |
| **5.0** | **Connectors & billing** |  | **11–17** |  |  |  |
| 5.1 | Connector framework | Adapter interfaces (payments, messaging, OTP), per-workspace enable / disable with a recommended default, encrypted secrets, health checks, fallback to export | 11 | Phase 1 | Disable a connector; the export path reappears | Not started |
| 5.2 | Razorpay payments | Hosted link per invoice, UPI / cards / net banking, webhooks reconcile, receipts, payout view; unmatched webhook → approval queue | 11–12 | 5.1 | Real ₹1 payment end to end in test and live mode | Not started |
| 5.3 | Stripe payments | Same flow, multi-currency; confirm Indian account eligibility on day 1 | 12–13 | 5.2 | Test-mode card payment; eligibility confirmed in writing | Not started |
| 5.4 | Polar payments | Same flow via Polar as merchant of record; confirm service-business eligibility on day 1 | 13 | 5.2 | Sandbox payment; eligibility confirmed in writing | Not started |
| 5.5 | Plan billing | Free / Starter / Team / Agency on all three providers; limits enforced; upgrade / downgrade; our invoices; grace period for pilots | 14–15 | 5.2–5.4 | Upgrade, downgrade and failed-payment paths on each provider | Not started |
| 5.6 | WhatsApp Business API | Approved templates, send + delivery status, inbound replies attached to the record; verification started day 1 | 15–16 | 5.1 | Template sends to a non-team number; reply lands on the lead | Not started |
| 5.7 | OTP (MSG91 / Twilio) | OTP-verified quote acceptance and customer portal login, per-workspace toggle | 16 | 5.1 | OTP on two carriers; fallback to link when SMS fails | Not started |
| 5.8 | Automation | Scheduled reminders (+3 / +7 / +14), booking reminders, expiry nudges, through any enabled channel; quiet hours | 17 | 5.6, 1.6 | No duplicate sends across channels in a 7-day simulation | Not started |
| **6.0** | **AI ingest & finance** |  | **14–20** |  |  |  |
| 6.1 | Ingest pipeline | Upload image / PDF / Excel / Word / pasted text → Claude structures → review-and-edit → save; confidence flags; cost cap per workspace | 14–16 | Phase 1 | 10 real price lists from pilots parse with ≤ 2 corrections each | Not started |
| 6.2 | Ingest targets | Catalog items, quote lines from a brief, customer records from IndiaMART or contact exports | 17 | 6.1 | Pilot owner imports their own data unaided | Not started |
| 6.3 | Recurring invoices & credit notes | Schedules, mandates where a provider supports them, credit notes against paid invoices | 18 | 5.5 | Accountant reviews a credit-note PDF | Not started |
| 6.4 | E-way bill decision | Implement the Business team's decision (B2.2): build, integrate a provider, or add a referral hint | 18 | pilot | Written recommendation | Not started |
| 6.5 | Pilot readout & Phase 3 plan | G1–G8 results, churn interviews, pricing decision, Phase 3 reordered | 19–20 | 4.4 | Owner signs off | Not started |

### Phase 3 · Scale (weeks 5–12, scoped after the pilot readout)

| WBS | Work package | Done when | Weeks | Depends on | Human verifies | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 7.1 | Custom domains | CNAME setup, auto-SSL, domain on catalog, quotes, invoices, emails (Agency plan) | 5 | 1.6 | Agency pilot maps a real domain | Not started |
| 7.2 | Multi-workspace & agency | Workspace switcher, agency roles across workspaces, consolidated billing | 5–6 | 5.5 | Agency with 3 client workspaces bills once | Not started |
| 7.3 | Public API | REST API, keys, outbound webhooks, docs | 6–7 | 5.1 | External script creates a quote end to end | Not started |
| 7.4 | Accounting sync | Tally and Zoho Books export / sync of invoices and payments | 7–8 | 7.3 | Accountant reconciles a month in Tally | Not started |
| 7.5 | Native team app | Store release, push notifications, offline job checklist | 6–10 | 4.3 | Store review passes; push arrives with app closed | Not started |
| 7.6 | Advanced reports | Cohorts, staff performance, package margin, scheduled report emails | 9–10 | 6.3 | Owner matches numbers to bank statement | Not started |

## Business team

Founder plus the CA and lawyer on retainer. Prefixed B so Dev rows can depend on them ("Business 0.5"). Everything legal is a draft until the lawyer or CA signs it off.

| WBS | Work package | Done when | Days | Depends on | Verified by | Status |
| --- | --- | --- | --- | --- | --- | --- |
| B0.1 | Vendor and account set-up | Every account in the Architecture tab's vendor checklist created under a company email with MFA: domain, Google OAuth consent screen, Resend, hosting, observability, GitHub, Linear, Slack; applications started for Meta WhatsApp, SMS DLT registration, Razorpay, Stripe, Polar | 1–2 | — | Lead confirms credentials are in the secret store | Not started |
| B0.2 | Retainers | CA and lawyer engaged with scope and dates: invoice review day 5 and 18, legal review by day 8 | 1 | — | Signed engagement letters | Not started |
| B0.3 | Company, PAN, GST, bank | Entity registration filed or confirmed; bank account; GST registration (needed before any paid plan) | 1–20 (lead time) | B0.2 | CA confirms filings | Not started |
| B0.4 | Name and trademark | Trademark search for Biz4Kit; three-name test with 10 owners (Market fit review); decision recorded; application filed | 2–10 | B0.2 | Attorney search report; owner test notes | Not started |
| B0.5 | Legal drafts to lawyer | Terms, privacy notice, consent lines, refund terms, acceptable use and takedown, quote-acceptance wording (Legal tab) sent by day 4; approved text back by day 8 | 4–8 | B0.2 | Lawyer sign-off on each document | Not started |
| B0.6 | Vendor terms file | Accepted terms of every vendor stored with date and version; Claude API data-retention terms recorded before Phase 2 | 2–11 | B0.1 | Lead spot-checks the folder | Not started |
| B1.1 | GST invoice checklist | CA completes the checklist in the Legal tab and reviews five sample invoices on day 5 | 5 | Dev 2.5 | CA written sign-off | Not started |
| B1.2 | Cost sheet and unit economics | Per-workspace cost model in the Business plan tab filled with real vendor prices and offers; monthly budget per environment with an 80% alert | 6–9 | B0.1 | Founder reviews; lead confirms infra numbers | Not started |
| B1.3 | Privacy operations | Grievance officer named; export and erasure request process; breach notice template; retention schedule agreed with CA and lawyer | 7–9 | B0.5 | Lawyer confirms duties | Not started |
| B1.4 | Hiring | Offers for the second onboarding partner and support person; contractor and employee agreements with IP assignment signed before day 1 for everyone already working | 1–10 | B0.2 | Signed agreements on file | Not started |
| B1.5 | Go / no-go participation | Founder attends the day-10 gate; business lines of the checklist (legal live, support live, Founding 20 named) evidenced | 10 | all | Decision recorded | Not started |
| B2.1 | Plan billing readiness | Pricing decision after the day-20 readout; GST on our own fees confirmed with CA; refund terms live; billing provider accounts approved | 11–20 | B0.3, Dev 5.5 | CA and lawyer confirm | Not started |
| B2.2 | E-way bill decision | Accountant review with wholesaler and manufacturer pilots; build, integrate or refer out; recorded (feeds Dev 6.4) | 15–18 | B1.1 | Written recommendation | Not started |
| B2.3 | Pilot readout and plan update | G1–G8 results, churn interviews, pricing, Phase 3 reorder, raise-or-bootstrap note | 19–22 | Sales 2.6 | Founder signs off | Not started |

## Sales & success team

Founder for the first five, then the onboarding partners and the success buddy; the CA partner lead joins in month 2. Prefixed S.

| WBS | Work package | Done when | Days | Depends on | Verified by | Status |
| --- | --- | --- | --- | --- | --- | --- |
| S0.1 | Sales playbook adopted | Market fit & sales tab read by everyone selling; five opening questions, three-minute demo and objection answers rehearsed; introduction cards designed and printed | 1–4 | — | Founder runs a role-play with each seller | Not started |
| S0.2 | Channel kit | Tagged sign-up links per channel; QR counter-card design; WhatsApp forward message; Instagram DM script; local business group list | 2–5 | Dev 1.4 (links) | Each tag resolves to a working sign-up | Not started |
| S1.1 | Founding 20 recruitment | Twenty named businesses in the two pilot verticals with a yes, logged in the Business plan tracker with channel tag and buddy | 2–10 | S0.1 | Founder confirms each name personally | Not started |
| S1.2 | Vertical kit review | One real owner per vertical reviews their starter kit wording and items with Dev (Dev 4.2) | 8–9 | S1.1 | Owner's notes attached to the Dev issue | Not started |
| S1.3 | Human support live | WhatsApp Business number, hours, response-time promise, escalation path, five FAQ videos recorded; support person trained on the playbook in the Business plan tab | 6–9 | Dev 3.9 | A test owner gets a human reply within 30 minutes | Not started |
| S1.4 | Set-up visits scheduled | Each Founding 20 business has a visit date in days 10–14 and a named buddy | 8–10 | S1.1 | Calendar reviewed at go / no-go | Not started |
| S2.1 | Set-up visits | Every business leaves the visit with a real quote sent from the owner's phone and the catalog link shared | 10–14 | Dev 4.4 | `catalog_shared` and `quote_shared` events per business | Not started |
| S2.2 | Check-in rhythm | Day 1, 3, 7, 14 and 20 contacts per business from the playbook, logged on the business record | 11–30 | S2.1 | Weekly review shows no missed check-in | Not started |
| S2.3 | Weekly G-review | Monday 30-minute review of G1–G8, three owner quotes, one decision; daily snapshot in Slack #pilot | 11–30 | Dev 4.6 | Notes in Linear | Not started |
| S2.4 | Churn interviews | Any business inactive 5 days is interviewed within 48 hours; reasons tagged | 14–30 | S2.3 | Interview notes attached | Not started |
| S2.5 | CA partner programme | The day-5 CA as partner one; CA brief and demo workspace ready; three introductions asked; five CA partners by day 30 | 11–30 | B1.1 | Partner list with introductions made | Not started |
| S2.6 | Commitment ask (G6) | Every pilot owner asked for a ₹499 commitment on day 20; answers recorded; founding rate and Founding Members wall offered | 20–22 | S2.2 | Count of yes / no / later in the tracker | Not started |
| S2.7 | Testimonials and stories | With consent, three short owner videos and one CA quote after something has gone well | 20–30 | S2.6 | Consent on file | Not started |

## Schedule summary

| Team | Window | Packages | Critical path | Cut line |
| --- | --- | --- | --- | --- |
| Dev · Phase 1 | Days 1–10 | 32 | 0.1 → 1.2 → 1.3 → 1.5 → 2.3 → 2.4 → 2.5 → 2.6 → 4.1 → 4.4 | Unverified by day 9: 3.6 reports, 3.7 admin console, 4.3 Expo shell can slip to days 11–12 |
| Dev · Phase 2 | Days 11–20 | 13 | 5.1 → 5.2 → 5.5 | 5.3 / 5.4 wait on provider eligibility; 5.6 waits on Meta |
| Dev · Phase 3 | Weeks 5–12 | 6 | Set after B2.3 | — |
| Business | Days 1–22 | 14 | B0.2 → B0.5 → Dev 3.11; B0.1 → Dev 5.2–5.4 | Legal text not approved by day 8 blocks launch; nothing else is cut, only late |
| Sales & success | Days 1–30 | 13 | S0.1 → S1.1 → S1.4 → S2.1 → S2.6 | Fewer than 20 yeses by day 10 launches with what there is and keeps recruiting |

**Cross-team dependencies to watch**: Dev 3.11 needs Business B0.5 (lawyer-approved text) by day 8; Dev 4.4 needs Sales S1.1 (the Founding 20) by day 10; Dev 5.2–5.4 need Business B0.1's gateway approvals; Dev 6.4 needs Business B2.2; Sales S2.3 needs Dev 4.6 (events) on day 9.

Assumptions: AI agents generate code for several packages at once; two engineers review and run the verification column; a designer checks every phone screen; an accountant reviews invoices on days 5 and 18; the owner recruits the 20 pilots during days 1–10 so launch is not waiting on outreach. The doc editor (2.3) and the approval flow (2.6) are the riskiest packages; generate them on day 1 as prototypes so verification starts early.
