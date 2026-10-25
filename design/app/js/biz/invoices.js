/* Invoices. There is no Quote record: the priced reply to a quoted lead is an invoice (D60).
   kind: reply (answers a quoted lead), advance (deposit asked up front), balance (rest after the advance),
   bill (owed after the service). Every invoice is a proforma PI- until approved payments cover its total,
   then it takes the next INV- number; PI- and INV- are separate gap-free series (D60, D71).
   Status is derived, never stored:
   - reply / advance (not money owed, D75): draft → awaiting → pending → paid, or expired past payBy
   - bill / balance (owed after the service): draft → due → overdue (past dueDate) → pending → paid */
import {
  addDays,
  byId,
  daysBetween,
  fail,
  fyCode,
  nextId,
  nowStamp,
  sum,
  today,
  token,
} from "../core/util.js";
import { findOrCreateCustomer } from "./leads.js";
import { T, addressOf, send, varsFor } from "./messages.js";
import { need } from "./perms.js";
import * as SR from "./serials.js";

export const KIND = {
  reply: "Reply",
  advance: "Advance",
  balance: "Balance",
  bill: "Bill",
};
export const isReplyLike = (inv) =>
  inv.kind === "reply" || inv.kind === "advance";

/* ---------- numbers ---------- */
/* Next number of a series, e.g. PI-2627-0047. Advances the counter (gap-free). */
export function takeNumber(s, series) {
  const n = s.workspace.numbering[series];
  const no = `${n.prefix}-${fyCode(today(s))}-${String(n.next).padStart(4, "0")}`;
  n.next += 1;
  return no;
}
export const numberOf = (inv) => inv.invNumber || inv.piNumber || "Draft";
export const docKind = (inv) =>
  inv.invNumber ? "Tax invoice" : "Proforma invoice";

/* ---------- money ---------- */
const lineAmount = (l) =>
  l.optional && !l.selected ? 0 : (l.qty || 0) * (l.rate || 0);
/* GST shows only when the workspace has a GST number; CGST + SGST inside the state, IGST outside. */
export function totals(s, inv) {
  const ws = s.workspace;
  const c = byId(s.customers, inv.customerId);
  const subtotal = sum(inv.lines, lineAmount);
  const discount = Math.min(inv.discount || 0, subtotal);
  const ratio = subtotal ? (subtotal - discount) / subtotal : 0;
  const gstOn = Boolean(ws.gstin);
  const tax = gstOn
    ? Math.round(
        sum(inv.lines, (l) => lineAmount(l) * ratio * ((l.gst ?? 0) / 100))
      )
    : 0;
  const cState = customerState(c);
  const inter = gstOn && cState && ws.stateCode && cState !== ws.stateCode;
  const total = subtotal - discount + tax;
  return {
    subtotal,
    discount,
    tax,
    gstOn,
    cgst: gstOn && !inter ? Math.floor(tax / 2) : 0,
    sgst: gstOn && !inter ? tax - Math.floor(tax / 2) : 0,
    igst: inter ? tax : 0,
    total,
  };
}
export const total = (s, inv) => totals(s, inv).total;
/* A customer's GST state code: stored, else the first two digits of their GSTIN. Unknown (no GSTIN) = the
   business's own state, so CGST + SGST. B2C place-of-supply rules beyond that: CA to confirm. */
export const customerState = (c) =>
  c?.stateCode || (c?.gstin ? String(c.gstin).slice(0, 2) : null);
export const paymentsOf = (s, inv) =>
  s.payments.filter((p) => p.invoiceId === inv.id);
export const paid = (s, inv) =>
  sum(
    paymentsOf(s, inv).filter((p) => p.status === "approved"),
    (p) => p.amount
  );
export const pendingOf = (s, inv) =>
  paymentsOf(s, inv).filter((p) => p.status === "pending");
export const open = (s, inv) => Math.max(0, total(s, inv) - paid(s, inv));

/* ---------- status ---------- */
export function statusOf(s, inv) {
  if (!inv.sharedAt) return "draft";
  if (paid(s, inv) >= total(s, inv) && total(s, inv) > 0) return "paid";
  if (pendingOf(s, inv).length) return "pending";
  if (isReplyLike(inv))
    return inv.payBy && today(s) > inv.payBy ? "expired" : "awaiting";
  if (inv.dueDate && today(s) > inv.dueDate) return "overdue";
  /* Part paid (teal, D55): some approved, some still due; overdue wins once the due date has passed. */
  return paid(s, inv) > 0 ? "part_paid" : "due";
}
export const daysOverdue = (s, inv) =>
  inv.dueDate ? Math.max(0, daysBetween(inv.dueDate, today(s))) : 0;
/* Bills only count as money owed (D75). */
export const isOwed = (s, inv) =>
  !isReplyLike(inv) && ["due", "part_paid", "overdue", "pending"].includes(statusOf(s, inv));

/* GST % for a line: the catalog item's rate (matched by id or name), else the rate most items in the catalog
   use. Never a made-up rate: with no catalog rate at all it is 0 and the screen shows no GST. */
export function gstFor(s, { itemId, name } = {}) {
  const it =
    (itemId && byId(s.items, itemId)) || s.items.find((x) => x.name === name);
  if (it) return it.gst ?? 0;
  const counts = {};
  for (const x of s.items) counts[x.gst ?? 0] = (counts[x.gst ?? 0] || 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? +top[0] : 0;
}

/* GST % of a package: its first catalog item's rate, else the catalog's most used rate (never invented). */
export const pkgGst = (s, pkg) =>
  gstFor(s, { itemId: pkg?.items?.find((x) => x.itemId)?.itemId });

/* ---------- actions ---------- */
/* Copy lines; form values arrive as strings, so numbers and flags are normalised and removed lines dropped. */
const flag = (v, d) =>
  v === undefined || v === "" ? d : v === true || v === "true" || v === "on";
const snapshot = (lines) =>
  lines
    .filter((l) => l && !flag(l.remove, false))
    .map(({ remove, ...l }) =>
      SR.normLine({
        ...l,
        qty: +l.qty || 0,
        rate: +l.rate || 0,
        gst: l.gst === undefined || l.gst === "" ? 0 : +l.gst || 0,
        optional: flag(l.optional, false),
        selected: flag(l.selected, true),
      })
    );
export const lineFromItem = (it, qty = 1) => ({
  itemId: it.id,
  name: it.name,
  desc: it.desc || "",
  qty,
  unit: it.unit,
  rate: it.price,
  gst: it.gst ?? 0,
  hsn: it.hsn || "",
  optional: false,
  selected: true,
  ...SR.fromItem(it),
});

/* Create a draft. args: { kind, leadId, customerId, bookingId, jobId, lines, discount } */
export function create(s, args, ctx) {
  need(ctx, "write");
  const lead = args.leadId ? byId(s.leads, args.leadId) : null;
  const customerId = args.customerId || lead?.customerId;
  if (!customerId || !byId(s.customers, customerId))
    fail("Pick a customer first.");
  const lines = snapshot(SR.enrich(s, args.lines || [])).filter(
    (l) => l.name && (l.qty || 0) > 0
  );
  if (!lines.length) fail("Add at least one line with a quantity.");
  SR.checkLines(s, { id: null }, lines);
  const inv = {
    id: nextId(s, "I"),
    kind: args.kind || (lead ? "reply" : "bill"),
    piNumber: null,
    invNumber: null,
    leadId: lead?.id || null,
    customerId,
    bookingId: args.bookingId || null,
    jobId: args.jobId || null,
    version: 1,
    history: [],
    lines,
    discount: +args.discount || 0,
    payBy: null,
    dueDate: null,
    sharedAt: null,
    cancelled: false,
    token: token("i"),
    reminders: [],
    createdAt: nowStamp(s),
  };
  s.invoices.unshift(inv);
  return inv;
}

/* Share: gives the PI- number, sets the pay-by or due date, sends the ready message (email is "sent",
   SMS / WhatsApp are copied, D67). A shared reply moves its lead to Replied (D66). */
export function share(s, { id, channel = "email" }, ctx) {
  need(ctx, "write");
  const inv = byId(s.invoices, id) || fail("Invoice not found.");
  if (inv.cancelled) fail("This invoice is cancelled.");
  const first = !inv.sharedAt;
  if (!inv.piNumber) inv.piNumber = takeNumber(s, "PI");
  if (first) inv.sharedAt = nowStamp(s);
  if (isReplyLike(inv) && !inv.payBy)
    inv.payBy = addDays(today(s), s.workspace.replyValidDays || 15);
  if (!isReplyLike(inv) && !inv.dueDate)
    inv.dueDate = addDays(today(s), s.workspace.billDueDays || 7);
  const lead = inv.leadId ? byId(s.leads, inv.leadId) : null;
  if (
    lead &&
    ["new", "contacted", "snoozed"].includes(lead.status) &&
    isReplyLike(inv)
  )
    lead.status = "replied";
  const c = byId(s.customers, inv.customerId);
  inv._total = total(s, inv);
  const templateId = isReplyLike(inv)
    ? first
      ? T.replyShared
      : T.replyRevised
    : T.invoiceShared;
  const msg = send(
    s,
    {
      channel,
      templateId,
      vars: varsFor(s, { invoice: inv }),
      to: addressOf(c, channel),
      recordId: inv.id,
    },
    ctx
  );
  delete inv._total;
  return {
    recordId: inv.id,
    text: `${inv.piNumber} shared with ${c?.name} by ${channel}`,
    invoice: inv,
    message: msg,
  };
}

/* Edit before payment = a new version under the same PI- number (D60). An expired reply is revived the same
   way with a new pay-by date (D75). */
export function revise(s, { id, lines, discount }, ctx) {
  need(ctx, "write");
  const inv = byId(s.invoices, id) || fail("Invoice not found.");
  const st = statusOf(s, inv);
  if (st === "paid" || inv.invNumber)
    fail("A paid invoice cannot change. Raise a new one.");
  if (pendingOf(s, inv).length)
    fail("A payment is waiting for approval. Approve or reject it first.");
  const next = snapshot(SR.enrich(s, lines || inv.lines));
  SR.checkLines(s, inv, next);
  if (!inv.sharedAt) {
    inv.lines = next;
    if (discount !== undefined) inv.discount = +discount || 0;
    return { recordId: inv.id, text: `Draft updated`, invoice: inv };
  }
  inv.history.push({
    version: inv.version,
    lines: snapshot(inv.lines),
    discount: inv.discount,
    total: total(s, inv),
    at: nowStamp(s),
  });
  inv.version += 1;
  inv.lines = next;
  if (discount !== undefined) inv.discount = +discount || 0;
  if (isReplyLike(inv))
    inv.payBy = addDays(today(s), s.workspace.replyValidDays || 15);
  return {
    recordId: inv.id,
    text: `${inv.piNumber} version ${inv.version}`,
    invoice: inv,
  };
}

/* Overdue reminders: message 13 up to 6 days overdue, 14 from day 7 (D64). Never for an unpaid reply; an
   expired reply gets the follow-up (message 6) instead (D75). */
export function remind(s, { id, channel = "email" }, ctx) {
  need(ctx, "write");
  const inv = byId(s.invoices, id) || fail("Invoice not found.");
  const st = statusOf(s, inv);
  let templateId;
  if (isReplyLike(inv)) {
    if (!["awaiting", "expired"].includes(st))
      fail("Only an unpaid reply gets a follow-up.");
    templateId = T.replyFollowUp;
  } else {
    if (st !== "overdue") fail("Reminders are for overdue bills only.");
    templateId = daysOverdue(s, inv) <= 6 ? T.reminderEarly : T.reminderLate;
  }
  const c = byId(s.customers, inv.customerId);
  inv._total = open(s, inv);
  const msg = send(
    s,
    {
      channel,
      templateId,
      vars: varsFor(s, { invoice: inv }),
      to: addressOf(c, channel),
      recordId: inv.id,
    },
    ctx
  );
  delete inv._total;
  inv.reminders.push({ at: msg.at, templateId, channel });
  return {
    recordId: inv.id,
    text: `Reminder ${templateId} for ${numberOf(inv)} to ${c?.name}`,
    message: msg,
  };
}

/* The customer ticks an optional line on the pay page (D102). Only while nothing is paid or waiting: the
   amount changes, so not after a payment. Not a new version: the business priced both choices. */
export function chooseOptional(s, { id, index, on }, ctx) {
  if (!ctx.customer) need(ctx, "write");
  const inv = byId(s.invoices, id) || fail("Invoice not found.");
  const l = inv.lines[+index];
  if (!l?.optional) fail("That line is not optional.");
  if (inv.cancelled || !inv.sharedAt) fail("This invoice cannot be changed.");
  if (paid(s, inv) > 0 || pendingOf(s, inv).length)
    fail("A payment is already made on this invoice, so the choice is fixed.");
  if (isReplyLike(inv) && inv.payBy && today(s) > inv.payBy)
    fail("This price has expired.");
  l.selected = on === true || on === "true" || on === "on";
  return {
    recordId: inv.id,
    text: `${l.name}: ${l.selected ? "added" : "left out"} by ${ctx.customer ? "the customer" : "the business"}`,
    invoice: inv,
  };
}

export function cancel(s, { id }, ctx) {
  need(ctx, "write");
  const inv = byId(s.invoices, id) || fail("Invoice not found.");
  if (inv.sharedAt) need(ctx, "void");
  if (paid(s, inv) > 0)
    fail("This invoice has an approved payment and cannot be cancelled.");
  if (!inv.sharedAt) {
    s.invoices = s.invoices.filter((x) => x.id !== id);
    return { recordId: id, text: "Draft deleted" };
  }
  inv.cancelled = true;
  return { recordId: id, text: `${numberOf(inv)} cancelled (number kept)` };
}

/* Quick Invoice (D77): a bill for a known customer or a new phone number. mode: draft (save), request
   (draft, then the share sheet shares it), paid (issued with its PI- number at the counter, no message,
   then the payment is recorded). dueDays sets the due date from today. */
export function quick(s, a, ctx) {
  need(ctx, "write");
  const customerId =
    a.customerId ||
    (a.phone
      ? findOrCreateCustomer(s, { name: a.name, phone: a.phone }).id
      : fail("Pick a customer or type a new phone number."));
  const inv = create(s, { kind: "bill", customerId, lines: a.lines }, ctx);
  if (a.dueDays !== undefined && a.dueDays !== "")
    inv.dueDate = addDays(today(s), +a.dueDays || 0);
  if (a.mode === "paid") {
    inv.piNumber = takeNumber(s, "PI");
    inv.sharedAt = nowStamp(s);
  }
  const c = byId(s.customers, customerId);
  return {
    recordId: inv.id,
    text:
      a.mode === "paid"
        ? `${inv.piNumber} for ${c?.name}: record the payment`
        : `Draft invoice for ${c?.name} saved`,
    invoice: inv,
  };
}

/* ---------- lists ---------- */
export const live = (s) => s.invoices.filter((i) => !i.cancelled);
export const ofLead = (s, leadId) => live(s).filter((i) => i.leadId === leadId);
export const ofCustomer = (s, customerId) =>
  live(s).filter((i) => i.customerId === customerId);
