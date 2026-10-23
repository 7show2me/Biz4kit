# Biz4Kit functional prototype (design/app)

A working copy of the Phase 1 screens in `design/screens-v2.html`, backed by real data and business rules. Local only (D19). `design/screens-v2.html` stays the frozen design reference; this app must look the same.

## Run

```
python design/app/serve.py        # from the repo root; serves 127.0.0.1:8765 with caching off
open http://127.0.0.1:8765/design/app/
```

`#check` at the end of the URL runs every check (or press **Check** in the top bar).

## Layout

```
design/app/
  index.html            shell: fonts, Tailwind browser build, theme tokens (copied from brand/ via design/sync_tokens.py), viewer bar
  data/default.json     the default data set (one sample workspace, Glow Studio). Never written by code.
  js/main.js            boots: loads the store, registers screens, starts the viewer
  js/core/              util.js (money, dates, ids, esc), store.js (state, sessionStorage, log, export / import)
  js/biz/               the business layer: pure functions over the state, no DOM
  js/ui/                kit.js (UI helpers), shell.js (workspace + customer chrome), viewer.js (router, events, tools)
  js/screens/           one file per area; each exports an array of screen definitions
  js/check.js           the in-browser checker (collects `checks` from every screen file)
```

## Data

- `data/default.json` is loaded on first visit to a tab; after that the live data is in **sessionStorage** key `b4k-app`. Reload keeps it; closing the tab drops it. **Reset** in the tools menu reloads the default.
- **Export** downloads the live data as JSON; **Import** replaces it with a file in the same shape.
- The clock is `state.meta.today` (ISO date). All "days overdue", "expires", "today" use `util.today(state)`, never `new Date()`, so the sample stays stable.
- Money is whole rupees (integers). Display with `inr()` / `M()`.
- Every record has a string `id` (prefix + number, e.g. `L7`, `I12`). New ids come from `util.nextId(state, prefix)`.

Shape (see `default.json` for the full set):

| Key | Record |
| --- | --- |
| `meta` | `{ version, today, people: { owner, manager, staff, accountant, superadmin } }` (member id signed in per role) |
| `workspace` | business details, `brand`, `numbering { PI: {prefix, next}, INV: {prefix, next} }`, `replyValidDays`, `billDueDays`, `approvals { managerEnabled, managerLimit }`, `modules { board, customers, jobs, serials }` (Lite mode extras, D63; `serials` = serial numbers and warranty, D85) |
| `members` | `{ id, name, email, phone, role, status: invited / active, initials, seenAt, mute }` (inbox read and mute, D87) |
| `items`, `categories`, `packages` | catalog (D77 Quick Catalog). An item may add `photos[], moq` (D87) and `serials, model, modelNo, cover: warranty / guarantee, coverMonths, trackBatch` (D85) |
| `customers` | `{ id, name, phone, email, company, gstin, address, tags, token, notes, createdAt }` |
| `leads` | `{ id, customerId, type: quoted / booked, source, brief, lines[], preferredDate, packageId, assigneeId, status, snoozedUntil, rejectReason, priority: normal / high (D87), createdAt }` |
| `invoices` | `{ id, kind: reply / advance / balance / bill, number, piNumber, invNumber, leadId, customerId, bookingId, jobId, version, history[], lines[], discount, payBy, dueDate, sharedAt, cancelled, token, reminders[], createdAt }` |
| `payments` | `{ id, invoiceId, amount, method, reference, proof, uploadedBy, uploadedAt, status: pending / approved / rejected, decidedBy, decidedAt, note, selfApproved, version }` |
| `bookings` | `{ id, customerId, leadId, packageId, memberId, start, end, status: tentative / confirmed / in_progress / completed / cancelled / no_show, notes }` |
| `jobs` | `{ id, bookingId, leadId, customerId, assigneeId, title, checklist[], status: open / in_progress / done / invoiced, start, completedAt, invoiceId, photos[], materials[] }` (D87; done makes the draft invoice, D88) |
| `templates` | the 16 ready messages (8 and 9 retired, D93) `{ id, event, name, subject, body }` |
| `outbox` | simulated sends `{ id, at, channel, to, subject, body, recordId, templateId, by }` (D67: email is "sent", SMS / WhatsApp are copy) |
| `devices` | signed-in devices per member |
| `activity` | `{ at, by, action, recordId, text }` newest first; written by `store.commit` |

## Business layer rules (js/biz)

Each module exports functions `(state, args, ctx)` that **mutate `state`** and return a result, or throw `BizError(message)` with a sentence the UI shows as is. `ctx = { role, memberId, today }`. Never touch the DOM. Selectors (`statusOf`, lists, KPIs) are pure reads.

Decisions they implement (docs/decisions.md): no Quote record, the reply is a proforma `PI-` invoice (D60); `INV-` assigned when payments approved cover the total, separate gap-free series (D71); advance and balance are two invoices (D70); lead types and statuses (D59, D66), Paid when every invoice on the lead is paid (D72); booking To confirm / Agreed (D68, D69); unpaid reply is not owed and expires (D75); serial numbers and warranty in `serials.js`: a line splits into one row per unit when serials are entered, serial unique per workspace, proforma shows model and cover but not serial, cover runs from the invoice date, a card per row with a serial (D85, D86); approval: Owner, or Manager strictly below the limit when turned on, approver is not the uploader unless the Owner is the only approver (logged as self-approved), never above the open balance, older version applies to the latest (D57, D73, D74, D76); rejected lead or expired reply cannot be paid, snoozed warns (D73); Phase 1 sends email only, SMS / WhatsApp are copy (D67); board columns (D65).

## Screens (js/screens/*.js)

```js
export default [{
  id, area, name, route, action, who, notes,   // as in screens-v2 add({...})
  states: [["Default", ctx => html], ...],      // optional, like v2
  render: ctx => html,                          // when no states
  actions: { "lead.accept": (ctx, el, form) => ... },  // screen-local handlers (optional)
  checks: [ (t, h) => ... ],                    // see js/check.js
}];
```

- `ctx = { s: state, role, me, today, params, ui }`. `params` comes from the hash (`#screen=lead&id=L3`).
- Clicks: `data-go="screen"` (+ `data-id`) navigates; `data-open="dialog"` opens a dialog; `data-do="action.name"` runs an action with `el.dataset` and, inside a `<form data-do>`, the form values. Global actions live in `js/ui/actions.js`; a screen may add its own.
- Every input is real: `field()`, `select()`, `radio()`, `toggle()`, `seg()` in `js/ui/kit.js`. Tabs and filters change what is shown (`ui` state, kept per screen in memory).
- After an action the viewer re-renders the current screen. Errors show as a toast with the BizError text.
