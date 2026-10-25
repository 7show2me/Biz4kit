# Business plan

Oct 18, 2026 · @Ravin

Rewritten 2026-10-24 to match `docs/decisions.md` (D1–D102). Previous version: `prep/archive/2026-10-24/Business plan.md`.

Biz4Kit earns a subscription from small service businesses that want to look professional and get paid without chasing; the pilot proves that in 20 days, and the numbers below show what each workspace costs us and what it must pay. **Every figure here is an assumption** to be replaced by pilot data; assumptions are open questions, not decisions. No market-size claim is made because none has been verified.

## One-page summary

|  |  |
| --- | --- |
| **What** | A brand kit, not a CRM (D63): a white-label workspace where a small business publishes its catalog, replies to requests with a proforma invoice (`PI-`) the customer pays on the page (paying is the acceptance, D60), books and tracks the work, invoices with GST, and gets paid by UPI, all under its own name. The four core Quick jobs are Quick Catalog, Quick Reply, Quick Invoice and Quick Cashflow (money in only in Phase 1, D77). Internally, the helper layer is called Apna Pradhan. |
| **Who** | Businesses with 1–15 people. Pilot verticals: salons and design / IT agencies (D1). Starter kits ship for all six verticals (D1): the salon kit exists; the wholesaler, restaurant or café, IT services, manufacturer and design agency kits are drafted by Claude and approved by the owner (D96). Starting in Nashik, Maharashtra. |
| **Why now** | UPI made getting paid easy but left quoting and invoicing in WhatsApp and Word; AI-generated code lets one person with an AI agent (D24, D27) ship a full product in 10 days and keep the price at a small-business level. |
| **How we win** | Not on features (copyable in days) but on the owner's feeling of looking bigger than they are, local-language human service, CA and association distribution, and a trust history that grows with every reply and payment. |
| **Business model** | Free during the 10-day build and the 20-day pilot, and free throughout Phase 1 (D98). Planned (assumption): a free plan with volume limits and ₹499, ₹1,499 and ₹3,999 per month plans, billed through Polar from Phase 2 (D98); no payment-platform fees. Payment gateways for the business's customers (Razorpay, Stripe) come after Phase 2 with the company (D43, D49); the business chooses. |
| **Proof we are looking for** | GTM tests G1–G8 in the Outline: catalog shared within 24 h, priced reply in under 10 minutes, 30% of replies paid, invoices paid in 7 days, 60% weekly active, 8 of 20 saying yes to ₹499. |
| **What we need** | The founder working with an AI agent (one agent does the work, one human verifies, D27); a CA and a lawyer from the end of Phase 2 (D23); the founder's phone as the pilot support line (D8); about 30 days of runway to reach the pilot readout. The company, PAN, GST and bank account are deferred until Phase 2 is complete (D43). Funding needs are in the milestones section. |

## Cost per workspace and unit economics

Assumptions, not quotes: each line names what it depends on, and the pilot replaces it with a measured number. Figures are monthly, in INR, for an average active workspace in its first year.

**Variable cost per active workspace (Phase 1 features)**

| Item | Assumption | Cost / month |
| --- | --- | --- |
| Hosting, database, storage share | 2,000 workspaces on a fixed stack of about ₹40,000 / month (web on Vercel, API and workers on ECS Fargate in Mumbai behind API Gateway, Neon Postgres, Upstash Redis, S3: D22, D28, D33, D38, D42; the stack figure itself is not re-estimated) | ₹20 |
| Email | 150 transactional emails at roughly ₹0.10 each (Phase 1 sends email only, D67) | ₹15 |
| PDF and export rendering | 60 documents; compute share | ₹5 |
| File storage and bandwidth | 200 MB of proofs, logos, item and job photos | ₹5 |
| Support | 1 support person for 400 workspaces at ₹40,000 / month (in the pilot the founder answers, D8) | ₹100 |
| Payment processing | Phase 1: none (UPI QR is free to the business). Gateway fees, once gateways arrive, are paid by the business to the provider | ₹0 |
| **Total Phase 1** |  | **about ₹145** |
| Phase 2 additions | WhatsApp API messages (about ₹0.80 per template message × 60), SMS OTP (₹0.25 × 40), Claude API ingest (one price-list parse a month, well under ₹10); WhatsApp and SMS need the company and DLT first (D49) | about ₹70 |
| **Total Phase 2** |  | **about ₹215** |

**Fixed cost (first six months)**: in the pilot there are no hires (D44): the fixed cost is the founder's time plus about ₹1 lakh for tools, devices and infrastructure. The team table below carries placeholder salary assumptions for Nashik for whenever hiring starts (after the pilot, if it passes); with that team the fixed cost would be roughly ₹6–8 lakh per month. CA and lawyer retainers start at the end of Phase 2 (D23). All of these must be replaced with real offers.

**Unit economics at the planned prices** (assumptions)

| Plan | Price | Variable cost | Gross margin | Notes |
| --- | --- | --- | --- | --- |
| Free | ₹0 | about ₹100 (support is the bulk) | negative | Capped by volume; must convert or stay cheap to serve |
| Starter | ₹499 | about ₹215 | about 57% | Thin; support cost is the lever |
| Team | ₹1,499 | about ₹300 (more users, more messages) | about 80% | The plan the model depends on |
| Agency | ₹3,999 | about ₹500 | about 87% | Few customers, high value |

Plan prices, limits and the split below are not decided; they are what the pilot tests (G6).

**Break-even sketch**: at a 60 / 30 / 10 split of Starter / Team / Agency among paying workspaces, average revenue is about ₹1,150 and average variable cost about ₹270, so each paying workspace contributes about ₹880 a month. Covering ₹7 lakh of fixed cost (the post-pilot team assumption) needs about 800 paying workspaces. If one in four free workspaces converts, that is about 3,200 total workspaces. The pilot's job is to test the conversion rate (G6) and the support cost, which move this number most.

**Payback**: if acquiring a paying workspace costs about ₹2,000 (a visit, a QR kit, a month of free use), payback is under three months at the average contribution above; churn above 5% a month breaks the model and is why G5 matters.

## Pilot plan and tracker

Twenty named businesses in the two pilot verticals (salons and design / IT agencies, D1), recruited before day 10, each with a set-up visit. With one person (D24), the founder is every business's success buddy.

**Founding 20 tracker**

| # | Business | Vertical | City | Channel | Owner contact | Buddy | Set-up visit | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 |  | Salon | Nashik |  |  | Founder |  | Not started |
| 2 |  | Salon | Nashik |  |  | Founder |  | Not started |
| 3 |  | Salon | Nashik |  |  | Founder |  | Not started |
| 4 |  | Design agency |  |  |  | Founder |  | Not started |
| 5 |  | Design agency |  |  |  | Founder |  | Not started |
| 6 |  | IT services |  |  |  | Founder |  | Not started |
| 7 |  | IT services |  |  |  | Founder |  | Not started |
| 8 |  | (add rows to 20) |  |  |  |  |  | Not started |

**Channels and their tags**: personal network (`ref-founder`), salon Instagram DMs (`ig-salon`), agency and IT referrals (`ref-agency`), local business WhatsApp groups (`wa-group`), QR counter kit (`qr-kit`), CA introductions (`ca-partner`, once the CA programme starts). Every sign-up link carries its tag so G7 and G8 can be attributed.

**Weekly rhythm (pilot days 11–30)**

| When | What | Who |
| --- | --- | --- |
| Daily 18:30 | G1–G8 snapshot to Slack #pilot | Founder (agent prepares it) |
| Day 1, 3, 7, 14, 20 per business | Check-ins from the sales playbook; notes in the business's record | Founder |
| Weekly, Monday | 30-minute review: numbers, three owner quotes, one decision | Founder |
| Day 14 | Churn interviews with anyone inactive for 5 days | Founder |
| Day 20 | Commitment ask (G6), recorded per business | Founder |
| Day 20–22 | Pilot readout: pass / fail per test, pricing decision, Phase 3 reorder | Founder |

**Exit from pilot**: businesses stay on the founding rate; the Founding Members wall goes live with consent; anyone who says no to paying is asked one question, why, and thanked.

## Support playbook

One named person, reachable where owners already are, answering like a person, not a ticket system. In the pilot that person is the founder, on the founder's phone (D8).

| Item | Rule |
| --- | --- |
| Channels | The founder's phone (calls and WhatsApp on that number, D8; no separate WhatsApp Business number), email; in-app "Need help?" opens the founder's number with the workspace id prefilled |
| Hours | 9:00–20:00 IST, Monday to Saturday during the pilot; out-of-hours auto-reply with the next-morning promise |
| Response time | First human reply within 30 minutes in hours; fix or workaround within 4 hours for anything blocking a reply or a payment; everything else within 1 working day |
| Language | Hindi, Marathi and English; voice notes welcome and answered with voice notes |
| Tone | First name, no scripts read aloud, no "ticket number"; say what you will do and when |
| Escalation | Blocking bug → a Linear issue and the agent on it at once; data or security concern → Slack #security; abuse report → takedown procedure in `Legal & compliance.md` |
| Logging | Every conversation summarised on the business's record (no customer PII copied); recurring issues become Linear issues with a `pilot-feedback` label |
| Self-help | Five one-minute videos (set up brand, first reply, share on WhatsApp, record a payment, approve a proof); a short FAQ; no long help centre in Phase 1 |
| Promises | Never promise a feature date; promise a call-back time and keep it |
| Metrics | First-response time, time to resolve, conversations per workspace per week, top three issues; reviewed Monday |

## CA partner programme

A chartered accountant who trusts our invoices recommends us to every small-business client; one CA can be worth twenty door visits. No CA is engaged yet; the programme starts when the CA comes in at the end of Phase 2 (D23).

- **Offer to the CA**: a free Accountant role on every client workspace (read-only plus export, D91), month-end CSV and PDF exports in one click, an audit log, and a one-page note on how our GST fields are built. No payment for recommendations; a thank-you and public credit if they want it.
- **Offer to their clients**: a founding rate and a set-up visit.
- **Start**: the CA who signs off our sample invoices (before paid plans, D92) is partner number one; ask them for three introductions. Aim for five CA partners within a month of starting.
- **Materials**: a two-page CA brief (what we do, what we don't, GST handling, export formats, data safety), a demo workspace with sample invoices, a WhatsApp message they can forward.
- **Rules**: a CA's feedback on invoice correctness goes straight into Linear with priority; we never market to a CA's client list without the client's consent.
- **Later**: Tally and Zoho Books sync (Phase 3) is built with these partners and is the reason they stay.

## Team and hiring plan

Small on purpose. **Now and through the pilot: a one-person project** (D24): the AI agent does the work as assignee and the founder verifies (D27); designer and second-reviewer checks are the agent's automated pre-check followed by the founder's sign-off (D48). B1.4 Hiring is cancelled: no hires in the pilot (D44).

The table is the plan for after the pilot, if it passes. Salary figures are placeholder assumptions for Nashik and must be replaced by real offers; whether and when to hire each role is open.

| Role | When | Count | What they own | Placeholder cost / month |
| --- | --- | --- | --- | --- |
| Founder | Now | 1 | Story, Founding 20, numbers, verification, go / no-go, support (D8, D27) | — |
| AI agent | Now | — | Builds every package test-first; automated pre-checks (D48) | Tool cost (in the fixed cost) |
| Chartered accountant | End of Phase 2, retainer (D23) | on call | Invoice sign-off, GST questions, e-way decision, our own filings | ₹15,000–30,000 |
| Lawyer | End of Phase 2, retainer (D23) | on call | Terms, privacy, consents, company papers, trademark filing (D45) | ₹20,000–50,000 (plus one-off drafting) |
| Engineer (reviewer) | After the pilot, open | 1 | Architecture, verification, infra, connectors | ₹1–1.5 lakh |
| Onboarding partner / success buddy | After the pilot, open | 1, then 2 | Set-up visits, check-ins, commitment asks; Hindi and Marathi | ₹35,000–50,000 each |
| Support | After the pilot, open | 1 (can be the same person as above at first) | Phone and WhatsApp support, FAQ videos | ₹30,000–40,000 |
| Product designer | After the pilot, open | 1 (contract ok) | Screens, brand, PDF templates, QR kit | ₹80,000–1.2 lakh |
| CA partner lead (sales) | After the CA programme starts, open | 1 | CA programme, associations, vertical kits with owners | ₹50,000–80,000 |

**Not hiring**: a marketing team (the product and the owners market it), a QA team (verification is the reviewer's job), a sales team beyond the buddies (sales is onboarding).

**Principles**: everyone talks to owners every week, including engineers; every hire gets `Market fit & sales.md` on day one; production credentials are held by the founder only (agents never hold them).

## Milestones and funding needs

[embedded content: milestones and gates · day 1 to month 12 · funding note]

The only committed dates are the first thirty days: build day 1 was Monday 2026-10-19 (D25). Everything after the readout is a target that the pilot confirms or changes. In the pilot the runway is the founder's time and about ₹1 lakh a month for tools and infrastructure, with no revenue (plans are free in Phase 1, D98). Once hiring starts, the runway figures use the placeholder team costs above (about ₹7–9 lakh a month all-in) and assume no revenue until paid plans start in Phase 2, which need the company, the CA and the lawyer first (D43, D92); replace them when real offers and the pilot's conversion rate are known. Whether to raise is a month-6 decision, not a day-1 one: a bootstrapped path works if break-even arrives by month 12, and the investor outline below exists only in case it does not.

## Investor narrative outline (only if raising)

Ten slides, told in the owner's words first and the numbers second; every number on a slide must come from the pilot, not from this plan.

1. **The moment**: a salon owner typing a price into WhatsApp at 11 pm, then chasing the payment for a week. One photo, one sentence.
2. **What they get**: a priced reply (proforma `PI-`) with their own logo in five minutes, paid by UPI on the page (paying is the acceptance), and the tax invoice `INV-` once the payment is approved (D60, D71). Show the phone, not a feature list.
3. **Who and how many**: the six verticals and the two we started with (D1); the Founding 20 by name (with consent). Market size only if a verified source is found; otherwise bottom-up from the pilot city.
4. **Proof**: G1–G8 results, retention curve, paid conversion, three owner quotes, one CA quote.
5. **Why we win**: trust history, local-language human service, CA and association distribution, Apna Pradhan as the product's character; and why features are not the moat.
6. **How we build**: one person and an AI agent with a human verification loop (D24, D27); 10 days to a product; what that does to cost and speed, with the honest caveat that verification is the bottleneck.
7. **Model and unit economics**: plans, margins, support cost per workspace, payback, churn; the break-even target of about 800 paying workspaces.
8. **Roadmap**: Phase 3 and the next two verticals, connectors by provider, Tally and Zoho sync, the native app.
9. **Team**: who verifies, who sells, who supports; the hires the money buys.
10. **The ask**: amount, months of runway, the three milestones it reaches, and what we will not spend it on (paid ads, a sales team, accounting depth).

Appendix: the `Legal & compliance.md` checklist status, the security controls, the data-protection posture, and the vendor list. Investors in India will ask about GST correctness and DPDP early; the CA and lawyer sign-offs come at the end of Phase 2 (D23, D92) and must be in hand before raising.
