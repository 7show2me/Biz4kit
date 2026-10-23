# Design inputs

Rewritten 2026-10-24 to match `docs/decisions.md` (D1–D102) and the locked prototype `design/app/` (D94). Previous version: `prep/archive/2026-10-24/Design inputs.md`.

Oct 18, 2026 · @Ravin · rewritten Oct 24, 2026

Eight documents a designer needs, in the order to read them. The first three gate design; the rest run alongside. Where this document and `docs/decisions.md` differ, the decision wins.

1. [1 Personas & JTBD](#personas--jobs-to-be-done) — who the owner, staff and customer are in each of the six launch verticals, and the one job each must get done.
2. [2 User flows & screens](#user-flows--screen-map) — every path through the product, step by step, plus the full list of screens.
3. [3 Data model](#data-model--business-rules) — entities, fields, states and business rules.
4. [4 Brand & theming](#brand--theming) — Biz4Kit's own brand and the white-label theming rules.
5. [5 Message templates](#message-templates) — every ready message, with English wording and variables.
6. [6 Competitor teardown](#competitor-teardown) — what Zoho, Vyapar, Refrens and others do well and where they leave room.
7. [7 NFRs](#non-functional-requirements) — non-functional requirements: performance, offline, accessibility, privacy.
8. [8 Glossary](#glossary) — one meaning per term, used in all UI copy.
9. [9 Competitor glossary](#competitor-glossary) — the words Vyapar, Zoho, Refrens and Dukaan use, each mapped to our simpler word, with import mapping and familiar-word hints.

The working spec for every screen is the locked prototype `design/app/` (38 screens, D94); `design/screens-v2.html` is its visual reference and `docs/implementation-notes.md` the build notes. A screen changes only through a new decision row.

# Personas & jobs-to-be-done

Biz4Kit is a brand kit, not a CRM (D63): it lets a small business track its leads, reply with a price, invoice and get paid under its own name. It serves three people in every business: the owner who sets it up, the staff who use it on site, and the customer who never logs in. The verticals change the vocabulary and the device, not the three jobs: get a price out fast, get the work done without retyping, get paid without chasing.

## Core personas

|  | Owner — "Priya" | Staff — "Rahul" | Customer — "Anita" |
| --- | --- | --- | --- |
| Who | Runs the business, 30–50, does sales and accounts herself; 1–15 staff | Technician, stylist, sales executive or designer, 20–35; paid per month, not per task | Walk-in or online buyer; a consumer (salon, restaurant) or another business (wholesale, IT, manufacturing) |
| Device & context | Laptop in the evening, phone all day; multitasking between customers | Android phone only, often one-handed, on site, patchy network | Phone, arriving from a WhatsApp link, QR code or Instagram bio; will not install anything or create an account |
| Jobs to be done | Reply with a professional price within minutes of a request; know what is owed and by whom; look bigger than she is | Know today's bookings and jobs; finish a job and move on without paperwork; not get blamed for a missed payment | See prices without asking; get a clear price quickly; pay the way she already pays (UPI) and get a receipt |
| Frustrations today | Price list is a stale PDF; prices typed in WhatsApp get lost; invoices in Word; chasing payments by hand; every tool looks like someone else's brand | Told things verbally and forgets; takes photos that end up nowhere; calls the owner for every price | "Send me the rate list" gets a photo; prices contradict each other; no proof of what was agreed |
| Trust signals | Her logo and colours on everything; GST-correct invoices; nothing her customers see says Biz4Kit beyond a small footer on free-plan pages (D89) | Clear list of what is mine today; marking a job done takes two taps | A branded page with the business's name, a document number, a pay-by date, a receipt |
| Success metric | Request → reply under 10 minutes; overdue list shrinks week on week | Zero jobs finished without an invoice created (marking done makes the draft, D88) | Pays the first reply; pays within 48 h of the invoice |
| Permissions | Everything, including approving payment proofs, cancelling issued invoices and billing | Own bookings and jobs; create replies and invoices; upload payment proof | None; acts only through private links |

Roles in a workspace: **Owner**, **Manager**, **Staff**, **Accountant** (read-only plus export, D91). Biz4Kit's own **Super-admin** sees a read-only support view.

## Vertical sheets

| Vertical | Owner & team | Customer | Where they sell today | Top job for Biz4Kit | Vocabulary & defaults |
| --- | --- | --- | --- | --- | --- |
| Salon / spa | Owner-stylist + 3–8 stylists on shifts | Consumers, repeat visits every 3–6 weeks, book by WhatsApp or walk in | Instagram, Google Maps, WhatsApp | Bookings with a visible service menu; packages (bridal, monthly) | "Services", "appointment", "package"; per-stylist calendar; prices per service |
| IndiaMART wholesaler | Proprietor + 1–3 sales executives handling marketplace leads | Other businesses, price-sensitive, ask for prices in bulk, negotiate | IndiaMART enquiries, phone, WhatsApp | Turn a marketplace enquiry into a priced reply in minutes; GST invoice with HSN codes | "Products", "MOQ", "rate", "proforma invoice"; quantity tiers; HSN per item; delivery terms |
| Restaurant / café | Owner + manager + kitchen; catering side business | Dine-in diners (menu via QR) and event hosts (catering prices) | Zomato / Swiggy, QR menus, WhatsApp | QR menu that is always current; catering reply with per-plate pricing | "Menu", "dish", "per plate", "event date", "advance"; veg / non-veg tags; deposits |
| IT services | Founder + 2–10 engineers | SMBs buying websites, apps, AMC support; expect proposals and milestones | Referrals, LinkedIn, Upwork | Proposal-style reply with scope and milestones; partial invoices; AMC packages | "Proposal", "scope", "milestone", "AMC", "retainer"; hourly and fixed; partial invoices |
| Small manufacturer | Owner + production supervisor + sales | Dealers and businesses; repeat orders; specifications matter | Dealers, IndiaMART, trade fairs | Replies with specifications and lead time; job tracking from order to dispatch | "Items", "specification", "lead time", "dispatch", "GST / HSN"; units (kg, pcs, m) |
| Design agency | Founder + 2–8 designers | Startups and SMBs; want options and a clear price per deliverable | Instagram, Behance, referrals | Package tiers (Basic / Standard / Premium); doc-style reply the client pays online | "Proposal", "deliverable", "revision", "retainer"; packages; 50% advance invoice |

Pilot verticals are salons and design / IT agencies; starter kits for all six verticals still ship (D1).

**Default follow-on after a quoted lead the customer pays, per vertical** (D56, D66, D90):

| Vertical | Follow-on |
| --- | --- |
| Salon or spa | Booking (appointment) → Job → Invoice; most sales start as a direct package booking |
| Restaurant or café | Advance invoice on accept → Booking (event date) → Job → balance invoice |
| Wholesaler | No booking; proforma `PI-` → tax invoice `INV-` when the payment is approved, as for every vertical (D90); Job optional |
| Manufacturer | Job (order → dispatch) → Invoice |
| IT services | Job → partial invoices; "milestone" is a label (one line or one job per milestone; no milestone field in Phase 1) |
| Design agency | 50 % advance invoice on accept → Job → balance invoice |

Design implication: the generators are identical across verticals; what changes per vertical starter kit is labels (service / product / dish / deliverable), default units, whether HSN and MOQ fields show, whether the serial-number and warranty feature is on (D85), and whether bookings or jobs are the default follow-on. Only the salon kit is written; the other five are drafted by Claude, every value marked "[Draft]", and approved by the owner before WBS 4.2 ships (D96).

# User flows & screen map

Four flows cover Phase 1; the screen map lists the 38 screens of the locked prototype (D94) across auth, onboarding, workspace, invoices and the customer pages.

## Flow 1 — Owner onboarding (target: 8 minutes to a shareable catalog)

1. Land on biz4kit.com (D47) → **Continue with Google** (web or app). Better Auth creates the user; email is already verified by Google.
2. **Create workspace**: business name → slug suggested (`<brand>.biz4kit.com`, D47), vertical picked from six cards. The vertical picks the starter kit and switches the serial-number and warranty feature on for Wholesaler and Manufacturer (D85).
3. **Brand**: upload logo (light; dark optional), pick two colours or let the app extract them from the logo; live preview of an invoice header and the catalog page.
4. **Business details**: phone, address, GST number (optional, unlocks GST fields), UPI ID for payment requests, invoice prefixes `PI-` and `INV-` (D60, D71).
5. **Catalog starter**: vertical starter kit loads sample items and packages; owner edits prices inline, deletes what doesn't apply, or imports a CSV.
6. **Invite team**: email addresses with role; invites can be skipped and done later.
7. **Done screen**: catalog link, QR code to download, "share price list" ready message (route `/new/done`).

A **first-run checklist** stays on Today for the Owner until the first reply is shared or the Owner hides it (D87): business details (address, phone, and UPI or bank), brand, at least three catalog items, a team member, the price list shared, the first reply shared.

Exit points: close at any step and the workspace is saved; re-entry returns to the same step. Verification loop: an invited member signs in with Google, sees the pending invite, accepts, lands in the right workspace with the assigned role.

## Flow 2 — Lead to paid reply

A **lead** is anything a customer requested, of two types (D59): **quoted** (asked for a price) and **booked** (booked a slot for a bookable package).

1. A quoted lead arrives from the request form, or staff enter one.
2. The business reviews it (D61): **Accept** prices it and shares a proforma invoice `PI-` (the **reply**, D60); **Edit** changes items, quantities and the brief before pricing; **Reject** shares ready message 18 (Request declined).
3. The reply is shared by Email (sent by the app) or SMS / WhatsApp (copied, D67), ready message 4. An edited reply is a new version under the same `PI-` number (D60); the customer's link always shows the latest (message 5).
4. The customer ticks any optional lines on the pay page (D102) and pays; **paying is the acceptance** (D60). A reply can ask for an advance %, set per reply or package, no fixed default (D66): the reply is then the advance proforma and the balance is a separate invoice later (D70).
5. Loops: a follow-up (message 6) while unpaid; past its pay-by date an unpaid reply turns **Expired**, not overdue, and can be revived as a new version (D75). A rejected or expired reply cannot be paid (D73).
6. The lead turns **Paid** when every invoice on it is fully paid (D72).

A booked lead is assigned to a staff member and confirmed to the customer by Email or SMS (ready message 10); it is invoiced after the service, or at booking when the package sets an advance % (D62).

## Flow 3 — Job to paid

1. A booking (To confirm → Agreed, D68, D69) starts a **Job**; staff tick the checklist and add before / after photos and materials (D87).
2. **Marking the job done makes the draft invoice at once** (a bill, or the balance after an advance, D70, D88); ready message 17 goes to the customer. The next step is **Review and send**: the team checks the draft and shares it (`PI-`, message 12).
3. The customer pays by UPI or bank and uploads proof on the pay page; or staff record a cash payment.
4. Any member except the Accountant (D91) can record a payment or upload proof; only the Owner, or a Manager strictly below the amount limit the Owner sets in Settings, approves (D57, D74). The approver cannot be the uploader when another approver exists; when the Owner is the only approver, self-approval is allowed and logged (D74). Approval above the open balance is refused (D76); a payment made on an older version applies to the latest (D76).
5. Approvers can decide from the in-app queue or from the **approve-from-email link** (single use, expires in 48 h, D57, D87).
6. Approval writes the Payment record; once approved payments cover the total, the invoice is Paid and takes the next `INV-` number (D60, D71), and the receipt message (15) is offered. Some paid, some still due = **Part paid** (D55). Overdue bills get reminders 13 (up to 6 days) and 14 (from day 7) from the Overdue page (D64).

The same gate applies to a gateway payment in Phase 2 only when the webhook fails to match an invoice.

## Flow 4 — Customer pages (no account, ever)

1. **Arrive** at `<brand>.biz4kit.com` (D47) from a QR code, WhatsApp link or Instagram bio. The page loads in the business's brand; no Biz4Kit chrome, only a "Made with Biz4Kit" footer on the free plan (D78, D89).
2. **Browse** categories, packages, search; tap an item for its photos and details; a minimum order shows where the item sets one (D87). Prices visible by default; the owner can hide prices per item ("Request a quote", D101).
3. **Request a quote** (D101): basket of items or a free-text brief, photos, preferred date, name and phone; quantities start at the item's minimum order. Submit creates a quoted lead (D59) and shows a confirmation with the business's phone number.
4. **Receive the reply** (D60, D61): an accepted request comes back as a private link to the proforma `PI-` on the pay page (step 6); a rejected request gets the rejection message. There is no separate quote page.
5. **Book** (bookable packages only): pick staff and a slot inside the business's opening hours (D97, D99); confirmation screen with add-to-calendar. This makes a booked lead the business assigns and confirms (D59, D62); the booking shows To confirm until Agreed (D68, D69).
6. **Pay**: the pay page shows the lines (optional lines ticked by the customer, D102), amount, UPI deep link (opens any UPI app), QR and bank details; "I have paid" uploads a screenshot to the approval queue, shown as received only once the business confirms. After approval the page shows Paid with the `INV-` number (D60); receipt downloadable. An expired or rejected reply says it is no longer valid and cannot be paid (D73).
7. **My orders**: a private per-customer link (sent with the first reply) listing every request, booking, invoice and receipt.
8. **Warranty card** (D85, D86): when the business uses serial numbers, each invoice row with a serial has a private card link showing the item, model, serial, cover and end date, with the customer's phone masked.

Private links are long random tokens; opening one is the proof of identity. Phase 2 adds OTP where the owner wants it.

## Screen map (Phase 1)

The 38 screens of the locked prototype (D94). Numbers are the prototype's order; ids are the screen ids in `design/app/js/screens/*.js`.

| # | Area | Screen (id) | Route | Primary action | Who |
| --- | --- | --- | --- | --- | --- |
| 1 | Auth | Sign in (`login`) | `/login` | Continue with Google | Owner, Staff |
| 2 | Auth | Accept invite (`invite`) | `/invite/:token` | Join workspace | Staff |
| 3 | Onboarding | Create workspace (`new`) | `/new` | Create | Owner |
| 4 | Onboarding | Brand setup (`brand`) | `/new/brand` | Save and preview | Owner |
| 5 | Onboarding | Business details (`details`) | `/new/details` | Save | Owner |
| 6 | Onboarding | Catalog starter (`catalog-starter`) | `/new/catalog` | Keep / edit / import | Owner |
| 7 | Onboarding | Invite team (`team`) | `/new/team` | Send invites / skip | Owner |
| 8 | Onboarding | Done (`done`) | `/new/done` | Share price list, download QR | Owner |
| 9 | Workspace | Today (`dashboard`) | `/w/:slug` | 4 key numbers, paid-per-day chart, money owed, leads to answer, first-run checklist (D52, D77, D87) | All |
| 10 | Workspace | Board (`board`), an extra (D63) | `/w/:slug/pipeline` | New → Replied → Booked → In service → Invoiced → Paid; only moves an action can do (D65, D72) | Owner, Manager, Staff |
| 11 | Leads | Leads inbox (`leads`) | `/w/:slug/leads` | Open, assign; quoted / booked chip; tabs New, Contacted, Replied, Snoozed, Rejected, Paid; high priority first (D59, D66, D87) | All |
| 12 | Leads | Lead detail (`lead`) | `/w/:slug/leads/:id` | Accept / Edit / Reject (quoted) or Assign + Confirm (booked); priority (D61, D62, D87) | All |
| 13 | Catalog | Items list (`catalog`) | `/w/:slug/catalog` | Add item, reorder, import CSV; "Your page" card and Share price list (Quick Catalog, D77) | Owner, Manager |
| 14 | Catalog | Item editor (`item`) | `/w/:slug/catalog/:id` | Save; photos and MOQ (D87); serial and warranty fields when the feature is on (D85) | Owner, Manager |
| 15 | Catalog | Packages (`packages`) | `/w/:slug/packages` | Add tier; a bookable package makes a booked lead (D59) | Owner, Manager |
| 16 | Bookings | Calendar (`bookings`) | `/w/:slug/bookings` | New booking, drag to move; To confirm / Agreed (D68, D69) | All |
| 17 | Jobs | Job list (`jobs`), an extra (D63) | `/w/:slug/jobs` | Open job | Staff, Manager |
| 18 | Jobs | Job detail (`job`) | `/w/:slug/jobs/:id` | Checklist, photos, materials, Mark done (makes the draft invoice), Review and send (D87, D88) | Staff, Manager |
| 19 | Invoices | Invoices list (`invoices`) | `/w/:slug/invoices` | New invoice; an unpaid `PI-` is not owed and expires (D75); serials missing flag (D86) | Owner, Manager, Accountant |
| 20 | Invoices | Invoice editor (`invoice`) | `/w/:slug/invoices/:id` | Share, request payment; draft → `PI-` → `INV-` on approval; advance and balance are two invoices; serial panel (D60, D70, D71, D86) | All |
| 21 | Invoices | Overdue payments (`overdue`) | `/w/:slug/invoices/overdue` | Remind by Email or SMS (ready messages 13 / 14, D64, D67) | Owner, Manager, Accountant |
| 22 | Invoices | Invoice email (`invoice-email`) | email · ready message 12 | Open invoice; sender is the business name, reply-to the owner (D35) | Customer |
| 23 | Invoices | Invoice PDF (`invoice-pdf`) | PDF · A4 · `/i/:token/pdf` | Download, attach to email; no Biz4Kit mark (D89) | Customer, Accountant |
| 24 | Payments | Record payment / upload proof (`record`) | modal | Submit for approval | Owner, Manager, Staff (D91) |
| 25 | Payments | Approval queue (`approvals`) | `/w/:slug/approvals` | Approve / reject; self-approval logged, no overpayment, rejected / expired replies blocked, Snoozed warns (D73, D74, D76) | Owner (Manager strictly below the limit, D57, D74) |
| 26 | Customers | Customer list (`customers`), an extra (D63) | `/w/:slug/customers` | Open; owed counts bills only (D75) | All |
| 27 | Customers | Customer timeline (`customer`) | `/w/:slug/customers/:id` | New invoice (D60) | All |
| 28 | Reports | Reports (`reports`) | `/w/:slug/reports` | Export CSV; money in only (D77) | Owner, Accountant |
| 29 | Settings | Settings (`settings`) | `/w/:slug/settings/*` | Tabs Brand, Business (incl. opening hours, D97, D99), Numbering, Team, Roles, Messages, Devices; Extras switches (D63, D81, D85) | Owner |
| 30 | Portal | Catalog (`p-catalog`) | `<brand>.biz4kit.com` | Request a quote (D101) | Customer |
| 31 | Portal | Request form (`p-request`) | `/request` | Submit | Customer |
| 32 | Portal | Booking picker (`p-book`) | `/book/:package` | Confirm slot inside opening hours (D99) | Customer |
| 33 | Portal | Invoice & pay page (`p-pay`) | `/i/:token` | Tick optional lines, pay by UPI, upload proof; expired or rejected replies cannot be paid (D73, D102) | Customer |
| 34 | Portal | My orders (`p-orders`) | `/me/:token` | Open any record | Customer |
| 35 | Sales | Serial lookup (`serials`) | `/w/:slug/serials` | Find by serial, model, batch or customer; open the warranty card (D85, D86) | All |
| 36 | Portal | Warranty card (`p-warranty`) | `/wc/:token` | Show, print, call for service (D86) | Customer |
| 37 | Payments | Approve from email (`approve-link`) | `/a/:token` | Approve / reject one payment; link 48 h, single use (D57, D87) | Owner, Manager |
| 38 | Home | Notifications (`inbox`) | `/w/:slug/inbox` | Open a record; mark read; mute a kind for yourself (D87) | All |

The invoice editor, pay page, invoice email and invoice PDF render from the same blocks (D60). The Share dialog on Catalog and Invoice is not its own screen: copy link / message, PDF, WhatsApp; email is sent by the app (D67).

**Navigation** (D80–D83): the sidebar has five sections, **Home · Sales · Schedule · Payments · Business**, each opening to its pages:

| Section  | Pages                                            |
| -------- | ------------------------------------------------ |
| Home     | Today, Board (extra), Reports                    |
| Sales    | Leads, Customers (extra), Serials (when on, D85) |
| Schedule | Bookings, Jobs (extra)                           |
| Payments | Invoices, Overdue, Approvals                     |
| Business | Catalog, Packages                                |

**Settings** is its own sidebar item under a divider (D83). Favourites tiles (Catalog, Create invoice, Send reply) sit above it (D82, D83). The top of the sidebar shows the 4B mark beside the business name, no Biz4Kit wordmark (D79); the business logo sits on the profile button (D78, D83). The header bell opens the notification inbox with an unread count (D87).

**Lite mode** (D63, D77): the core is Quick Catalog, Quick Reply, Quick Invoice and Quick Cashflow (money in only); Board, Customers and Jobs are extras the owner switches on, and Serial numbers and warranty is an extra on by default for Wholesaler and Manufacturer (D85).

# Data model & business rules

All entities are scoped by `workspace_id`; a CatalogItem is the unit everything else is built from, and an InvoiceLine is copied, never referenced, so a later price change never alters a shared invoice. There is no Quote entity: the priced reply to a quoted lead is an Invoice (D60).

## Entities

Every table has `id`, `workspace_id`, `created_at`, `updated_at`, `created_by`; those are omitted below. Money is stored as integers in paise.

| Entity | Key fields | Relations | Notes |
| --- | --- | --- | --- |
| Workspace | name, legal\_name, slug, vertical, logo\_light, logo\_dark, color\_primary, color\_accent, gst\_number, state\_code (from the GSTIN), address, city, pin, state, phone, email, upi\_id, bank\_details (json), currency = INR, numbering (json: `PI` and `INV` prefix + next, separate gap-free series, D60, D71), reply\_valid\_days, bill\_due\_days, approvals (json: manager\_enabled, manager\_limit, D57), modules (json: board, customers, jobs, serials, D63, D85), opening\_hours (json: per weekday up to two ranges, D99), terms\_default, setup\_dismissed, plan | has many of everything | slug unique globally |
| Member | user\_id, role (owner / manager / staff / accountant), status (invited / active / removed), invited\_email, seen\_at, mute (json per inbox kind, D87) | belongs to Workspace; User from Better Auth | one Owner minimum, enforced; removal is a soft delete |
| Customer | name, phone (unique per workspace, normalised), email, company, gst\_number, state\_code, address, tags\[\], portal\_token, notes | has many Lead, Booking, Invoice | portal\_token = My-orders link; state code from the GSTIN when present |
| CatalogItem | name, description, category, photos\[\] (D87), unit (hr / pc / kg / m / sqft / plate / day), price, gst\_rate, hsn\_code, moq (D87), show\_price, is\_active, sort\_order; with the serial feature: serials (tracked per unit), model, model\_no, cover (warranty / guarantee), cover\_months, track\_batch (D85) | belongs to Workspace; referenced by Package, copied into InvoiceLine | price change never touches past invoices; variants and add-ons are Phase 2 (D87) |
| Package | name, tier (basic / standard / premium / none), items (json: item\_id, qty), price, billing (one\_time / monthly), is\_bookable, duration\_min, advance\_pct (no fixed default, D66), description, is\_active | belongs to Workspace | package → invoice starter copies items |
| Lead | customer\_id, type (quoted / booked, D59), source (qr / web / instagram / referral / manual / marketplace), brief, lines (requested items, qty), photos\[\], preferred\_date, package\_id, assignee\_id, priority (normal / high, D87), status, snoozed\_until, reject\_reason, consent | has many Invoice | created by the request form, a booking, or manually; location is Phase 2 (D87) |
| Invoice | kind (reply / advance / balance / bill), pi\_number, inv\_number, customer\_id, lead\_id, booking\_id, job\_id, version, history (json), doc (json blocks), lines (InvoiceLine\[\]), discount, subtotal, tax\_total, total, paid\_total, pay\_by, due\_date, shared\_at, cancelled, token | has many Payment | `PI-` until approved payments cover the total, then the next `INV-` (D60, D71) |
| InvoiceLine (embedded) | item\_id (nullable), name, description, qty, unit, unit\_price, gst\_rate, hsn\_code, is\_optional, is\_selected, sort; on an advance line full\_rate (D70); with the serial feature: tracked, model, model\_no, cover, cover\_months, track\_batch, serial, batch, card\_token (D85, D86) | inside Invoice | snapshot of the item at time of writing; serial unique per workspace across live invoices |
| Booking | customer\_id, lead\_id, package\_id, member\_id, start\_at, end\_at, status, notes | has one Job | conflict check on member + time; slots inside opening hours (D99) |
| Job | booking\_id, lead\_id, customer\_id, assignee\_id, title, checklist (json), photos (before / after, D87), materials (json: name, qty, unit, note; no prices, D87), status, start, completed\_at, invoice\_id | has one Invoice | done → draft invoice at once (D88); time logged is Phase 2 (D87) |
| Payment | invoice\_id, amount, method (upi / bank / cash / card / gateway), reference, proof\_files\[\], uploaded\_by, by\_customer, uploaded\_at, status, approved\_by, approved\_at, reject\_note, self\_approved, version, gateway (json, Phase 2) | belongs to Invoice | approval is the only way to Paid in Phase 1 |
| Message | record\_type, record\_id, template\_id, event, channel (email / sms / whatsapp / copy), to, subject, body, sent\_by, sent\_at | belongs to any record | Phase 1 sends email and logs copy / share for SMS and WhatsApp (D67) |
| ActivityLog | record\_type, record\_id, actor\_id, action, diff (json) | belongs to any record | audit for every mutation |

## State machines

Status colours are unique within each record (D55); text on soft fills meets contrast (D26, D51).

| Entity | States and colours | Transitions | Who |
| --- | --- | --- | --- |
| Lead | New (blue) → Contacted (grey) → Replied (violet) → Paid (green); Snoozed (amber), Rejected (red). Type quoted / booked is a chip, not a status (D59, D66) | Replied when a reply is shared (or a booked lead is confirmed); Paid when every invoice on the lead is paid (D72); Rejected sends message 18; a paid or rejected lead is closed | Staff, Manager |
| Booking | To confirm (grey) → Agreed (teal) → In progress (blue) → Completed (green); Cancelled (red, D100), No-show (amber) (D68, D69) | Agreed when the business confirms (D62); In progress starts a Job | Staff; Customer books |
| Job | Open (grey) → In progress (blue) → Done (green) → Invoiced (violet) | Done requires the checklist complete and makes the draft invoice (D88); Invoiced when its invoice is paid | Staff |
| Invoice | Draft (grey) → shared as `PI-`. Reply or advance: Awaiting payment (blue) → Expired (grey) past pay-by (D75). Bill or balance: Due (amber) → Part paid (teal, D55) → Overdue (red). Any: Waiting for approval (violet) → Paid (green, takes `INV-`). Cancelled keeps its number | Paid when approved payments ≥ total; edits before payment are new versions of the same `PI-` (D60, D76); only the Owner cancels an issued invoice, never after an approved payment | Team; Owner cancels |
| Payment | Waiting for approval (violet) → Approved (green) / Rejected (red) | Approve, or reject with a note; a rejected proof can be re-uploaded as a new Payment | Owner, or a Manager strictly below the limit (D57, D74) |

Proforma vs tax invoice is the document kind (`PI-` / `INV-`), not a status (D66). Status is derived from the data, never stored as truth.

## Business rules

- **Numbering**: `{prefix}-{FY}-{seq}` e.g. `INV-2627-0042`, FY = Indian financial year (April–March). An invoice carries a `PI-` number from first share until approved payments cover its total, then takes the next `INV-` number (D60, D71), for every vertical (D90). Both series are gap-free and never reused; the next number never goes down; the two prefixes must differ; a cancelled invoice keeps its number. A `PI-` is not a tax invoice, and its PDF says so. Whether the sequence resets each financial year: CA to confirm.
- **Totals**: line\_total = qty × unit\_price; optional lines count only when selected; discount applies before tax (line or whole invoice, never both); tax per line at the line's GST rate; CGST + SGST when the customer's state equals the workspace's, IGST otherwise (customer state from their GSTIN when present; B2C place-of-supply rules beyond that: CA to confirm); totals stored as integers in paise; rounding to the rupee: CA to confirm.
- **GST fields appear only if the workspace has a GST number**; HSN / SAC is copied into each line; HSN shows for goods; a customer GST number switches the invoice to B2B format. The PDF carries the CA checklist fields (Legal & compliance); codes, terms and the computer-generated note stay marked "CA to confirm".
- **Pay-by and due dates**: a reply is valid for the workspace's `reply_valid_days`, a bill is due after `bill_due_days` (the prototype's 15 and 7 are sample values). An expired reply can be revived as a new version and gets a follow-up, not overdue reminders (D75). Only bills and balances are money owed (D75).
- **Optional lines** on a reply are excluded from the total until the customer ticks them on the pay page; the amount updates as they tick and the business sees the choice with the payment (D102).
- **Approval**: a payment turns an invoice Paid only after approval; proof file required for UPI / bank, optional for cash; the approver cannot be the uploader when another approver exists, else self-approval is logged (D74); a Manager may approve strictly below the limit once the Owner turns Manager approvals on (D57, D74); never above the open balance (D76); approval works in-app or from the email link, single use, 48 h (D57, D87). The Accountant is read-only plus export (D91).
- **Deposits** (D66, D70): a reply or package may ask for an advance % (no fixed default). The advance is its own `PI-` (each line at the % of its rate, own GST) that becomes `INV-` when approved; the balance is a separate invoice for the rest (price less the advance's taxable value, plus the rest of any discount), so nothing is taxed twice. GST on advances: CA to confirm (D70).
- **Job done** (D88): marking a job done makes the draft invoice (bill or balance); the team reviews and sends it.
- **Serial numbers and warranty** (D85, D86), when the feature is on: a tracked line keeps its qty until serials are entered, then splits into one row per unit with its own serial (amounts unchanged); serial is unique within the workspace (cancelled invoices free theirs); serials can be added later, even after payment; the proforma shows model and cover, the tax invoice also the serial and batch; cover starts on the invoice date and ends after `cover_months`; each row with a serial gets a warranty card on a private link.
- **Opening hours** (D97, D99): set by each business per weekday, up to two ranges a day; a day with no range is closed; no default hours. Booking slots start every 30 minutes and must fit the package length inside a range.
- **Tenancy**: every query is filtered by `workspace_id` in the API and by Postgres RLS; portal tokens are 32-byte random, revocable, and scoped to one record or one customer.
- **Deletion**: records are soft-deleted; customers can request export or erasure of their data (DPDP), which anonymises Customer and keeps invoice numbers for tax.

# Brand & theming

Two brands live in the product: Biz4Kit's own, seen by owners and staff inside the workspace, and each business's, seen by its customers on every link, PDF and message. The rule: anything a customer sees carries the business's brand, with at most a small "Made with Biz4Kit" footer on free-plan pages that carry no money (D89).

## Biz4Kit brand

The brand lives locally in `brand/` (D19): `brand/theme.css` (colours, fonts, radius, shadows), `brand/logo/*.svg`, `brand/design-system/` (brand book, tokens, usage rules) and `brand/preview.html`.

| Element | Decision |
| --- | --- |
| Name | **Biz4Kit**, always one word with a capital B and K; never "Biz 4 Kit" or "biz4kit" in copy. |
| Voice | Plain, warm, short. Second person. Says "you" and "your customer", never "the user". No jargon (no "CRM", "pipeline" in customer-facing copy). |
| Palette | Indigo / electric-blue theme in `brand/theme.css` (D10); dark-theme contrast fixes (D18); status colours: success, warning, destructive (D26, D51) plus info, violet and teal (D55). |
| Type | Workspace: Fraunces (headings, 24 px+), DM Sans (UI text), DM Mono (every amount and identifier, for tabular figures) (D20). Customer pages and PDFs: Inter (D34). |
| Logo | The 4B mark (Playfair Display Black, bold dash through the upper third, D15, D16); lockup with "Biz4Kit" on sign-in, onboarding, site, emails, documents (D17); dark versions on a bordered dark tile (D17). Must work at 24 px and in one colour. |
| Density | Compact, modelled on the shadcnblocks dashboard2 reference; density tokens in `brand/theme.css` (D52). |
| Tone of UI | Dense but calm, keyboard-friendly on desktop, large touch targets on phone, dark and light. Biz4Kit's own colours appear only in the workspace chrome (sidebar, settings, sign-in). |

## White-label rules

| Surface | Brand shown | Biz4Kit presence |
| --- | --- | --- |
| Sign-in, onboarding, approve-from-email page, settings | Biz4Kit | Full (lockup on sign-in and onboarding) |
| Workspace app (Today, lists, editors) | Biz4Kit chrome; the 4B mark beside the business name at the top of the sidebar, the business logo on the profile button (D78, D79); brand colour tints primary buttons and tags | 4B mark only, no wordmark (D79) |
| Catalog, request form, booking picker, My orders | Business | Free plan: small "Made with Biz4Kit" footer (D78, D89). Paid: none |
| Pay page, warranty card | Business | None (D89) |
| PDF invoice and receipt | Business: logo, colours, name, GST details, terms | None (D89) |
| Ready messages (WhatsApp, SMS, email) | Business name in the first line and the sign-off | Never |
| Emails (Phase 1 sends email, D67) | From the business name only, reply-to the owner, never "via Biz4Kit" (D35); own domain on Agency | Sender domain only |
| QR codes | Business colour, logo in centre | None |

Rule of thumb for any new surface: if a customer of the business can see it, it carries the business's brand; a page that carries money never shows ours (D89).

## Theme generation

The owner picks two colours (or the app extracts them from the logo); everything else is derived, so no business can produce an unreadable page.

1. **Inputs**: `primary`, `accent`, logo light (required), logo dark (optional).
2. **Derived tokens**: primary 50–900 scale (OKLCH lightness steps), `on-primary` chosen as white or near-black by contrast; accent used only for highlights and the QR centre; surface and text neutrals are fixed per light / dark theme; status colours are fixed and never overridden.
3. **Contrast gate**: text on primary ≥ 4.5:1, large text ≥ 3:1 (WCAG AA). If the chosen primary fails as a button background in a theme, the app shifts its lightness until it passes and tells the owner.
4. **Dark mode**: if no dark logo is uploaded, the light logo is placed on a light chip; primary is lightened one step for dark surfaces.
5. **PDF**: uses the light theme always; primary for the header band and table header, black text, logo max 48 mm wide.
6. **Storage**: tokens are generated once on save and stored on the Workspace as CSS variables and a PDF palette; pages read variables, never raw colours.
7. **Logo rules**: SVG or PNG ≥ 512 px, transparent background preferred; auto-trimmed; shown at fixed heights (32 px nav, 56 px page header, 48 mm PDF); never stretched.

# Message templates

Sixteen ready messages in Phase 1: the original seventeen, plus 18 Request declined (D61), less 8 and 9, retired because paying is the acceptance (D93). Each is written once in English, in a warm, plain voice, and rendered with the business's name. Phase 1 sends email itself; SMS and WhatsApp are ready to copy and paste (D67); Phase 2 sends them automatically.

## Template rules

- **Variables** in braces: `{business}`, `{customer_first}`, `{doc_no}` (the reply's number, D93), `{invoice_no}`, `{amount}`, `{due_date}`, `{valid_until}`, `{link}`, `{upi_id}`, `{date}`, `{time}`, `{staff}`, `{service}`, `{sender}`, `{days}`, `{question}`, `{reject_note}`. Amounts render as `₹12,500`; dates as `Tue 21 Oct`. Older saved templates may still use `{quote_no}`, which fills with the same number.
- **Channel lengths**: WhatsApp ≤ 60 words with the link on its own line; SMS ≤ 160 characters, link shortened; email adds a subject and a one-line sign-off.
- **Tone**: first name, one courtesy, the fact, the link, the sign-off with the business name. No exclamation marks except the payment-received message. No emoji by default; owner can turn on a single leading emoji per template.
- **Editable**: the owner can edit any template in Settings, Messages; a reset restores the default. Vertical starter kits swap nouns (service / product / dish / deliverable).
- **Logged**: every send or copy writes a Message row on the record, so the timeline shows what went out.

## Template catalog (English defaults)

Wording of 4–7 and 18 approved by the owner (D95); the rest are the original defaults.

| # | Event | Trigger | To | Text | Email subject |
| --- | --- | --- | --- | --- | --- |
| 1 | Price list | Owner taps share on the catalog | Prospect | Hi {customer\_first}, here is our current price list from {business}. Tap to browse and request a quote: {link} — {sender}, {business} | Our price list — {business} |
| 2 | Quote request received | Request form submitted | Customer | Thanks {customer\_first}, {business} has your request. We will send a quote shortly. Questions? Reply here. | We received your request — {business} |
| 3 | Need more details | Staff taps "ask customer" on a lead | Customer | Hi {customer\_first}, to prepare your quote {business} needs a little more detail: {question}. Reply here when convenient. | A quick question about your request |
| 4 | Reply (proforma) shared | Reply shared | Customer | Hi {customer\_first}, here is our price {doc\_no} for your request: {link}. It is valid until {valid\_until}; paying on the page confirms it. — {sender} | Your price {doc\_no} from {business} |
| 5 | Reply revised | New version shared | Customer | Hi {customer\_first}, {business} has updated {doc\_no}. The same link shows the new version: {link} | Updated price {doc\_no} |
| 6 | Reply follow-up, also when a reply expires (D75) | Staff taps follow-up (+3 days default) | Customer | Hi {customer\_first}, just checking whether {doc\_no} works for you. Happy to adjust anything: {link} — {sender}, {business} | Following up on {doc\_no} |
| 7 | Reply expiring | 2 days before valid\_until | Customer | Hi {customer\_first}, {doc\_no} from {business} is valid until {valid\_until}. Pay on the page to keep this price: {link} | {doc\_no} is valid until {valid\_until} |
| 10 | Booking confirmed | Booking confirmed | Customer | Hi {customer\_first}, you are booked with {business} on {date} at {time} for {service} with {staff}. Details: {link} | Booking confirmed — {date} {time} |
| 11 | Booking reminder | 24 h before | Customer | Reminder from {business}: {service} tomorrow, {date} at {time}. Reply if you need to reschedule. | Reminder: tomorrow at {time} |
| 12 | Invoice & payment request | Invoice shared | Customer | Hi {customer\_first}, invoice {invoice\_no} from {business} for {amount} is ready: {link}. Pay by UPI to {upi\_id} or scan the QR on the page. Due {due\_date}. | Invoice {invoice\_no} — {amount} due {due\_date} |
| 13 | Payment reminder +3 | Up to 6 days overdue (D64); never for an unpaid reply (D75) | Customer | Hi {customer\_first}, a gentle reminder that invoice {invoice\_no} ({amount}) from {business} is due. Pay here: {link} | Reminder: invoice {invoice\_no} |
| 14 | Payment reminder +7 / +14 | From day 7 overdue (D64); never for an unpaid reply (D75) | Customer | Hi {customer\_first}, invoice {invoice\_no} for {amount} is now {days} days overdue. Please pay at {link} or reply if there is an issue. — {business} | Overdue: invoice {invoice\_no} |
| 15 | Payment received | Payment approved | Customer | Thank you {customer\_first}! {business} has received {amount} for invoice {invoice\_no}. Receipt: {link} | Receipt for {invoice\_no} |
| 16 | Proof rejected (internal) | Approver rejects | Uploader | Proof for {invoice\_no} was not approved: {reject\_note}. Please re-upload. | — |
| 17 | Job completed | Staff marks done | Customer | Hi {customer\_first}, {service} is complete. Thank you for choosing {business}. Your invoice follows shortly. | Work completed — {business} |
| 18 | Request declined (D61) | Business rejects a quoted lead | Customer | Hi {customer\_first}, thank you for asking {business}. We can't take on this request right now. — {sender} | About your request to {business} |

Numbers 8 and 9 are retired, not reused (D93). The "Proof waiting" email to approvers (approve-from-email link, D87) is a system email, not a ready message; its wording is a draft for the owner to approve.

# Competitor teardown

Nobody in the Indian SMB market combines a public catalog, doc-style replies, invoicing, bookings and white-label branding; each competitor owns one or two of these. Product facts below are from general knowledge, not a fresh check: verify pricing and features on each site before quoting them.

## Comparison (approximate, verify before quoting)

| Product | Built for | What they do well (copy this) | What they don't do (our room) |
| --- | --- | --- | --- |
| Vyapar | Indian kirana / trader accounting on Android | Offline-first mobile app; GST invoicing and e-way bills; very fast item entry; cheap annual plans; huge SMB trust | No public catalog or customer portal; invoices look like accounting output; no doc-style replies, no bookings; branding limited to a logo on the invoice |
| Zoho Invoice / Zoho Books | SMB invoicing, free tier, deep accounting | Clean invoice templates; recurring billing; customer portal with online payment; multi-gateway; strong reports | Generic, not white-label (Zoho branding, zoho.in domains); setup heavy; no catalog page, leads or bookings; estimates are forms, not documents |
| Refrens | Indian freelancers and agencies | Beautiful quote and invoice design; proposal flow; client portal; GST; freelancer network | Still a form-based editor; no bookings or job tracking; no team board; limited white-label |
| Square (Invoices + Appointments) | US/UK service businesses | Bookings + invoices + payments in one brand; polished customer-facing pages; staff calendars | Not available / not relevant in India (no UPI, no GST); not white-label |
| Bookipi / Invoice Simple | Solo tradespeople worldwide | Fastest possible first invoice; mobile-only simplicity | No team, no catalog, no board; weak India localisation |
| Dukaan / Bikayi (catalog-commerce apps) | Indian micro-sellers | WhatsApp-native storefront; QR catalog; UPI payments; extremely simple onboarding | Built for selling fixed-price goods, not pricing services; no invoices-as-docs, no bookings or job tracking |

## Takeaways for design

1. **Copy Vyapar's speed, not its look.** Item entry and invoice creation must be as fast on Android; the output must look like Refrens, not an accounting ledger.
2. **Copy Dukaan's onboarding.** Phone, name, logo, share a link in under five minutes; that is the bar for Flow 1.
3. **Own the gap nobody fills**: public catalog → reply as an editable proforma (D60) → booking / job → invoice → UPI payment, all under the business's brand. No competitor connects these five.
4. **White-label is the moat for agencies and IT services**; Zoho and Refrens leak their brand on every customer touchpoint.
5. **The reply as a document** (proforma invoice with scope text, optional lines and versions; paying is the acceptance, D60, D102) is the single most differentiating screen; invest the design time there.
6. **Match Vyapar on offline tolerance** at least for reading today's bookings and jobs, and for drafting a reply (see NFRs).
7. **Do not compete on accounting depth**; export to Tally / Zoho Books in Phase 3 instead.

# Non-functional requirements

The product must feel instant on a ₹10,000 Android phone over a patchy 4G connection, because that is where staff and customers use it. Every target below is testable and belongs in the Phase 1 quality gate (WBS 4.1).

## Requirements

| Category | Requirement | Target | How verified |
| --- | --- | --- | --- |
| Performance | Public catalog and pay pages load fast on a mid-range Android over 4G | LCP ≤ 2.5 s on a Moto G-class device, Slow 4G throttle; page weight ≤ 300 KB before images | Lighthouse in CI on every PR |
| Performance | Workspace actions feel instant | Interaction to next paint ≤ 200 ms; optimistic updates for status changes | Web vitals telemetry |
| Performance | PDF generation | ≤ 3 s for a 2-page invoice; queued, never blocks the UI | Job metrics |
| Offline | Staff can read today's bookings and jobs and draft a reply without network | Cached last 7 days; drafts saved locally and synced; clear "offline" banner, no silent loss | Manual test with airplane mode |
| Mobile | Every workspace screen usable one-handed | Primary action within thumb reach; touch targets ≥ 44 px; no horizontal scroll | Design review checklist |
| Accessibility | WCAG 2.1 AA on all customer-facing pages and PDFs | Contrast ≥ 4.5:1 (enforced by theme generator); keyboard navigation; labels on every input; PDFs tagged | axe in CI + manual screen-reader pass |
| Reliability | Uptime and recovery | 99.5% monthly; RPO 1 h, RTO 4 h; Neon point-in-time restore (D4) with a restore drill | Status page, drill log |
| Security | Tenant isolation and auth | RLS on every table; sessions revocable; re-auth for billing and deletion; rate limits on portal forms and token lookups; OWASP top-10 review before pilot | Pen-test checklist in WBS 4.1 |
| Privacy (DPDP) | Customer data handled lawfully | Consent line on the request form; privacy notice per workspace; customer phone masked on public pages; export and erasure within 30 days; data stored in India (Mumbai region) | Legal review; erasure job tested |
| Tax | GST correctness | CGST / SGST / IGST split by state; HSN / SAC on each line; invoice fields per GST invoice rules; numbering gap-free | Accountant review on sample invoices |
| Scale | Phase 1 capacity | 2,000 workspaces, 50 k invoices / month, 1 M portal views / month without architectural change | Load test before pilot |
| Observability | Know when a business is stuck | Error tracking, per-workspace audit log, funnel events (lead → reply → paid) | Dashboards before pilot |
| Localisation | English only in Phase 1, but ready for more | All strings in resource files; dates, currency and numbering formatted for en-IN; no concatenated sentences | Lint rule |
| Browser support | Where customers and staff actually are | Chrome Android last 3 versions, Safari iOS last 2, Chrome / Edge desktop last 2; WhatsApp and Instagram in-app browsers | BrowserStack smoke suite |

The pilot go / no-go passes without CA and lawyer sign-off; their placeholders stay visibly marked and their sign-off is required before paid plans (D92).

# Glossary

One word per concept, used identically in UI copy, messages, PDFs and code. Where several words are common, the table names the one we use and the ones we avoid.

## Terms

| Term (use this) | Meaning | Not this |
| --- | --- | --- |
| Accept | The business accepts a quoted lead: prices it and shares the proforma (D61). The customer accepts by paying (D60) | Approve, sign, confirm |
| Advance | An invoice for part of the price, asked up front; the balance follows as a separate invoice (D70) | Deposit (allowed for restaurants), retainer |
| Approve | An approver confirms a payment proof; the only path to Paid in Phase 1 | Verify, accept (for payments) |
| Booking | A reserved time with a staff member, from a booked lead or one the team creates (D59) | Appointment (allowed as a vertical label for salons), slot, reservation |
| Business | The company using Biz4Kit (the tenant) | Merchant, vendor, client, account |
| Catalog | The business's list of items and packages, public at its link | Menu (vertical label for restaurants), price list (the exported list only), store |
| Connector | A third-party integration behind an adapter: Razorpay, Stripe, Polar, Resend, WhatsApp | Integration, plugin, app |
| Customer | The person or company the business sells to; never has an account | Client (vertical label for agencies, IT), buyer, user |
| Item | One sellable thing in the catalog | Product, service, SKU (verticals may relabel in UI, the entity stays Item) |
| Invoice | A numbered request for payment; a proforma `PI-` until its payment is approved, then a tax invoice `INV-` (D60, D71) | Bill, receipt (receipt is what follows payment) |
| Job | The work done for a paid reply or a booking, with checklist, photos and materials | Service, task, order |
| Lead | Anything a customer requested; two types, quoted and booked (D59) | Enquiry (allowed in customer-facing copy), prospect, opportunity |
| Member | A person with a login in a workspace, with a role | User, employee, staff (role name only) |
| MOQ | Minimum order quantity for an item, shown as "Min. order" (D87) | Minimum, min qty |
| Notification | An item in a member's inbox: something to act on (D87) | Alert, activity |
| Owner | The role with full control, including approvals, cancelling issued invoices and billing | Admin |
| Package | A fixed-price bundle of items, optionally tiered and bookable | Plan (reserved for Biz4Kit's own subscription), bundle, combo |
| Part paid | A bill with some payments approved and some still due (D55) | Partially paid, partial |
| Payment request | The UPI link, QR and bank details a customer uses to pay an invoice | Payment link (reserved for gateway links in Phase 2) |
| Plan | A Biz4Kit subscription tier: Free, Starter, Team, Agency | Package |
| Proof | A PDF or image showing a payment was made, uploaded for approval | Screenshot, receipt |
| Quote | Customer-facing word only: customers **request a quote** (D101). There is no Quote record; the business answers with a reply (D60) | Estimate, quotation (never); proposal (vertical label for IT and agencies) |
| Ready message | Pre-written text for an event that staff send or copy | Template (settings only), notification |
| Receipt | Confirmation sent after a payment is approved | Invoice, bill |
| Reply | The business's answer to a quoted lead: a proforma invoice `PI-` linked to the lead, or a rejection (D60, D61) | Quote, estimate |
| Serial number | The number of one unit sold, on its own invoice row (D85) | IMEI (not tracked), SKU |
| Share | Hand a link, PDF or ready message to a customer by any channel | Send (reserved for automatic sending: email in Phase 1, D67), export |
| Version | A revision of a proforma invoice under the same `PI-` number (D60) | Revision, draft, copy |
| Warranty card | The customer's private page for one serial-numbered item: model, serial, cover and end date (D86) | Guarantee card (the card says Warranty or Guarantee per the item's cover) |
| Workspace | One business's isolated space in Biz4Kit: data, members, brand | Account, organisation, tenant (code only) |

# Competitor glossary

Owners arrive speaking Vyapar, Zoho, Refrens or Dukaan; we translate each of their words into one of ours, keep ours simpler, and show their old word once as a hint so nobody feels lost. Terms come from general knowledge of the four products; check the live apps before relying on an exact label.

## Conversion rules

1. **One word per concept**, the one in our Glossary; a competitor word never appears as a label in our UI.
2. **Plain over accounting**: we say what the owner does (reply, share, get paid), not the ledger term (receivable, payment-in, debit note).
3. **Familiar-word hint, once**: on an owner's first visit to a screen, a small line says "Vyapar calls this Party" (based on the tool they told us at onboarding); dismissed, it never returns.
4. **Import mapping**: CSV exports from these tools map column headers to our fields automatically (Party Name → Customer, Item Name → Item, Rate → Price, GSTIN → GST number, HSN / SAC → HSN / SAC); AI ingest in Phase 2 handles the messy ones.
5. **If we lack their concept**, the hint says so and what to do instead ("We don't track stock; keep using your stock app, we handle replies and invoices").

## Term map

| Their word | Used by | What it means there | Our word | Why ours is simpler |
| --- | --- | --- | --- | --- |
| Party | Vyapar | Any customer or supplier | **Customer** | Owners sell to customers; we don't do purchases, so one side only |
| Contact / Customer / Client | Zoho, Refrens | The person billed | **Customer** | One word; "Client" allowed only as a vertical label for agencies and IT |
| Vendor / Supplier | Refrens, Zoho | Someone you buy from | not in Biz4Kit | We don't do purchasing; hint points to their accounting app |
| Item / Product / Service / Stock | Vyapar, Zoho | A sellable line, often with inventory | **Item** (relabelled per vertical: service, product, dish, deliverable) | No stock or godown; an item is just what you sell |
| Products / Store | Dukaan | Goods listed in an online shop | **Item / Catalog** | A catalog can hold services and price-on-request items; a store can't |
| Catalog / Online store link | Dukaan | Public page to buy from | **Catalog** | Same idea; ours leads to a quoted lead or a booking (D59), not only a cart |
| Estimate / Quotation | Vyapar, Zoho, Refrens | A priced offer before an invoice | **Reply** (proforma invoice `PI-`, D60); customers still "request a quote" (D101) | The customer accepts by paying |
| Proforma invoice | Vyapar, Refrens | A priced offer shaped like an invoice, often for advance | **Proforma invoice** (`PI-`), becomes `INV-` on approval (D60, D71) | One invoice, two number series |
| Sale order / Order | Vyapar, Zoho, Dukaan | A confirmed purchase before delivery or billing | **Paid reply** (and **Booking** or **Job** for services) | Paying is the order; no separate screen to maintain |
| Delivery challan | Vyapar | Goods-movement note without tax | out of scope (Phase 1) | Manufacturers may need it; decide with e-way bills in WBS 6.4 |
| Sale invoice / Tax invoice | Vyapar, Zoho, Refrens | The bill | **Invoice** | One word |
| Retainer invoice / Advance | Zoho, Refrens | Bill for money up front | **Advance** (from a reply or package with an advance %, D66) | Its own `PI-` → `INV-`; the balance is a separate invoice (D70) |
| Recurring invoice / Subscription | Zoho | Bill that repeats | **Recurring invoice** (Phase 2) | Same word, fewer settings |
| Payment-in / Payment received / Receipt voucher | Vyapar, Zoho | Record that money came | **Payment** (recorded with **Proof**, then **Approved**) | Says what happened; approval is explicit |
| Receivable / Udhaar / Outstanding | Vyapar, Refrens | Money owed to you | **Overdue** page and **Due** (bills only, D75) | A list to act on, not a ledger balance |
| Payment link | Refrens, Zoho, Dukaan | Gateway URL to pay | **Payment request** (Phase 1: UPI QR + bank); **Payment link** reserved for Phase 2 gateways | Keeps the manual and gateway paths distinct |
| Payment reminder | Vyapar, Zoho | Automated nudge for dues | **Reminder** (ready message; email sent in Phase 1, D67) | Same word |
| Credit note / Debit note | Vyapar, Zoho, Refrens | Corrections to an issued invoice | **Credit note** (Phase 2); no debit notes | One correction type is enough for service businesses |
| Expense | Vyapar, Zoho, Refrens | Money you spent | not in Biz4Kit (Cashflow is money in only, D77) | Not our job; CA export covers it |
| Ledger / Statement | Refrens, Vyapar | Running account per party | **Customer timeline** | Shows leads, bookings, invoices and payments as events, not debits and credits |
| Lead management / CRM | Refrens | Pipeline of prospects | **Leads** | One inbox and a board; no CRM vocabulary (D63) |
| Projects / Timesheets / Time tracking | Zoho | Work logged for billing | **Job** (time logged is Phase 2, D87) | A job is what staff understand |
| Serial no. / IMEI / Warranty register | Vyapar, Zoho | Unit tracking for goods with warranty | **Serial number** and **Warranty card** (D85, D86) | One row per unit on the invoice, a card the customer keeps |
| Customer portal | Zoho, Refrens | Login area for customers | **My orders** (private link) | No login |
| Templates (invoice themes) | Zoho, Refrens | Choose an invoice look | **Brand** (set once) | One branded look everywhere instead of picking a theme per document |
| Organization / Company / Business profile | Zoho, Refrens | The tenant | **Workspace** (code) / **Business** (UI) | Owners say business |
| Godown / Warehouse | Vyapar | Stock location | not in Biz4Kit | No inventory |
| e-Way bill | Vyapar | Transport document for goods | decision pending (WBS 6.4) | Hint explains the current answer |
| Online store / Dukaan link | Dukaan | Shop URL to share | **Catalog link** | Same action, works for services |
| Orders | Dukaan | Purchases placed in the store | **Leads**, quoted and booked (D59) | Our customers ask or book; they don't check out |
| Coupons / Discounts | Dukaan | Price cuts at checkout | **Discount** on an invoice | One place, set by the owner, no codes to manage |
| Themes / Plugins | Dukaan | Store appearance and add-ons | **Brand**, **Connectors** | Two words for two things |
| Dukaan Delivery | Dukaan | Shipping integration | not in Biz4Kit | Services and replies don't ship |
| Abandoned cart | Dukaan | Buyer left without paying | **Reply not paid** / **Follow up** (message 6) | We follow up a person, not a cart |

## What this means for design

- The onboarding step "Which app do you use today?" (Vyapar, Zoho, Refrens, Dukaan, Excel, none) drives the familiar-word hints and the import mapping.
- Hints are a single line under the screen title, grey, dismissible, never a tour.
- Import screens show the mapping before saving so the owner can correct it; unmapped columns are listed, not silently dropped.
- Our Glossary wins every naming argument; this section only explains how to get there from a competitor's words.
