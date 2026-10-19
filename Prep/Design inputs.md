# Design inputs

Oct 18, 2026 · @Ravin

Eight documents a designer needs before wireframes, in the order to read them. The first three gate design; the rest run alongside.

1. [1 Personas & JTBD](#mc633mk7sxb.861) — who the owner, staff and customer are in each of the six launch verticals, and the one job each must get done.
2. [2 User flows & screens](#mc633mk7sxb.5511) — every path through the product, step by step, plus the full list of screens.
3. [3 Data model](#mc633mk7sxb.11304) — entities, fields, states and business rules.
4. [4 Brand & theming](#mc633mk7sxb.17653) — Biz4Kit's own brand and the white-label theming rules.
5. [5 Message templates](#mc633mk7sxb.21291) — every ready message, with English wording and variables.
6. [6 Competitor teardown](#mc633mk7sxb.26062) — what Zoho, Vyapar, Refrens and others do well and where they leave room.
7. [7 NFRs](#mc633mk7sxb.28992) — non-functional requirements: performance, offline, accessibility, privacy.
8. [8 Glossary](#mc633mk7sxb.31780) — one meaning per term, used in all UI copy.

9) [9 Competitor glossary](#mc633mk7sxb.34671) — the words Vyapar, Zoho, Refrens and Dukaan use, each mapped to our simpler word, with import mapping and familiar-word hints.

# Personas & jobs-to-be-done

Oct 18, 2026 · @Ravin

Biz4Kit serves three people in every business: the owner who sets it up, the staff who use it on site, and the customer who never logs in. The verticals change the vocabulary and the device, not the three jobs: get a quote out fast, get the work done without retyping, get paid without chasing.

## Core personas

|  | Owner — "Priya" | Staff — "Rahul" | Customer — "Anita" |
| --- | --- | --- | --- |
| Who | Runs the business, 30–50, does sales and accounts herself; 1–15 staff | Technician, stylist, sales executive or designer, 20–35; paid per month, not per task | Walk-in or online buyer; a consumer (salon, restaurant) or another business (wholesale, IT, manufacturing) |
| Device & context | Laptop in the evening, phone all day; multitasking between customers | Android phone only, often one-handed, on site, patchy network | Phone, arriving from a WhatsApp link, QR code or Instagram bio; will not install anything or create an account |
| Jobs to be done | Send a professional quote within minutes of an enquiry; know what is owed and by whom; look bigger than she is | Know today's bookings and jobs; finish a job and move on without paperwork; not get blamed for a missed payment | See prices without asking; get a clear quote quickly; pay the way she already pays (UPI) and get a receipt |
| Frustrations today | Price list is a stale PDF; quotes typed in WhatsApp get lost; invoices in Word; chasing payments by hand; every tool looks like someone else's brand | Told things verbally and forgets; takes photos that end up nowhere; calls the owner for every price | "Send me the rate list" gets a photo; quotes contradict each other; no proof of what was agreed |
| Trust signals | Her logo and colours on everything; GST-correct invoices; nothing her customers see says Biz4Kit | Clear list of what is mine today; marking a job done takes two taps | A branded page with the business's name, a quote number, a validity date, a receipt |
| Success metric | Enquiry→quote under 10 minutes; overdue list shrinks week on week | Zero jobs finished without an invoice created | Accepts on the first quote; pays within 48 h of the invoice |
| Permissions | Everything, including approving payment proofs and billing | Own bookings and jobs; create quotes and invoices; upload payment proof | None; acts only through private links |

## Vertical sheets

| Vertical | Owner & team | Customer | Where they sell today | Top job for Biz4Kit | Vocabulary & defaults |
| --- | --- | --- | --- | --- | --- |
| Salon / spa | Owner-stylist + 3–8 stylists on shifts | Consumers, repeat visits every 3–6 weeks, book by WhatsApp or walk in | Instagram, Google Maps, WhatsApp | Bookings with a visible service menu; packages (bridal, monthly) | "Services", "appointment", "package"; per-stylist calendar; prices per service |
| IndiaMART wholesaler | Proprietor + 1–3 sales executives handling marketplace leads | Other businesses, price-sensitive, ask for quotes in bulk, negotiate | IndiaMART enquiries, phone, WhatsApp | Turn a marketplace enquiry into a quote in minutes; GST invoice with HSN codes | "Products", "MOQ", "rate", "proforma invoice"; quantity tiers; HSN per item; delivery terms |
| Restaurant / café | Owner + manager + kitchen; catering side business | Dine-in diners (menu via QR) and event hosts (catering quotes) | Zomato / Swiggy, QR menus, WhatsApp | QR menu that is always current; catering quote with per-plate pricing | "Menu", "dish", "per plate", "event date", "advance"; veg / non-veg tags; deposits |
| IT services | Founder + 2–10 engineers | SMBs buying websites, apps, AMC support; expect proposals and milestones | Referrals, LinkedIn, Upwork | Proposal-style quote with scope and milestones; milestone invoices; AMC packages | "Proposal", "scope", "milestone", "AMC", "retainer"; hourly and fixed; partial invoices |
| Small manufacturer | Owner + production supervisor + sales | Dealers and businesses; repeat orders; specifications matter | Dealers, IndiaMART, trade fairs | Quotes with specifications and lead time; job tracking from order to dispatch | "Items", "specification", "lead time", "dispatch", "GST / HSN"; units (kg, pcs, m) |
| Design agency | Founder + 2–8 designers | Startups and SMBs; want options and a clear price per deliverable | Instagram, Behance, referrals | Package tiers (Basic / Standard / Premium); doc-style proposal the client accepts online | "Proposal", "deliverable", "revision", "retainer"; packages; 50% advance invoice |

Design implication: the generators are identical across verticals; what changes per vertical starter kit is labels (service / product / dish / deliverable), default units, whether HSN and MOQ fields show, and whether bookings or milestones are the default follow-on to an accepted quote.

# User flows & screen map

Oct 18, 2026 · @Ravin

Four flows cover Phase 1; the screen map lists 34 screens across onboarding, workspace, generators and the customer portal.

## Flow 1 — Owner onboarding (target: 8 minutes to a shareable catalog)

1. Land on biz4kit.app → **Continue with Google** (web or app). Better Auth creates the user; email is already verified by Google.
2. **Create workspace**: business name → slug suggested (`brand.biz4kit.app`), vertical picked from six cards.
3. **Brand**: upload logo (light; dark optional), pick two colours or let the app extract them from the logo; live preview of a quote header and the catalog page.
4. **Business details**: phone, address, GST number (optional, unlocks GST fields), UPI ID for payment requests, invoice prefix.
5. **Catalog starter**: vertical starter kit loads sample items and packages; owner edits prices inline, deletes what doesn't apply, or imports a CSV.
6. **Invite team**: email addresses with role; invites can be skipped and done later.
7. **Done screen**: catalog link, QR code to download, "share price list" ready message. First-run checklist stays on the dashboard until a first quote is sent.

Exit points: close at any step and the workspace is saved; re-entry returns to the same step. Verification loop: an invited member signs in with Google, sees the pending invite, accepts, lands in the right workspace with the assigned role.

## Flow 2 — Lead to accepted quote

&#91;embedded content: lead to accepted quote · 7 steps, 2 decisions, 2 loops\]

Both loops are ready messages the staff member sends by hand in Phase 1 and the system sends in Phase 2. A revised quote is a new version of the same quote number; the customer's link always shows the latest.

## Flow 3 — Job to paid

&#91;embedded content: job to paid · owner approval gate, reminder and re-upload loops\]

Any member can upload proof; only the Owner (or a Manager if the owner delegates it in settings) can approve. Approval writes the Payment record, flips the invoice to Paid and offers the receipt message. The same gate applies to a gateway payment in Phase 2 only when the webhook fails to match an invoice.

## Flow 4 — Customer portal (no account, ever)

1. **Arrive** at `brand.biz4kit.app` from a QR code, WhatsApp link or Instagram bio. Page loads in the business's brand; no Biz4Kit chrome.
2. **Browse** categories, packages, search; tap an item for photos, variants, add-ons. Prices visible by default; the owner can hide prices per item ("ask for a quote").
3. **Request a quote**: basket of items or a free-text brief, photos, preferred date, location, name and phone. Submit creates a Lead and shows a confirmation with the business's phone number.
4. **Receive the quote** as a private link (sent by the team). The page shows line items, optional items to toggle, total, validity, terms, and the business's contact. **Accept** = name + phone + tap; a PDF copy is downloadable.
5. **Book** (bookable packages only): pick staff and slot from availability; confirmation screen with add-to-calendar.
6. **Pay**: the invoice page shows amount, UPI deep link (opens any UPI app), QR, bank details; "I have paid" lets the customer upload a screenshot that lands in the owner's approval queue. Status on the page updates to Paid after approval; receipt downloadable.
7. **My orders**: a private per-customer link (sent on first quote) listing every quote, booking, invoice and receipt.

Private links are long random tokens; opening one is the proof of identity. Phase 2 adds OTP where the owner wants it.

## Screen map (Phase 1)

| Area | Screen | Route | Primary action | Who |
| --- | --- | --- | --- | --- |
| Auth | Sign in | `/login` | Continue with Google | Owner, Staff |
| Auth | Accept invite | `/invite/:token` | Join workspace | Staff |
| Onboarding | Create workspace | `/new` | Create | Owner |
| Onboarding | Brand setup | `/new/brand` | Save and preview | Owner |
| Onboarding | Business details | `/new/details` | Save | Owner |
| Onboarding | Catalog starter | `/new/catalog` | Keep / edit / import | Owner |
| Onboarding | Invite team | `/new/team` | Send invites / skip | Owner |
| Workspace | Dashboard | `/w/:slug` | Today: bookings, jobs, approvals, overdue | All |
| Workspace | Pipeline board | `/w/:slug/pipeline` | Drag record between stages | Owner, Manager, Staff |
| Leads | Leads inbox | `/w/:slug/leads` | Assign, open, create quote | All |
| Leads | Lead detail | `/w/:slug/leads/:id` | Create quote | All |
| Catalog | Items list | `/w/:slug/catalog` | Add item, reorder, import CSV | Owner, Manager |
| Catalog | Item editor | `/w/:slug/catalog/:id` | Save | Owner, Manager |
| Catalog | Packages | `/w/:slug/packages` | Add tier | Owner, Manager |
| Quotes | Quotes list | `/w/:slug/quotes` | New quote | All |
| Quotes | Quote editor (doc) | `/w/:slug/quotes/:id` | Share | All |
| Quotes | Share sheet | modal | Copy link / message, PDF, WhatsApp | All |
| Bookings | Calendar | `/w/:slug/bookings` | New booking, drag to move | All |
| Jobs | Job list | `/w/:slug/jobs` | Open job | Staff, Manager |
| Jobs | Job detail | `/w/:slug/jobs/:id` | Mark done | Staff |
| Invoices | Invoices list | `/w/:slug/invoices` | New invoice, overdue filter | Owner, Manager, Accountant |
| Invoices | Invoice editor (doc) | `/w/:slug/invoices/:id` | Share, request payment | All |
| Payments | Record payment / upload proof | modal | Submit for approval | All |
| Payments | Approval queue | `/w/:slug/approvals` | Approve / reject | Owner |
| Customers | Customer list | `/w/:slug/customers` | Open | All |
| Customers | Customer timeline | `/w/:slug/customers/:id` | New quote | All |
| Reports | Reports | `/w/:slug/reports` | Export CSV | Owner, Accountant |
| Settings | Brand, business, numbering, team, roles | `/w/:slug/settings/*` | Save | Owner |
| Portal | Catalog | `brand.biz4kit.app` | Request a quote | Customer |
| Portal | Quote request form | `/request` | Submit | Customer |
| Portal | Quote page | `/q/:token` | Accept | Customer |
| Portal | Booking picker | `/book/:package` | Confirm slot | Customer |
| Portal | Invoice & pay page | `/i/:token` | Pay by UPI, upload proof | Customer |
| Portal | My orders | `/me/:token` | Open any record | Customer |

34 screens; 9 of them are shared doc-style views (quote and invoice editors, their portal pages and PDFs render from the same blocks).

# Data model & business rules

Oct 18, 2026 · @Ravin

Twelve entities, all scoped by `workspace_id`; a CatalogItem is the unit everything else is built from, and a QuoteLine is copied, never referenced, so a later price change never alters a sent quote.

## Entities

Every table has `id`, `workspace_id`, `created_at`, `updated_at`, `created_by`; those are omitted below.

| Entity | Key fields | Relations | Notes |
| --- | --- | --- | --- |
| Workspace | name, slug, vertical, logo\_light, logo\_dark, color\_primary, color\_accent, gst\_number, address, phone, upi\_id, bank\_details (json), currency = INR, numbering (json: quote\_prefix, invoice\_prefix, next\_quote, next\_invoice), terms\_default, plan | has many of everything | slug unique globally |
| Member | user\_id, role (owner / manager / staff / accountant), status (invited / active / removed), invited\_email | belongs to Workspace; User from Better Auth | one Owner minimum, enforced |
| Customer | name, phone (unique per workspace), email, company, gst\_number, address, tags\[\], portal\_token, notes | has many Lead, Quote, Booking, Invoice | portal\_token = My-orders link |
| CatalogItem | name, description, category, photos\[\], unit (hr / pc / kg / m / sqft / plate / day), price, gst\_rate, hsn\_code, variants (json), addons (json: name, price), moq, show\_price, is\_active, sort\_order | belongs to Workspace; referenced by Package, copied into QuoteLine | price change never touches past quotes |
| Package | name, tier (basic / standard / premium / none), items (json: item\_id, qty), price, billing (one\_time / monthly), is\_bookable, duration\_min, description, is\_active | belongs to Workspace | package → quote starter copies items |
| Lead | customer\_id, source (qr / web / instagram / referral / manual / marketplace), brief, photos\[\], preferred\_date, location, assignee\_id, priority, status, snoozed\_until | has many Quote | created by portal form or manually |
| Quote | number, version, customer\_id, lead\_id, doc (json blocks), lines (QuoteLine\[\]), subtotal, discount, tax\_total, total, valid\_until, status, accepted\_at, accepted\_by\_name, accepted\_by\_phone, token | has many Invoice, Booking | new version = same number, version + 1; `is_proforma` flag renders it as a proforma invoice |
| QuoteLine (embedded) | item\_id (nullable), name, description, qty, unit, unit\_price, gst\_rate, hsn\_code, is\_optional, is\_selected, sort | inside Quote and Invoice | snapshot of item at time of writing |
| Booking | customer\_id, quote\_id, package\_id, member\_id, start\_at, end\_at, status, notes | has one Job | conflict check on member + time |
| Job | booking\_id, quote\_id, customer\_id, assignee\_id, checklist (json), photos\_before\[\], photos\_after\[\], time\_logged\_min, materials (json), status, completed\_at | has one Invoice | complete → invoice auto-created |
| Invoice | number, customer\_id, quote\_id, job\_id, doc (json blocks), lines (QuoteLine\[\]), subtotal, discount, tax\_total, total, paid\_total, due\_date, status, token | has many Payment | sequential number, gap-free |
| Payment | invoice\_id, amount, method (upi / bank / cash / card / gateway), reference, proof\_files\[\], uploaded\_by, status, approved\_by, approved\_at, reject\_note, gateway (json, Phase 2) | belongs to Invoice | approval is the only way to Paid in Phase 1 |
| Message | record\_type, record\_id, event, channel (whatsapp / sms / email / copy), body, sent\_by, sent\_at | belongs to any record | Phase 1: logged when staff taps share |
| ActivityLog | record\_type, record\_id, actor\_id, action, diff (json) | belongs to any record | audit for every mutation |

## State machines

| Entity | States | Transitions | Who |
| --- | --- | --- | --- |
| Lead | new → contacted → quoted → won / lost / snoozed | quoted when a quote is shared; won when a quote is accepted; lost is manual with a reason | Staff, Manager |
| Quote | draft → shared → viewed → accepted / declined / expired; any → revised (new version, back to shared) | viewed on first portal open; expired by `valid_until` nightly job; accepted only from the portal | Customer accepts; team shares |
| Booking | tentative → confirmed → in\_progress → completed / cancelled / no\_show | confirmed when accepted quote or owner confirms; in\_progress starts a Job | Staff, Customer (book) |
| Job | open → in\_progress → done → invoiced | done requires checklist complete (configurable); invoiced when invoice auto-created | Staff |
| Invoice | draft → sent → partially\_paid → paid; sent / partially\_paid → overdue (past due\_date); any unpaid → void | paid when sum of approved payments ≥ total; void only by Owner, keeps the number | Team, Owner |
| Payment | pending\_approval → approved / rejected | approve or reject with note; rejected can be re-uploaded as a new Payment | Owner (or delegated Manager) |

## Business rules

- **Numbering**: `{prefix}-{FY}-{seq}` e.g. `INV-2627-0042`, FY = Indian financial year (April–March); an invoice number is assigned at first share (drafts are unnumbered), gap-free and never reused thereafter; quotes may skip; a quote issued as a proforma uses the `PI-` prefix and is not a tax invoice; voided invoices keep their number.
- **Totals**: line\_total = qty × unit\_price; discount applies before tax (line or whole quote, never both); tax per line at the item's GST rate; CGST + SGST when customer state = workspace state, IGST otherwise; totals stored as integers in paise.
- **GST fields appear only if the workspace has a GST number**; HSN shows only for item units that are goods; a customer GST number switches the invoice to B2B format.
- **Validity**: default 15 days; expired quotes can be revived as a new version.
- **Optional lines** on a quote are excluded from the total until the customer selects them; the accepted selection is frozen into the invoice.
- **Approval**: a payment turns an invoice Paid only after Owner approval; proof file required for upi / bank, optional for cash; approver cannot be the uploader when another approver exists; approval works from the email link (single-use, expires in 48 h) or in-app; a Manager may approve below a per-workspace amount threshold set by the Owner.
- **Deposits**: a quote may require an advance %; accepting creates an advance invoice immediately and a balance invoice on job completion.
- **Tenancy**: every query is filtered by `workspace_id` in the API and by Postgres RLS; portal tokens are 32-byte random, revocable, and scoped to one record or one customer.
- **Deletion**: records are soft-deleted; customers can request export or erasure of their data (DPDP), which anonymises Customer and keeps invoice numbers for tax.

# Brand & theming

Oct 18, 2026 · @Ravin

Two brands live in the product: Biz4Kit's own, seen by owners and staff inside the workspace, and each business's, seen by its customers on every link, PDF and message. The rule is simple: anything a customer sees carries the business's brand and nothing else.

## Biz4Kit brand (proposed, for the designer to refine)

| Element | Decision |
| --- | --- |
| Name | **Biz4Kit**, always one word with a capital B and K; never "Biz 4 Kit" or "biz4kit" in copy. Tagline: *Quote, book, invoice, get paid. Under your own name.* |
| Voice | Plain, warm, short. Second person. Says "you" and "your customer", never "the user". No jargon (no "CRM", "pipeline" in customer-facing copy). |
| Palette (proposed) | Primary: deep teal `#0F766E`; accent: amber `#F59E0B`; neutrals: warm greys; semantic: green / amber / red for paid / due / overdue. Teal reads trustworthy in finance contexts and is rare among Indian SMB tools (Vyapar red, Zoho red/blue). |
| Type | UI: Inter (web) / system font (mobile). Numbers: tabular figures everywhere money appears. PDFs: Inter embedded. |
| Logo | Wordmark with a four-square "kit" glyph; must work at 24 px (favicon) and in a single colour. |
| Tone of UI | Linear-like: dense but calm, keyboard-friendly on desktop, large touch targets on phone, dark and light. Biz4Kit's own colours appear only in the workspace chrome (sidebar, settings, sign-in). |

## White-label rules

| Surface | Brand shown | Biz4Kit presence |
| --- | --- | --- |
| Sign-in, onboarding, settings, billing | Biz4Kit | Full |
| Workspace app (dashboard, lists, editors) | Biz4Kit chrome; the business's logo in the workspace switcher; brand colour tints primary buttons and tags | Logo in sidebar |
| Public catalog page | Business | Free plan: small "Made with Biz4Kit" footer link. Paid: none |
| Quote page, invoice page, pay page, My orders | Business | Free plan footer only |
| PDF quote, invoice, receipt, menu | Business: logo, colours, name, GST details, terms | Free plan: one-line footer. Paid: none |
| Ready messages (WhatsApp, SMS, email) | Business name in the first line and the sign-off | Never |
| Emails (Phase 2) | From "{Business} via Biz4Kit" on Starter / Team; own domain on Agency | Sender domain only |
| QR codes | Business colour, logo in centre | None |

Rule of thumb for any new surface: if a customer of the business can see it, it carries the business's brand and, on paid plans, nothing of ours.

## Theme generation

The owner picks two colours (or the app extracts them from the logo); everything else is derived, so no business can produce an unreadable page.

1. **Inputs**: `primary`, `accent`, logo light (required), logo dark (optional).
2. **Derived tokens**: primary 50–900 scale (OKLCH lightness steps), `on-primary` chosen as white or near-black by contrast; accent used only for highlights and the QR centre; surface and text neutrals are fixed per light / dark theme; semantic colours (paid / due / overdue) are fixed and never overridden.
3. **Contrast gate**: text on primary ≥ 4.5:1, large text ≥ 3:1 (WCAG AA). If the chosen primary fails as a button background in a theme, the app shifts its lightness until it passes and tells the owner.
4. **Dark mode**: if no dark logo is uploaded, the light logo is placed on a light chip; primary is lightened one step for dark surfaces.
5. **PDF**: uses the light theme always; primary for the header band and table header, black text, logo max 48 mm wide.
6. **Storage**: tokens are generated once on save and stored on the Workspace as CSS variables and a PDF palette; pages read variables, never raw colours.
7. **Logo rules**: SVG or PNG ≥ 512 px, transparent background preferred; auto-trimmed; shown at fixed heights (32 px nav, 56 px page header, 48 mm PDF); never stretched.

# Message templates

Oct 18, 2026 · @Ravin

Seventeen events produce a ready message in Phase 1. Each is written once in English, in a warm, plain voice, and rendered with the business's name; staff copy or share it, and in Phase 2 the same template is sent automatically.

## Template rules

- **Variables** in braces: `{business}`, `{customer_first}`, `{quote_no}`, `{invoice_no}`, `{amount}`, `{due_date}`, `{valid_until}`, `{link}`, `{upi_id}`, `{date}`, `{time}`, `{staff}`, `{service}`, `{sender}`. Amounts render as `₹12,500`; dates as `Tue 21 Oct`.
- **Channel lengths**: WhatsApp ≤ 60 words with the link on its own line; SMS ≤ 160 characters, link shortened; email adds a subject and a one-line sign-off.
- **Tone**: first name, one courtesy, the fact, the link, the sign-off with the business name. No exclamation marks except the payment-received message. No emoji by default; owner can turn on a single leading emoji per template.
- **Editable**: the owner can edit any template in settings; a reset restores the default. Vertical starter kits swap nouns (service / product / dish / deliverable).
- **Logged**: tapping copy or share writes a Message row on the record, so the timeline shows what was sent even though Phase 1 never sends anything itself.

## Template catalog (English defaults)

| # | Event | Trigger | To | WhatsApp / SMS text | Email subject |
| --- | --- | --- | --- | --- | --- |
| 1 | Price list | Owner taps share on the catalog | Prospect | Hi {customer\_first}, here is our current price list from {business}. Tap to browse and request a quote: {link} — {sender}, {business} | Our price list — {business} |
| 2 | Quote request received | Portal form submitted | Customer | Thanks {customer\_first}, {business} has your request. We will send a quote shortly. Questions? Reply here. | We received your request — {business} |
| 3 | Need more details | Staff taps "ask customer" on a lead | Customer | Hi {customer\_first}, to prepare your quote {business} needs a little more detail: {question}. Reply here when convenient. | A quick question about your request |
| 4 | Quote sent | Quote shared | Customer | Hi {customer\_first}, your quote {quote\_no} from {business} is ready: {link}. It is valid until {valid\_until}. Tap Accept on the page to confirm. — {sender} | Your quote {quote\_no} from {business} |
| 5 | Quote revised | New version shared | Customer | Hi {customer\_first}, {business} has updated quote {quote\_no}. The same link shows the new version: {link} | Updated quote {quote\_no} |
| 6 | Quote follow-up | Staff taps follow-up (+3 days default) | Customer | Hi {customer\_first}, just checking whether quote {quote\_no} works for you. Happy to adjust anything: {link} — {sender}, {business} | Following up on quote {quote\_no} |
| 7 | Quote expiring | 2 days before valid\_until | Customer | Hi {customer\_first}, quote {quote\_no} from {business} expires on {valid\_until}. Accept here to lock the price: {link} | Quote {quote\_no} expires {valid\_until} |
| 8 | Quote accepted | Customer accepts | Customer | Thank you {customer\_first}, quote {quote\_no} is confirmed. {business} will be in touch about next steps. Your records: {link} | Confirmed: quote {quote\_no} |
| 9 | Quote accepted (internal) | Customer accepts | Assignee | {customer\_first} accepted {quote\_no} ({amount}). Next: create booking or invoice. {link} | — |
| 10 | Booking confirmed | Booking confirmed | Customer | Hi {customer\_first}, you are booked with {business} on {date} at {time} for {service} with {staff}. Details: {link} | Booking confirmed — {date} {time} |
| 11 | Booking reminder | 24 h before | Customer | Reminder from {business}: {service} tomorrow, {date} at {time}. Reply if you need to reschedule. | Reminder: tomorrow at {time} |
| 12 | Invoice & payment request | Invoice shared | Customer | Hi {customer\_first}, invoice {invoice\_no} from {business} for {amount} is ready: {link}. Pay by UPI to {upi\_id} or scan the QR on the page. Due {due\_date}. | Invoice {invoice\_no} — {amount} due {due\_date} |
| 13 | Payment reminder +3 | 3 days after due | Customer | Hi {customer\_first}, a gentle reminder that invoice {invoice\_no} ({amount}) from {business} is due. Pay here: {link} | Reminder: invoice {invoice\_no} |
| 14 | Payment reminder +7 / +14 | 7 and 14 days after due | Customer | Hi {customer\_first}, invoice {invoice\_no} for {amount} is now {days} days overdue. Please pay at {link} or reply if there is an issue. — {business} | Overdue: invoice {invoice\_no} |
| 15 | Payment received | Owner approves proof | Customer | Thank you {customer\_first}! {business} has received {amount} for invoice {invoice\_no}. Receipt: {link} | Receipt for {invoice\_no} |
| 16 | Proof rejected (internal) | Owner rejects | Uploader | Proof for {invoice\_no} was not approved: {reject\_note}. Please re-upload. | — |
| 17 | Job completed | Staff marks done | Customer | Hi {customer\_first}, {service} is complete. Thank you for choosing {business}. Your invoice follows shortly. | Work completed — {business} |

# Competitor teardown

Oct 18, 2026 · @Ravin

Nobody in the Indian SMB market combines a public catalog, doc-style quotes, invoicing, bookings and white-label branding; each competitor owns one or two of these. Product facts below are from general knowledge, not a fresh check: verify pricing and features on each site before quoting them.

## Comparison (approximate, verify before quoting)

| Product | Built for | What they do well (copy this) | What they don't do (our room) |
| --- | --- | --- | --- |
| Vyapar | Indian kirana / trader accounting on Android | Offline-first mobile app; GST invoicing and e-way bills; very fast item entry; cheap annual plans; huge SMB trust | No public catalog or customer portal; invoices look like accounting output; no quotes-as-docs, no bookings; branding limited to a logo on the invoice |
| Zoho Invoice / Zoho Books | SMB invoicing, free tier, deep accounting | Clean invoice templates; recurring billing; customer portal with online payment; multi-gateway; strong reports | Generic, not white-label (Zoho branding, zoho.in domains); setup heavy; no catalog page, leads or bookings; quote is a form, not a document |
| Refrens | Indian freelancers and agencies | Beautiful quote and invoice design; proposal flow; client portal; GST; freelancer network | Still a form-based editor; no bookings or job tracking; no team pipeline; limited white-label |
| Square (Invoices + Appointments) | US/UK service businesses | Bookings + invoices + payments in one brand; polished customer-facing pages; staff calendars | Not available / not relevant in India (no UPI, no GST); not white-label |
| Bookipi / Invoice Simple | Solo tradespeople worldwide | Fastest possible first invoice; mobile-only simplicity | No team, no catalog, no pipeline; weak India localisation |
| Dukaan / Bikayi (catalog-commerce apps) | Indian micro-sellers | WhatsApp-native storefront; QR catalog; UPI payments; extremely simple onboarding | Built for selling fixed-price goods, not quoting services; no invoices-as-docs, no bookings or job tracking |

## Takeaways for design

1. **Copy Vyapar's speed, not its look.** Item entry and invoice creation must be as fast on Android; the output must look like Refrens, not an accounting ledger.
2. **Copy Dukaan's onboarding.** Phone, name, logo, share a link in under five minutes; that is the bar for Flow 1.
3. **Own the gap nobody fills**: public catalog → quote as an editable document → booking / job → invoice → UPI payment, all under the business's brand. No competitor connects these five.
4. **White-label is the moat for agencies and IT services**; Zoho and Refrens leak their brand on every customer touchpoint.
5. **Quotes as documents** (optional lines, scope text, versions, accept on the page) is the single most differentiating screen; invest the design time there.
6. **Match Vyapar on offline tolerance** at least for reading today's bookings and jobs, and for drafting a quote (see NFRs).
7. **Do not compete on accounting depth**; export to Tally / Zoho Books in Phase 3 instead.

# Non-functional requirements

Oct 18, 2026 · @Ravin

The product must feel instant on a ₹10,000 Android phone over a patchy 4G connection, because that is where staff and customers use it. Every target below is testable and belongs in the Phase 1 quality gate (WBS 4.1).

## Requirements

| Category | Requirement | Target | How verified |
| --- | --- | --- | --- |
| Performance | Public catalog and quote pages load fast on a mid-range Android over 4G | LCP ≤ 2.5 s on a Moto G-class device, Slow 4G throttle; page weight ≤ 300 KB before images | Lighthouse in CI on every PR |
| Performance | Workspace actions feel instant | Interaction to next paint ≤ 200 ms; optimistic updates for status changes | Web vitals telemetry |
| Performance | PDF generation | ≤ 3 s for a 2-page quote; queued, never blocks the UI | Job metrics |
| Offline | Staff can read today's bookings and jobs and draft a quote without network | Cached last 7 days; drafts saved locally and synced; clear "offline" banner, no silent loss | Manual test with airplane mode |
| Mobile | Every workspace screen usable one-handed | Primary action within thumb reach; touch targets ≥ 44 px; no horizontal scroll | Design review checklist |
| Accessibility | WCAG 2.1 AA on all customer-facing pages and PDFs | Contrast ≥ 4.5:1 (enforced by theme generator); keyboard navigation; labels on every input; PDFs tagged | axe in CI + manual screen-reader pass |
| Reliability | Uptime and recovery | 99.5% monthly; RPO 1 h, RTO 4 h; nightly backups with a monthly restore drill | Status page, drill log |
| Security | Tenant isolation and auth | RLS on every table; sessions revocable; re-auth for billing and deletion; rate limits on portal forms and token lookups; OWASP top-10 review before pilot | Pen-test checklist in WBS 4.1 |
| Privacy (DPDP) | Customer data handled lawfully | Consent line on the quote-request form; privacy notice per workspace; export and erasure within 30 days; data stored in India (Mumbai region) | Legal review; erasure job tested |
| Tax | GST correctness | CGST / SGST / IGST split by state; HSN on goods; invoice fields per GST invoice rules; numbering gap-free | Accountant review on sample invoices |
| Scale | Phase 1 capacity | 2,000 workspaces, 50 k invoices / month, 1 M portal views / month without architectural change | Load test before pilot |
| Observability | Know when a business is stuck | Error tracking, per-workspace audit log, funnel events (lead → quote → accepted → paid) | Dashboards before pilot |
| Localisation | English only in Phase 1, but ready for more | All strings in resource files; dates, currency and numbering formatted for en-IN; no concatenated sentences | Lint rule |
| Browser support | Where customers and staff actually are | Chrome Android last 3 versions, Safari iOS last 2, Chrome / Edge desktop last 2; WhatsApp and Instagram in-app browsers | BrowserStack smoke suite |

# Glossary

Oct 18, 2026 · @Ravin

One word per concept, used identically in UI copy, messages, PDFs and code. Where several words are common, the table names the one we use and the ones we avoid.

## Terms

| Term (use this) | Meaning | Not this |
| --- | --- | --- |
| Accept | The customer confirms a quote on its page | Approve, sign, confirm (for quotes) |
| Add-on | An optional extra attached to a catalog item, priced separately | Extra, upsell |
| Approve | The owner confirms a payment proof; the only path to Paid in Phase 1 | Verify, accept (for payments) |
| Booking | A reserved time with a staff member, from a quote or a bookable package | Appointment (allowed as a vertical label for salons), slot, reservation |
| Business | The company using Biz4Kit (the tenant) | Merchant, vendor, client, account |
| Catalog | The business's list of items and packages, public at its link | Menu (vertical label for restaurants), price list (the exported PDF only), store |
| Connector | A third-party integration behind an adapter: Razorpay, Stripe, Polar, Resend, WhatsApp | Integration, plugin, app |
| Customer | The person or company the business sells to; never has an account | Client (vertical label for agencies, IT), buyer, user |
| Item | One sellable thing in the catalog | Product, service, SKU (verticals may relabel in UI, the entity stays Item) |
| Invoice | A numbered request for payment; gap-free numbering | Bill, receipt (receipt is what follows payment) |
| Job | The work done for an accepted quote or booking, with checklist and photos | Service, task, order |
| Lead | A request for a quote, from the portal or entered by staff | Enquiry (allowed in customer-facing copy), prospect, opportunity |
| Member | A person with a login in a workspace, with a role | User, employee, staff (role name only) |
| Owner | The role with full control, including approvals and billing | Admin |
| Package | A fixed-price bundle of items, optionally tiered and bookable | Plan (reserved for Biz4Kit's own subscription), bundle, combo |
| Payment request | The UPI link, QR and bank details a customer uses to pay an invoice | Payment link (reserved for gateway links in Phase 2) |
| Plan | A Biz4Kit subscription tier: Free, Starter, Team, Agency | Package |
| Proof | A PDF or image showing a payment was made, uploaded for approval | Screenshot, receipt |
| Quote | A priced, versioned document the customer can accept | Estimate, proposal (vertical label for IT and agencies), quotation |
| Ready message | Pre-written text for an event that staff copy or share | Template (settings only), notification |
| Receipt | Confirmation sent after a payment is approved | Invoice, bill |
| Share | Hand a link, PDF or ready message to a customer by any channel | Send (reserved for Phase 2 automatic sending), export |
| Version | A revision of a quote under the same number | Revision, draft, copy |
| Workspace | One business's isolated space in Biz4Kit: data, members, brand | Account, organisation, tenant (code only) |

# Competitor glossary

Oct 18, 2026 · @Ravin

Owners arrive speaking Vyapar, Zoho, Refrens or Dukaan; we translate each of their words into one of ours, keep ours simpler, and show their old word once as a hint so nobody feels lost. Terms come from general knowledge of the four products; check the live apps before relying on an exact label.

## Conversion rules

1. **One word per concept**, the one in our Glossary tab; a competitor word never appears as a label in our UI.
2. **Plain over accounting**: we say what the owner does (quote, share, get paid), not the ledger term (receivable, payment-in, debit note).
3. **Familiar-word hint, once**: on an owner's first visit to a screen, a small line says "Vyapar calls this Party" (based on the tool they told us at onboarding); dismissed, it never returns.
4. **Import mapping**: CSV exports from these tools map column headers to our fields automatically (Party Name → Customer, Item Name → Item, Rate → Price, GSTIN → GST number); AI ingest in Phase 2 handles the messy ones.
5. **If we lack their concept**, the hint says so and what to do instead ("We don't track stock; keep using your stock app, we handle quotes and invoices").

## Term map

| Their word | Used by | What it means there | Our word | Why ours is simpler |
| --- | --- | --- | --- | --- |
| Party | Vyapar | Any customer or supplier | **Customer** | Owners sell to customers; we don't do purchases, so one side only |
| Contact / Customer / Client | Zoho, Refrens | The person billed | **Customer** | One word; "Client" allowed only as a vertical label for agencies and IT |
| Vendor / Supplier | Refrens, Zoho | Someone you buy from | not in Biz4Kit | We don't do purchasing; hint points to their accounting app |
| Item / Product / Service / Stock | Vyapar, Zoho | A sellable line, often with inventory | **Item** (relabelled per vertical: service, product, dish, deliverable) | No stock or godown; an item is just what you sell |
| Products / Store | Dukaan | Goods listed in an online shop | **Item / Catalog** | A catalog can hold services and quote-only items; a store can't |
| Catalog / Online store link | Dukaan | Public page to buy from | **Catalog** | Same idea; ours leads to a quote or a booking, not only a cart |
| Estimate / Quotation | Vyapar, Zoho, Refrens | A priced offer before an invoice | **Quote** | Shorter; a document the customer can accept on the page |
| Proforma invoice | Vyapar, Refrens | A quote shaped like an invoice, often for advance payment | **Quote, issued as proforma** | One object with a switch, not a second document type |
| Sale order / Order | Vyapar, Zoho, Dukaan | A confirmed purchase before delivery or billing | **Accepted quote** (and **Booking** or **Job** for services) | Acceptance is the order; no separate screen to maintain |
| Delivery challan | Vyapar | Goods-movement note without tax | out of scope (Phase 1) | Manufacturers may need it; decide with e-way bills in WBS 6.4 |
| Sale invoice / Tax invoice | Vyapar, Zoho, Refrens | The bill | **Invoice** | One word |
| Retainer invoice / Advance | Zoho, Refrens | Bill for money up front | **Advance invoice** (from a quote with an advance %) | Created automatically on acceptance |
| Recurring invoice / Subscription | Zoho | Bill that repeats | **Recurring invoice** (Phase 2) | Same word, fewer settings |
| Payment-in / Payment received / Receipt voucher | Vyapar, Zoho | Record that money came | **Payment** (recorded with **Proof**, then **Approved**) | Says what happened; approval is explicit |
| Receivable / Udhaar / Outstanding | Vyapar, Refrens | Money owed to you | **Overdue list** and **Due** | A list to act on, not a ledger balance |
| Payment link | Refrens, Zoho, Dukaan | Gateway URL to pay | **Payment request** (Phase 1: UPI QR + bank); **Payment link** reserved for Phase 2 gateways | Keeps the manual and gateway paths distinct |
| Payment reminder | Vyapar, Zoho | Automated nudge for dues | **Reminder** (ready message in Phase 1, auto in Phase 2) | Same word |
| Credit note / Debit note | Vyapar, Zoho, Refrens | Corrections to an issued invoice | **Credit note** (Phase 2); no debit notes | One correction type is enough for service businesses |
| Expense | Vyapar, Zoho, Refrens | Money you spent | not in Biz4Kit | Not our job; CA export covers it |
| Ledger / Statement | Refrens, Vyapar | Running account per party | **Customer timeline** | Shows quotes, bookings, invoices and payments as events, not debits and credits |
| Lead management / CRM | Refrens | Pipeline of prospects | **Leads** | One inbox and a board; no CRM vocabulary |
| Projects / Timesheets / Time tracking | Zoho | Work logged for billing | **Job** (with time logged) | A job is what staff understand |
| Customer portal | Zoho, Refrens | Login area for customers | **My orders** (private link) | No login |
| Templates (invoice themes) | Zoho, Refrens | Choose an invoice look | **Brand** (set once) | One branded look everywhere instead of picking a theme per document |
| Organization / Company / Business profile | Zoho, Refrens | The tenant | **Workspace** (code) / **Business** (UI) | Owners say business |
| Godown / Warehouse | Vyapar | Stock location | not in Biz4Kit | No inventory |
| e-Way bill | Vyapar | Transport document for goods | decision pending (WBS 6.4) | Hint explains the current answer |
| Online store / Dukaan link | Dukaan | Shop URL to share | **Catalog link** | Same action, works for services |
| Orders | Dukaan | Purchases placed in the store | **Quote requests** and **Bookings** | Our customers ask or book; they don't check out |
| Coupons / Discounts | Dukaan | Price cuts at checkout | **Discount** on a quote or invoice | One place, set by the owner, no codes to manage |
| Themes / Plugins | Dukaan | Store appearance and add-ons | **Brand**, **Connectors** | Two words for two things |
| Dukaan Delivery | Dukaan | Shipping integration | not in Biz4Kit | Services and quotes don't ship |
| Abandoned cart | Dukaan | Buyer left without paying | **Quote not accepted** / **Follow up** | We follow up a person, not a cart |

## What this means for design

- The onboarding step "Which app do you use today?" (Vyapar, Zoho, Refrens, Dukaan, Excel, none) drives the familiar-word hints and the import mapping.
- Hints are a single line under the screen title, grey, dismissible, never a tour.
- Import screens show the mapping before saving so the owner can correct it; unmapped columns are listed, not silently dropped.
- Our Glossary tab wins every naming argument; this tab only explains how to get there from a competitor's words.
