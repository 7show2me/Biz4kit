# Legal & compliance

Oct 18, 2026 · @Ravin

Everything in this tab is a working draft for a lawyer and a chartered accountant to review; nothing here is legal or tax advice and nothing goes live until they have signed it off. The two things that cannot wait are company registration (needed before any paid plan) and the privacy notice and consent lines (needed before the first pilot customer's data is stored).

## Document checklist

| Document | Drafted by | Reviewed by | Needed by | Lives at |
| --- | --- | --- | --- | --- |
| Terms of service | Us (section below) | Lawyer | Before the first pilot sign-in | `/legal/terms`, link in sign-up and footer |
| Privacy notice (DPDP) | Us | Lawyer | Before the first pilot customer record | `/legal/privacy`, link in footer, portal form, My orders |
| Consent lines | Us | Lawyer | Same | Quote-request form, My-orders page, invite email |
| Refund and cancellation terms | Us | Lawyer + CA | Before Phase 2 billing | `/legal/refunds`, shown at checkout |
| Acceptable use, abuse and takedown policy | Us | Lawyer | Before the first public subdomain | `/legal/acceptable-use`, report link on public pages |
| Quote-acceptance wording | Us | Lawyer | Before the first shared quote | Accept button and confirmation on the quote page |
| Default invoice terms for businesses | Us | CA | Before the first shared invoice | Workspace settings default, editable by the owner |
| GST invoice checklist | CA | — | Day 5 (WBS 2.5 verification) | This tab, section 7 |
| Data processing terms with vendors (hosting, email, Claude API, gateways) | Vendors' standard terms | Lawyer reads them | Before each vendor goes live | Folder of signed or accepted terms |
| Grievance officer and contact | Us | Lawyer confirms the duty | Before pilot | `/legal/privacy`, footer |
| Breach notification template | Us | Lawyer | Before pilot | Security runbook |
| Company registration, PAN, GST, bank | Company secretary / CA | — | Before charging money | Company records |
| Trademark search and application | IP attorney | — | Search now; file before public launch | IP file |
| Founder agreement, ESOP outline | Lawyer | Founders | Before any hire or investor | Company records |
| Contractor and employee agreements (IP assignment, confidentiality) | Lawyer | — | Before anyone writes code | Company records |
| AI-generated code and content policy | Us | Lawyer | Before pilot | Engineering handbook |
| Record-retention schedule | CA + lawyer | — | Before Phase 2 | PII section of the Workflow tab |

## Terms of service (clauses to include)

Written in plain English, short sections, no all-caps. The lawyer turns these into enforceable text.

1. **Who we are and who you are**: Biz4Kit (legal entity name, address) provides the service to the business (the workspace owner); the business is responsible for its members and its customers.
2. **Account and workspace**: Google sign-in; the owner controls members and roles; the owner may transfer ownership; we may suspend for abuse (see acceptable use) with notice where possible.
3. **Your content and data**: the business owns its catalog, quotes, invoices, customer records and brand; we process them only to provide the service; export is always available in PDF, DOCX and CSV; we never sell data.
4. **Our software**: licensed, not sold; no reverse engineering or resale; we may update it; the free plan carries a badge on the catalog page only.
5. **Customer-facing documents**: quotes and invoices are the business's documents; the business is responsible for prices, taxes, GST registration and legal accuracy; we provide tools and templates, not tax advice.
6. **Payments**: in Phase 1 we move no money; payment requests show the business's UPI ID and bank details; a "Paid" status reflects the owner's approval, not a bank confirmation. In Phase 2, payments run through the provider the business chooses under that provider's terms; we hold no customer funds.
7. **Messages**: ready messages are sent by the business from its own accounts; automated sending (Phase 2) requires the business to have the customer's consent where the law requires it.
8. **Fees and billing**: free during Phase 1 and the pilot; paid plans, prices, billing cycle, taxes, and the refund terms below; price changes with 30 days' notice.
9. **Availability and support**: a stated target (99.5% monthly) and support hours; no guarantee of uninterrupted service; planned maintenance notice.
10. **Acceptable use**: incorporated by reference.
11. **Privacy**: incorporated by reference; the business is the data fiduciary for its customers' data, we are its processor (the lawyer confirms DPDP terminology and whether a separate processing agreement is required).
12. **Termination and data after cancellation**: the business can cancel any time; data remains exportable for 30 days, then deleted except what tax law requires; we may terminate for breach.
13. **Liability and indemnity**: limited to fees paid in the last 12 months; the business indemnifies us for its documents and content; no liability for lost profits. (Lawyer sets enforceable limits under Indian law.)
14. **Changes to terms**: notice by email and in-app; continued use is acceptance for non-material changes; material changes need an explicit click.
15. **Governing law and disputes**: India; courts or arbitration at the city the lawyer recommends; a 30-day good-faith resolution step first.
16. **Contact**: support email, grievance officer, postal address.

## Refund and cancellation terms (draft)

Simple enough to say in one breath to an owner: *cancel any time, keep your data, and if we failed you in the first month you get your money back.*

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

Refunds are issued through the provider that took the payment (Razorpay, Stripe or Polar) and may take 5–10 working days to appear. GST on refunded fees is adjusted per the CA's advice.

## Privacy and data protection (DPDP)

India's Digital Personal Data Protection Act, 2023 and its rules apply; the lawyer confirms which duties are in force, who is the data fiduciary for the business's customers, and the exact consent and notice wording. The structure below is what the product needs; the law decides the words.

**Privacy notice (plain-language, one page)**: who we are; what we collect (members: name, email, Google id, device; customers of a business: name, phone, optional email and address, GST number, quotes, invoices, payment proofs); why (to provide the service to the business); who sees it (the business's members by role; our team for support with consent logging; vendors listed by name: hosting, email, and in Phase 2 payment providers, messaging and the AI vendor); where it is stored (India, Mumbai region); how long (the retention table in the Workflow tab); your rights (access, correction, erasure, grievance) and how to use them; the grievance officer's contact; how we tell you about changes.

**Consent lines (draft, lawyer to finalise)**

- Quote-request form: "By sending this request you agree that {business} may contact you about it and store your details to prepare your quote. \[Privacy notice\]"
- My-orders page: "This page shows your quotes, bookings and invoices with {business}. Ask {business} to update or delete your details at any time."
- Member invite email: "By joining {business} on Biz4Kit you agree to our terms and privacy notice."

**Rights handling**: requests arrive by email, WhatsApp or the in-app form; logged in the admin console with a 7-day target for export and 30 days for erasure; erasure anonymises the Customer and keeps invoice numbers and totals for tax; the business is told when a customer asks us directly.

**Vendors**: a list of processors with purpose, location and the terms accepted; updated before any new vendor goes live; the Claude API vendor terms on data retention recorded before Phase 2 ingest.

**Breach**: detection goes to the lead within an hour; lawyer decides on notification to the authority and affected people; a pre-written notice template exists; the incident and the fix are recorded.

**Children**: the product is for businesses; we do not knowingly collect children's data; a customer under 18 is handled per the lawyer's advice.

**Cookies**: first-party session and preference cookies only; analytics pseudonymous; a short cookie line in the notice, no banner unless the lawyer says one is required.

## Acceptable use, abuse and takedown

Free public pages under our domain are an invitation to phishing, so the policy is strict and the response is fast.

**Not allowed**: impersonating a bank, government body, payment provider or another business; collecting card numbers, OTPs, passwords or government IDs through our pages; selling prohibited goods or services; harassment or unlawful content; spamming customers through automated channels without consent; attempting to access another workspace.

**Controls built in** (WBS 3.8): reserved and look-alike slugs refused at creation; new workspaces reviewed in the admin console within 24 hours; a "Report this page" link in the footer of every public page; rate limits; pattern checks on catalog text (card, OTP, PIN, KYC prompts).

**Takedown procedure**

1. Report received (form, email or internal flag) → logged with time.
2. Within 4 hours: a human reviews; if the page is a clear impersonation or data-collection attempt, the workspace's public pages are suspended immediately and the owner is emailed.
3. Within 2 working days: the owner may respond; reinstatement or permanent closure is decided by the lead and recorded.
4. Where the law requires, the matter is reported to the authority the lawyer names; evidence is preserved.
5. Repeat offenders and linked identities are blocked at sign-up.

**Our own conduct**: we do not read a business's data except for support with a logged consent, abuse review, or legal obligation; we tell the owner when we have.

## Quote-acceptance and invoice wording

These words sit between the business and its customer, so they are short, in the business's name, and editable by the owner within limits the lawyer sets.

**Quote page, above the Accept button (draft)**: "By tapping Accept, you confirm this quote ({quote\_no}, version {version}) from {business} for {total}, valid until {valid\_until}. {business} will contact you about next steps. A copy is saved to your orders page."

**After acceptance**: "Accepted by {name} on {date} at {time}." shown to both sides; the record stores name, phone, IP, time and the exact version.

**Default quote terms (owner can edit)**: validity; what the price includes and excludes; advance required, if any; how changes are handled (a new version); cancellation; how to raise a problem.

**Default invoice terms (owner can edit)**: due date; accepted payment methods (UPI ID, bank details); "status shows Paid once {business} confirms receipt"; late-payment note, if the business wants one; the business's contact for disputes.

**What we never let the owner remove**: the quote number and version, the validity date, the business's legal name and contact, and GST fields when the business is registered. The lawyer confirms whether an online tap-to-accept is sufficient evidence for the business's purposes and whether any consumer-protection text is required for consumer-facing verticals (salons, restaurants).

## GST and tax (accountant's checklist)

The CA checks five sample invoices on day 5 and again before the pilot; this list is what they check. Items marked *confirm* are ones I am not certain about and the CA must decide.

- [ ] Invoice fields: supplier legal name, address, GSTIN; invoice number and date; customer name and address; customer GSTIN for B2B; place of supply; HSN or SAC per line; description, quantity, unit, rate, taxable value; tax rate and amount split as CGST + SGST or IGST; total in figures and words; signature or "computer-generated" note (*confirm* exact wording)
- [ ] Numbering: consecutive, unique per financial year, no gaps; our "number assigned at first share" rule is acceptable (*confirm*)
- [ ] Proforma invoices clearly marked as not a tax invoice; no GST liability arises from them (*confirm*)
- [ ] Advance invoices and receipt vouchers: how an advance is documented and taxed (*confirm*)
- [ ] Credit notes (Phase 2): required fields and linkage to the original invoice
- [ ] Unregistered businesses: invoices without GST fields; the threshold and wording (*confirm*)
- [ ] Composition scheme businesses: special wording on the invoice (*confirm*)
- [ ] E-invoicing: applies above a turnover threshold; whether any pilot business crosses it (*confirm*; likely not for small businesses)
- [ ] E-way bills: goods above ₹50,000 in transit; decision for wholesalers and manufacturers in WBS 6.4
- [ ] Our own plan fees: GST on subscriptions, invoices we issue to businesses, SAC code, place of supply for interstate customers (*confirm*)
- [ ] Record retention period for invoices and payment proofs (*confirm*; the PII table assumes 8 years)
- [ ] Rounding: paise handling and rounding on the total (*confirm*)

## Messaging and payments regulation

| Area | What applies (verify with the provider or lawyer) | What we do |
| --- | --- | --- |
| SMS to Indian numbers | Commercial SMS requires sender-ID and template registration on the telecom DLT system; unregistered messages are blocked | Register the sender and every template before Phase 2 OTP or SMS; keep SMS transactional, never promotional, in Phase 1 and 2 |
| WhatsApp Business API | Meta's business and messaging policies: approved templates for outbound, opt-in required, 24-hour service window for free-form replies | Opt-in captured on the quote-request form; templates mirror the ready messages; the business, not us, is the sender |
| Email | Anti-spam norms: identified sender, working unsubscribe for anything non-transactional | Transactional only in Phase 1; sender is the business with our domain; one-click unsubscribe on anything marketing |
| Payment gateways | Provider terms, KYC on the business, prohibited categories; Stripe's and Polar's eligibility for Indian service businesses unconfirmed | Adapters; the business signs up with the provider directly; we never see card data (hosted pages only) |
| Holding or routing money | Operating as a payment aggregator or wallet is regulated in India | We never hold funds; payments go business-to-provider-to-business; this is a design rule, recorded in the terms |
| UPI QR | Static UPI QR codes are the business's own VPA; we only render them | Show the business's UPI ID and name; verify the VPA format; never our own VPA |
| Consumer protection | Consumer-facing verticals may have duties on pricing display and grievance handling | The lawyer confirms; the owner's terms template includes a grievance line |

## Company, IP and people

| Item | Decision needed | Note |
| --- | --- | --- |
| Legal entity | Private limited company (recommended if raising) or LLP; registered office; PAN, TAN, GST registration; business bank account | Needed before any paid plan and before store accounts (Apple requires an entity) |
| Product name | Trademark search for Biz4Kit (word and logo) in the relevant classes; file before public launch; domain already available | I have not checked availability or conflicts; an IP attorney should |
| Founder agreement | Equity split, vesting, roles, decision rights, what happens if someone leaves | Before the first hire or investor |
| Employee and contractor agreements | Confidentiality, IP assignment to the company, non-solicit; contractors invoice with GST where applicable | Before anyone writes code or sees customer data |
| AI-generated code and content | Policy: all generated code is reviewed and owned by the company; licences of dependencies checked; no copying of third-party code; vendor terms on output ownership recorded | The lawyer confirms the position on ownership of AI-generated work under Indian law |
| Open-source licences | Allow-list (MIT, Apache-2.0, BSD); copyleft needs lead approval; an automated licence scan in CI | Part of WBS 4.1 |
| Insurance | Cyber and professional indemnity once revenue starts | Ask a broker before Phase 2 billing |
| Vendor terms | Hosting, email, payment providers, messaging, Claude API: accepted terms stored with date and version | Folder owned by the lead |
| Investor readiness | Cap table, board minutes, IP assignments, data room | Only if raising; the Business plan tab holds the narrative |
