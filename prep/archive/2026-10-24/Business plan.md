# Business plan

Oct 18, 2026 · @Ravin

Biz4Kit earns a subscription from small service businesses that want to look professional and get paid without chasing; the pilot proves that in 20 days, and the numbers below show what each workspace costs us and what it must pay. Every figure is an assumption to be replaced by pilot data; no market-size claim is made because none has been verified.

## One-page summary

|                              |                                                                                                                                                                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What**                     | A white-label workspace where a small service business publishes its catalog, ~~sends quotes customers accept on the page~~ replies to requests with a proforma invoice (`PI-`) the customer pays on the page (D60), books and tracks the work, invoices with GST, and gets paid by UPI, all under its own name. Internally, the helper layer is called Apna Pradhan. |
| **Who**                      | Businesses with 1–15 people: salons, design and IT agencies first; restaurants, small manufacturers and IndiaMART wholesalers after the e-way bill decision. Starting in Nashik, Maharashtra.                                                                             |
| **Why now**                  | UPI made getting paid easy but left quoting and invoicing in WhatsApp and Word; AI-generated code lets a two-person team ship a full product in 10 days and keep the price at a small-business level.                                                                     |
| **How we win**               | Not on features (copyable in days) but on the owner's feeling of looking bigger than they are, local-language human service, CA and association distribution, and a trust history that grows with every ~~quote~~ reply (D60) and payment.                                                |
| **Business model**           | Free plan with volume limits; ₹499, ₹1,499 and ₹3,999 per month plans; no payment-platform fees; all three gateways offered, business chooses. Free for everyone through the 10-day build and the 20-day pilot.                                                           |
| **Proof we are looking for** | GTM tests G1–G8 in the Outline: catalog shared within 24 h, ~~quote~~ priced reply (D60) in under 10 minutes, 30% acceptance, invoices paid in 7 days, 60% weekly active, 8 of 20 saying yes to ₹499.                                                                                            |
| **What we need**             | Two engineers reviewing AI agents, one designer, an accountant and a lawyer on call, a support person, and about 30 days of runway to reach the pilot readout; funding needs are in the milestones section.                                                               |

## Cost per workspace and unit economics

Assumptions, not quotes: each line names what it depends on, and the pilot replaces it with a measured number. Figures are monthly, in INR, for an average active workspace in its first year.

**Variable cost per active workspace (Phase 1 features)**

| Item                             | Assumption                                                                                                                                            | Cost / month   |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Hosting, database, storage share | 2,000 workspaces on a fixed stack of about ₹40,000 / month                                                                                            | ₹20            |
| Email                            | 150 transactional emails at roughly ₹0.10 each                                                                                                        | ₹15            |
| PDF and export rendering         | 60 documents; compute share                                                                                                                           | ₹5             |
| File storage and bandwidth       | 200 MB of proofs, logos, photos                                                                                                                       | ₹5             |
| Support                          | 1 support person for 400 workspaces at ₹40,000 / month                                                                                                | ₹100           |
| Payment processing               | Phase 1: none (UPI QR is free to the business). Phase 2 gateway fees are paid by the business to the provider                                         | ₹0             |
| **Total Phase 1**                |                                                                                                                                                       | **about ₹145** |
| Phase 2 additions                | WhatsApp API messages (about ₹0.80 per template message × 60), SMS OTP (₹0.25 × 40), Claude API ingest (one price-list parse a month, well under ₹10) | about ₹70      |
| **Total Phase 2**                |                                                                                                                                                       | **about ₹215** |

**Fixed cost (first six months)**: see the hiring plan; roughly ₹6–8 lakh per month for the team in the plan, plus about ₹1 lakh for tools, legal, accounting and devices. These are placeholder salary assumptions for Nashik and must be replaced with real offers.

**Unit economics at the planned prices**

| Plan    | Price  | Variable cost                          | Gross margin | Notes                                                 |
| ------- | ------ | -------------------------------------- | ------------ | ----------------------------------------------------- |
| Free    | ₹0     | about ₹100 (support is the bulk)       | negative     | Capped by volume; must convert or stay cheap to serve |
| Starter | ₹499   | about ₹215                             | about 57%    | Thin; support cost is the lever                       |
| Team    | ₹1,499 | about ₹300 (more users, more messages) | about 80%    | The plan the model depends on                         |
| Agency  | ₹3,999 | about ₹500                             | about 87%    | Few customers, high value                             |

**Break-even sketch**: at a 60 / 30 / 10 split of Starter / Team / Agency among paying workspaces, average revenue is about ₹1,150 and average variable cost about ₹270, so each paying workspace contributes about ₹880 a month. Covering ₹7 lakh of fixed cost needs about 800 paying workspaces. If one in four free workspaces converts, that is about 3,200 total workspaces. The pilot's job is to test the conversion rate (G6) and the support cost, which move this number most.

**Payback**: if acquiring a paying workspace costs about ₹2,000 (a visit, a QR kit, a month of free use), payback is under three months at the average contribution above; churn above 5% a month breaks the model and is why G5 matters.

## Pilot plan and tracker

Twenty named businesses in two verticals, recruited before day 10, each with a set-up visit and a named success buddy. The tracker below is the working list; add a row per business as they say yes.

**Founding 20 tracker**

| #   | Business | Vertical         | City   | Channel | Owner contact | Buddy | Set-up visit | Status      |
| --- | -------- | ---------------- | ------ | ------- | ------------- | ----- | ------------ | ----------- |
| 1   |          | Salon            | Nashik |         |               |       |              | Not started |
| 2   |          | Salon            | Nashik |         |               |       |              | Not started |
| 3   |          | Salon            | Nashik |         |               |       |              | Not started |
| 4   |          | Design agency    |        |         |               |       |              | Not started |
| 5   |          | Design agency    |        |         |               |       |              | Not started |
| 6   |          | IT services      |        |         |               |       |              | Not started |
| 7   |          | IT services      |        |         |               |       |              | Not started |
| 8   |          | (add rows to 20) |        |         |               |       |              | Not started |

**Channels and their tags**: personal network (`ref-founder`), salon Instagram DMs (`ig-salon`), agency and IT referrals (`ref-agency`), local business WhatsApp groups (`wa-group`), QR counter kit (`qr-kit`), CA introductions (`ca-partner`). Every sign-up link carries its tag so G7 and G8 can be attributed.

**Weekly rhythm (pilot days 11–30)**

| When                             | What                                                                    | Who            |
| -------------------------------- | ----------------------------------------------------------------------- | -------------- |
| Daily 18:30                      | G1–G8 snapshot to Slack #pilot                                          | Lead           |
| Day 1, 3, 7, 14, 20 per business | Buddy check-ins from the sales playbook; notes in the business's record | Buddy          |
| Weekly, Monday                   | 30-minute review: numbers, three owner quotes, one decision             | Whole team     |
| Day 14                           | Churn interviews with anyone inactive for 5 days                        | Founder        |
| Day 20                           | Commitment ask (G6), recorded per business                              | Buddy          |
| Day 20–22                        | Pilot readout: pass / fail per test, pricing decision, Phase 3 reorder  | Founder + lead |

**Exit from pilot**: businesses stay on the founding rate; the Founding Members wall goes live with consent; anyone who says no to paying is asked one question, why, and thanked.

## Support playbook

One named person, reachable where owners already are, answering like a person, not a ticket system.

| Item          | Rule                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Channels      | WhatsApp Business number (primary), phone call-back, email; in-app "Need help?" opens WhatsApp with the workspace id prefilled                                           |
| Hours         | 9:00–20:00 IST, Monday to Saturday during the pilot; out-of-hours auto-reply with the next-morning promise                                                               |
| Response time | First human reply within 30 minutes in hours; fix or workaround within 4 hours for anything blocking a ~~quote~~ reply (D60) or a payment; everything else within 1 working day          |
| Language      | Hindi, Marathi and English; voice notes welcome and answered with voice notes                                                                                            |
| Tone          | First name, no scripts read aloud, no "ticket number"; say what you will do and when                                                                                     |
| Escalation    | Blocking bug → Slack #alerts and the on-call engineer immediately; data or security concern → #security and the lead; abuse report → takedown procedure in the Legal tab |
| Logging       | Every conversation summarised on the business's record (no customer PII copied); recurring issues become Linear issues with a `pilot-feedback` label                     |
| Self-help     | Five one-minute videos (set up brand, first ~~quote~~ reply (D60), share on WhatsApp, record a payment, approve a proof); a short FAQ; no long help centre in Phase 1                    |
| Promises      | Never promise a feature date; promise a call-back time and keep it                                                                                                       |
| Metrics       | First-response time, time to resolve, conversations per workspace per week, top three issues; reviewed Monday                                                            |

## CA partner programme

A chartered accountant who trusts our invoices recommends us to every small-business client; one CA can be worth twenty door visits.

- **Offer to the CA**: a free read-only Accountant role on every client workspace, month-end CSV and PDF exports in one click, an audit log, and a one-page note on how our GST fields are built. No payment for recommendations; a thank-you and public credit if they want it.
- **Offer to their clients**: a founding rate and a set-up visit.
- **Start**: the CA who reviews our sample invoices on day 5 is partner number one; ask them for three introductions. Aim for five CA partners by day 30.
- **Materials**: a two-page CA brief (what we do, what we don't, GST handling, export formats, data safety), a demo workspace with sample invoices, a WhatsApp message they can forward.
- **Rules**: a CA's feedback on invoice correctness goes straight into Linear with priority; we never market to a CA's client list without the client's consent.
- **Later**: Tally and Zoho Books sync (Phase 3) is built with these partners and is the reason they stay.

## Team and hiring plan (first six months)

Small on purpose: AI agents write most code, so the humans are verifiers, designers, sellers and supporters. Salary figures are placeholders for Nashik and must be replaced by real offers.

| Role                               | When                         | Count                                        | What they own                                                  | Placeholder cost / month               |
| ---------------------------------- | ---------------------------- | -------------------------------------------- | -------------------------------------------------------------- | -------------------------------------- |
| Founder                            | Now                          | 1                                            | Story, Founding 20, numbers, go / no-go                        | —                                      |
| Lead engineer (reviewer of record) | Day 1                        | 1                                            | Architecture, verification column, production access, security | ₹1.5–2.5 lakh                          |
| Second engineer                    | Day 1                        | 1                                            | Verification, infra, connectors in Phase 2                     | ₹1–1.5 lakh                            |
| Product designer                   | Day 1                        | 1 (contract ok)                              | Screens, brand, phone reviews, PDF templates, QR kit           | ₹80,000–1.2 lakh                       |
| Onboarding partner / success buddy | Day 5                        | 1, then 2 by month 3                         | Set-up visits, check-ins, commitment asks; Hindi and Marathi   | ₹35,000–50,000 each                    |
| Support                            | Day 8                        | 1 (can be the same person as above at first) | WhatsApp and phone support, FAQ videos                         | ₹30,000–40,000                         |
| Chartered accountant               | Day 1, retainer              | on call                                      | Invoice review, GST questions, e-way decision, our own filings | ₹15,000–30,000                         |
| Lawyer                             | Day 1, retainer              | on call                                      | Terms, privacy, consents, company papers                       | ₹20,000–50,000 (plus one-off drafting) |
| CA partner lead (sales)            | Month 2                      | 1                                            | CA programme, associations, vertical kits with owners          | ₹50,000–80,000                         |
| Third engineer                     | Month 4, if the pilot passes | 1                                            | Phase 3: domains, API, accounting sync, native app             | ₹1–1.5 lakh                            |

**Not hiring**: a marketing team (the product and the owners market it), a QA team (verification is the engineers' job), a sales team beyond the buddies (sales is onboarding).

**Principles**: everyone talks to owners every week, including engineers; every hire gets the Market fit & sales tab on day one; no one holds production credentials except the two engineers.

## Milestones and funding needs

&#91;embedded content: milestones and gates · day 1 to month 12 · funding note\]

The only committed dates are the first thirty days. Everything after the readout is a target that the pilot confirms or changes. The runway figures use the placeholder team costs above (about ₹7–9 lakh a month all-in) and assume no revenue until Phase 2 billing; replace them when real offers and the pilot's conversion rate are known. Whether to raise is a month-6 decision, not a day-1 one: a bootstrapped path works if break-even arrives by month 12, and the investor outline below exists only in case it does not.

## Investor narrative outline (only if raising)

Ten slides, told in the owner's words first and the numbers second; every number on a slide must come from the pilot, not from this plan.

1. **The moment**: a salon owner typing a quote into WhatsApp at 11 pm, then chasing the payment for a week. One photo, one sentence.
2. **What they get**: ~~a quote with their own logo in five minutes, accepted on the page, paid by UPI, invoiced correctly~~ a priced reply (proforma `PI-`) with their own logo in five minutes, paid by UPI on the page (paying is the acceptance), tax invoice `INV-` once the payment is approved (D60, D71). Show the phone, not a feature list.
3. **Who and how many**: the six verticals and the two we started with; the Founding 20 by name (with consent). Market size only if a verified source is found; otherwise bottom-up from the pilot city.
4. **Proof**: G1–G8 results, retention curve, paid conversion, three owner quotes, one CA quote.
5. **Why we win**: trust history, local-language human service, CA and association distribution, Apna Pradhan as the product's character; and why features are not the moat.
6. **How we build**: AI agents with a human verification loop; 10 days to a product; what that does to cost and speed, with the honest caveat that verification is the bottleneck.
7. **Model and unit economics**: plans, margins, support cost per workspace, payback, churn; the break-even target of about 800 paying workspaces.
8. **Roadmap**: Phase 3 and the next two verticals, connectors by provider, Tally and Zoho sync, the native app.
9. **Team**: who verifies, who sells, who supports; the hires the money buys.
10. **The ask**: amount, months of runway, the three milestones it reaches, and what we will not spend it on (paid ads, a sales team, accounting depth).

Appendix: the Legal & compliance checklist status, the security controls, the data-protection posture, and the vendor list. Investors in India will ask about GST correctness and DPDP early; have the CA and lawyer sign-offs ready.
