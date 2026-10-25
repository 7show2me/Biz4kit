# Legal & compliance

Oct 18, 2026 · @Ravin

Rewritten 2026-10-24 to match `docs/decisions.md` (D1–D102). Previous version: `prep/archive/2026-10-24/Legal & compliance.md`.

Everything here is a working draft for a lawyer and a chartered accountant; nothing here is legal or tax advice. Neither is engaged yet: both come in at the end of Phase 2 (D23), together with the company, PAN, GST registration and bank account (D43). Until then:

- **The pilot runs on marked drafts (D92).** Every CA and lawyer item in the product (terms, privacy and consent lines, proforma terms, SAC / HSN codes, the computer-generated note, rounding, "Reverse charge") stays visibly marked as a draft, e.g. "[Draft, lawyer to finalise]" or "[CA to confirm]". The pilot gate passes without their sign-off.
- **Their sign-off is required before paid plans.** Paid plans, payment gateways, SMS DLT and WhatsApp Business wait for the company and the reviews (D43, D49).
- **Nothing is invented.** A legal or tax fact not stated here or in `docs/decisions.md` becomes a Linear question, never a placeholder value.

## Document checklist

| Document | Drafted by | Reviewed by | Needed by | Lives at |
| --- | --- | --- | --- | --- |
| Terms of service | Us (section below) | Lawyer (end of Phase 2, D23) | Draft live before the first pilot sign-in, marked (D92); signed off before paid plans | `/legal/terms`, link in sign-up and footer |
| Privacy notice (DPDP) | Us | Lawyer | Draft live before the first pilot customer record, marked (D92) | `/legal/privacy`, link in footer, request form, My orders |
| Consent lines | Us | Lawyer | Same | Request form, My orders page, invite email |
| Refund and cancellation terms | Us | Lawyer + CA | Before paid plans (Phase 2, D98) | `/legal/refunds`, shown at checkout |
| Acceptable use, abuse and takedown policy | Us | Lawyer | Draft live before the first public subdomain | `/legal/acceptable-use`, report link on public pages |
| Proforma and pay-page wording | Us | Lawyer | Draft live before the first shared proforma | Pay page and proforma `PI-` (D60) |
| Ready messages (16) | Us | Owner approved (D95) | Done | Workspace settings defaults, editable by each business |
| Default invoice terms for businesses | Us | CA | Draft marked "[CA to confirm]" before the first shared invoice | Workspace settings default, editable by the owner |
| GST invoice checklist | Us, from this section | CA | Human check on day 5 (WBS 2.5); CA sign-off before paid plans (D92) | This document, "GST and tax" |
| Warranty and guarantee terms | Each business | — | When a business turns serial numbers on (D85) | The business's own text on its warranty card; Biz4Kit supplies none |
| Data processing terms with vendors (Vercel, AWS, Neon, Upstash, Resend, Claude API; Polar and gateways in Phase 2) | Vendors' standard terms | Lawyer reads them | Before each vendor goes live | Folder of accepted terms |
| Grievance officer and contact | Us | Lawyer confirms the duty | Before pilot (draft) | `/legal/privacy`, footer |
| Breach notification template | Us | Lawyer | Before pilot (draft) | Security runbook |
| Company registration, PAN, GST, bank | CA | — | End of Phase 2, before charging money (D43) | Company records |
| Trademark search and application | IP attorney / lawyer | — | Filing deferred until the lawyer is engaged (D45) | IP file |
| Founder agreement, ESOP outline | Lawyer | Founders | Before any hire or investor; no hires in the pilot (D44) | Company records |
| Contractor and employee agreements (IP assignment, confidentiality) | Lawyer | — | Before anyone besides the founder writes code; one-person project (D24) | Company records |
| AI-generated code and content policy | Us | Lawyer | Draft before pilot | Engineering handbook |
| Record-retention schedule | CA + lawyer | — | Before Phase 2 | PII section of `Workflow & final verification.md` |

## Terms of service (clauses to include)

Written in plain English, short sections, no all-caps. The lawyer turns these into enforceable text.

1. **Who we are and who you are**: Biz4Kit (legal entity name and address: the entity does not exist yet, D43) provides the service to the business (the workspace owner); the business is responsible for its members and its customers.
2. **Account and workspace**: sign-in; the owner controls members and roles; the owner may transfer ownership; we may suspend for abuse (see acceptable use) with notice where possible.
3. **Your content and data**: the business owns its catalog, requests, invoices, customer records, photos and brand; we process them only to provide the service; export is always available in PDF, DOCX and CSV; we never sell data.
4. **Our software**: licensed, not sold; no reverse engineering or resale; we may update it. "Made with Biz4Kit" appears as a footer on the business's catalog, request, booking and My orders pages only, never on the pay page, the invoice PDF or the warranty card (D89).
5. **Customer-facing documents**: proforma (`PI-`) and tax (`INV-`) invoices and warranty cards are the business's documents (D60, D86); the business is responsible for prices, taxes, GST registration, warranty terms and legal accuracy; we provide tools and templates, not tax advice.
6. **Payments**: in Phase 1 we move no money; payment requests show the business's UPI ID and bank details; a "Paid" status reflects the owner's (or a delegated Manager's) approval, not a bank confirmation (D57). In Phase 2, payments run through the provider the business chooses under that provider's terms; we hold no customer funds.
7. **Messages**: in Phase 1 the app sends email only, from the business name with reply-to the owner and never "via Biz4Kit"; SMS and WhatsApp messages are ready to copy (D35, D67). Automated sending on other channels (Phase 2) requires the business to have the customer's consent where the law requires it.
8. **Fees and billing**: free during Phase 1 and the pilot; paid plans (Phase 2, billed through Polar, D98) with prices, billing cycle, taxes and the refund terms below; price changes with 30 days' notice. Plan prices are not decided.
9. **Availability and support**: a stated target (99.5% monthly) and support hours; support in the pilot is the founder's phone (D8); no guarantee of uninterrupted service; planned maintenance notice.
10. **Acceptable use**: incorporated by reference.
11. **Privacy**: incorporated by reference; the business is the data fiduciary for its customers' data, we are its processor (the lawyer confirms DPDP terminology and whether a separate processing agreement is required).
12. **Termination and data after cancellation**: the business can cancel any time; data remains exportable for 30 days, then deleted except what tax law requires; we may terminate for breach.
13. **Liability and indemnity**: limited to fees paid in the last 12 months; the business indemnifies us for its documents and content; no liability for lost profits. (The lawyer sets enforceable limits under Indian law.)
14. **Changes to terms**: notice by email and in-app; continued use is acceptance for non-material changes; material changes need an explicit click.
15. **Governing law and disputes**: India; courts or arbitration at the city the lawyer recommends; a 30-day good-faith resolution step first.
16. **Contact**: support email, grievance officer, postal address (once the entity exists).

## Refund and cancellation terms (draft)

These apply to paid plans, which start in Phase 2 (D98); nothing is charged in Phase 1. Simple enough to say in one breath to an owner: _cancel any time, keep your data, and if we failed you in the first month you get your money back._

| Situation | What happens |
| --- | --- |
| Free plan | Nothing to refund; the workspace stays free until the owner upgrades or deletes it |
| First paid month | Full refund if the owner asks within 30 days of first payment, no questions; one refund per business |
| Monthly plan, later months | Cancel any time; the plan runs to the end of the paid month; no partial refund for the remaining days |
| Annual plan (if offered) | Cancel any time; refund of unused full months minus one month; the lawyer confirms consumer-law duties, if any apply to business customers |
| Downgrade | Takes effect at the next billing date; features above the new plan's limits become read-only, nothing is deleted |
| Our outage below the stated availability target in a month | Service credit of that month's fee on request; the SLA detail sits in the terms |
| Charged in error or duplicate | Refunded within 7 working days to the original method |
| Payments the business's customers make to the business | Not ours to refund; the business handles them with its customer and, in Phase 2, through its payment provider's refund tools |
| After cancellation | Data exportable for 30 days; then deleted except invoice records the business's tax law requires, which the business should have exported |

Refunds are issued through the billing provider (Polar, D98) and may take 5–10 working days to appear. GST on refunded fees is adjusted per the CA's advice.

## Privacy and data protection (DPDP)

India's Digital Personal Data Protection Act, 2023 and its rules apply; the lawyer confirms which duties are in force, who is the data fiduciary for the business's customers, and the exact consent and notice wording. The structure below is what the product needs; the law decides the words.

**Privacy notice (plain-language, one page)**: who we are; what we collect (members: name, email, sign-in id, device; customers of a business: name, phone, optional email and address, GST number, requests, invoices, payment proofs, serial numbers and warranty cards when the business uses them, D85); why (to provide the service to the business); who sees it (the business's members by role; our team for support with consent logging; vendors listed by name: Vercel, AWS in Mumbai, Neon, Upstash, Resend, and in Phase 2 payment providers, messaging and the AI vendor); where it is stored (India, Mumbai region: Neon AWS Mumbai, D4; S3 Mumbai, D31); how long (the retention table in `Workflow & final verification.md`); your rights (access, correction, erasure, grievance) and how to use them; the grievance officer's contact; how we tell you about changes.

**Public pages and the phone number**: a customer's phone is never shown in full on a public page. It is masked (only the last four digits show) on My orders and on the warranty card, which opens for anyone holding its private link (D86).

**Consent lines (draft, lawyer to finalise)**

The button on customer pages says "Request a quote" (D101); the record behind it is a request (a lead, D59), and the business answers with a reply (a proforma invoice, D60).

- Request form: "By sending this request you agree that {business} may contact you about it and store your details to reply to it. [Privacy notice]" [Draft, lawyer to finalise]
- My orders page: "This page shows your requests, bookings and invoices with {business}. Ask {business} to update or delete your details at any time." [Draft, lawyer to finalise]
- Member invite email: "By joining {business} on Biz4Kit you agree to our terms and privacy notice." [Draft, lawyer to finalise]

**Rights handling**: requests arrive by email, phone or the in-app form; logged in the admin console with a 7-day target for export and 30 days for erasure; erasure anonymises the Customer and keeps invoice numbers and totals for tax; the business is told when a customer asks us directly.

**Vendors**: a list of processors with purpose, location and the terms accepted; updated before any new vendor goes live; the Claude API vendor terms on data retention recorded before Phase 2 ingest.

**Breach**: detection goes to the one human within an hour; the lawyer (once engaged) decides on notification to the authority and affected people; a pre-written notice template exists; the incident and the fix are recorded.

**Children**: the product is for businesses; we do not knowingly collect children's data; a customer under 18 is handled per the lawyer's advice.

**Cookies**: first-party session and preference cookies only; analytics pseudonymous; a short cookie line in the notice, no banner unless the lawyer says one is required.

## Acceptable use, abuse and takedown

Free public pages under our domain (`<brand>.biz4kit.com`, D47) are an invitation to phishing, so the policy is strict and the response is fast.

**Not allowed**: impersonating a bank, government body, payment provider or another business; collecting card numbers, OTPs, passwords or government IDs through our pages; selling prohibited goods or services; harassment or unlawful content; spamming customers through automated channels without consent; attempting to access another workspace.

**Controls built in** (WBS 3.8): reserved and look-alike slugs refused at creation; new workspaces reviewed in the admin console within 24 hours; a "Report this page" link in the footer of every public page; rate limits; pattern checks on catalog text (card, OTP, PIN, KYC prompts).

**Takedown procedure**

1. Report received (form, email or internal flag) → logged with time.
2. Within 4 hours: the human reviews; if the page is a clear impersonation or data-collection attempt, the workspace's public pages are suspended immediately and the owner is emailed.
3. Within 2 working days: the owner may respond; reinstatement or permanent closure is decided and recorded.
4. Where the law requires, the matter is reported to the authority the lawyer names; evidence is preserved.
5. Repeat offenders and linked identities are blocked at sign-up.

**Our own conduct**: we do not read a business's data except for support with a logged consent, abuse review, or legal obligation; we tell the owner when we have.

## Proforma, invoice and warranty wording

These words sit between the business and its customer, so they are short, in the business's name, and editable by the owner within limits the lawyer sets.

**No quote record, no Accept button (D60).** The priced reply to a request is a proforma invoice (`PI-`, not a tax invoice), and paying it is the acceptance. Editing before payment makes a new version under the same `PI-` number; a payment made against an older version is applied to the latest version, with a note of the difference (D76). When the payment is approved, the tax invoice takes the next gap-free `INV-` number, a series separate from `PI-` (D60, D71), for every vertical (D90). Pay-page wording is drafted and marked; the lawyer reviews it.

**Optional lines (D102)**: the customer ticks optional lines on the pay page; the amount updates as they tick; the business sees the choice with the payment.

**Default proforma terms (owner can edit)**: validity; what the price includes and excludes; advance required, if any (each business sets its own %, D66; an advance is its own invoice, D70); how changes are handled (a new version under the same `PI-` number); cancellation; how to raise a problem. Marked "[CA to confirm]" until reviewed.

**Default invoice terms (owner can edit)**: due date; accepted payment methods (UPI ID, bank details); "shown as received once {business} confirms"; late-payment note, if the business wants one; the business's contact for disputes.

**Warranty card (D85, D86)**: one card per invoice row that has a serial number; it shows the product, model, serial, batch (if any), invoice, cover type (warranty or guarantee), start (the invoice date) and end date. The cover terms are the business's own; Biz4Kit supplies none and the card says so until the business adds them.

**What we never let the owner remove**: the `PI-` / `INV-` number and version, the validity date, the business's legal name and contact, and GST fields when the business is registered. The lawyer confirms whether paying the proforma as acceptance is sufficient evidence for the business's purposes and whether any consumer-protection text is required for consumer-facing verticals (salons, restaurants).

## GST and tax (accountant's checklist)

The human checks five sample invoices on day 5 and again before the pilot against this list; the CA signs it off when engaged, before paid plans (D92). Items marked _confirm_ are open: the CA decides, and the product shows them marked until then.

- [ ] Invoice fields: supplier legal name, address, GSTIN; invoice number and date (a tax invoice is dated the day its `INV-` number is given); customer name and address; customer GSTIN for B2B; **place of supply from the customer's state** (taken from the first two digits of the customer's GSTIN when they have one, else the business's own state; B2C rules beyond that _confirm_); **HSN or SAC per line**, copied onto the line when the invoice is written (the codes themselves _confirm_); description, quantity, unit, rate, taxable value; tax rate and amount split as CGST + SGST within the state or IGST across states; total in figures and words; signature or "computer-generated" note (_confirm_ exact wording); "Reverse charge" line (_confirm_ whether and how it is shown)
- [ ] Numbering: consecutive, unique per financial year, no gaps; our rule (`PI-` until the payment is approved, then the next `INV-` number; separate series, `INV-` gap-free, D60, D71, D90) is acceptable (_confirm_); whether the counter resets each financial year (_confirm_)
- [ ] Proforma invoices clearly marked "Not a tax invoice"; no GST liability arises from them (_confirm_)
- [ ] Advance invoices and receipt vouchers: how an advance is documented and taxed (_confirm_); advance and balance are two invoices, each `PI-` then `INV-` on approval, and together they carry the full price and the full GST with nothing taxed twice (D70)
- [ ] Part payments: a bill with some payment approved and some still due shows "Part paid" (D55); the tax invoice is issued when approved payments cover the total (D71) (_confirm_ the treatment of part payments)
- [ ] Serial-numbered goods (D85, D86): each unit is its own row once serials are entered (amounts unchanged); the proforma shows model and warranty / guarantee cover, not the serial; the tax invoice shows serial and batch (_confirm_ nothing further is required on the invoice)
- [ ] Credit notes (Phase 2): required fields and linkage to the original invoice
- [ ] Unregistered businesses: invoices without GST fields; the threshold and wording (_confirm_)
- [ ] Composition scheme businesses: special wording on the invoice (_confirm_)
- [ ] E-invoicing: applies above a turnover threshold; whether any pilot business crosses it (_confirm_; likely not for small businesses)
- [ ] E-way bills: goods above ₹50,000 in transit; decision for wholesalers and manufacturers in WBS 6.4
- [ ] Our own plan fees (Phase 2): GST on subscriptions, invoices we issue to businesses, SAC code, place of supply for interstate customers (_confirm_); needs our own GST registration first (D43)
- [ ] Record retention period for invoices and payment proofs (_confirm_; the PII table assumes 8 years)
- [ ] Rounding: paise handling and rounding on the total (_confirm_; the product stores money in paise)

## Messaging and payments regulation

| Area | What applies (verify with the provider or lawyer) | What we do |
| --- | --- | --- |
| SMS to Indian numbers | Commercial SMS requires sender-ID and template registration on the telecom DLT system; unregistered messages are blocked | Phase 1 sends no SMS: messages are ready to copy (D67). DLT registration needs the company and waits until after Phase 2 (D49); SMS stays transactional, never promotional |
| WhatsApp Business API | Meta's business and messaging policies: approved templates for outbound, opt-in required, 24-hour service window for free-form replies | Phase 1 sends nothing on WhatsApp: messages are ready to copy (D67). The Meta application waits until after Phase 2 (D49); then opt-in is captured on the request form, templates mirror the ready messages, and the business, not us, is the sender |
| Email | Anti-spam norms: identified sender, working unsubscribe for anything non-transactional | Transactional only in Phase 1; sender name is the business, reply-to the owner, never "via Biz4Kit" (D35); sent from our domain (biz4kit.com, D47) through Resend; one-click unsubscribe on anything marketing |
| Payment gateways | Provider terms, KYC on the business, prohibited categories; Stripe's eligibility for Indian service businesses unconfirmed | Razorpay and Stripe wait until after Phase 2 (D49); adapters; the business signs up with the provider directly; we never see card data (hosted pages only) |
| Our own billing | Polar's terms for subscription billing | Polar bills our paid plans from Phase 2 (D98); needs the company first (D43, D49) |
| Holding or routing money | Operating as a payment aggregator or wallet is regulated in India | We never hold funds; payments go business-to-provider-to-business; this is a design rule, recorded in the terms |
| UPI QR | Static UPI QR codes are the business's own VPA; we only render them | Show the business's UPI ID and name; verify the VPA format; never our own VPA |
| Consumer protection | Consumer-facing verticals may have duties on pricing display and grievance handling | The lawyer confirms; the owner's terms template includes a grievance line |

## Company, IP and people

| Item | Status and decision | Note |
| --- | --- | --- |
| Legal entity | Not formed yet (D6). Company, PAN, TAN, GST registration and bank account are deferred until Phase 2 is complete (D43). Private limited (recommended if raising) or LLP is still to be chosen | Needed before any paid plan and before store accounts (Apple requires an entity) |
| Product name | Biz4Kit is locked; the three-name test is dropped (D5). Trademark filing waits until the lawyer is engaged (D45). Domain biz4kit.com (D46, D47) | Availability and conflicts not yet checked by an attorney |
| CA and lawyer | Not engaged; both come in at the end of Phase 2 (D23) | Their sign-off is required before paid plans (D92) |
| Founder agreement | Equity split, vesting, roles, decision rights, what happens if someone leaves | Before the first hire or investor |
| Team | One-person project: one agent, one human (D24, D27); no hires in the pilot (D44) |  |
| Employee and contractor agreements | Confidentiality, IP assignment to the company, non-solicit; contractors invoice with GST where applicable | Before anyone besides the founder writes code or sees customer data |
| AI-generated code and content | Policy: all generated code is reviewed and owned by the company; licences of dependencies checked; no copying of third-party code; vendor terms on output ownership recorded | The lawyer confirms the position on ownership of AI-generated work under Indian law |
| Open-source licences | Allow-list (MIT, Apache-2.0, BSD); copyleft needs the human's approval; an automated licence scan in CI | Part of WBS 4.1 |
| Insurance | Cyber and professional indemnity once revenue starts | Ask a broker before Phase 2 billing |
| Vendor terms | Vercel, AWS, Neon, Upstash, Resend, Claude API; Polar and payment providers in Phase 2: accepted terms stored with date and version | Folder owned by the human |
| Investor readiness | Cap table, board minutes, IP assignments, data room | Only if raising; `Business plan.md` holds the narrative |
