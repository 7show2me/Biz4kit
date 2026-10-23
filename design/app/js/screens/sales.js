/* SALES: Leads inbox (11), Lead detail (12), Customer list (26), Customer timeline (27).
   Leads are anything a customer requested (D59): quoted (asked for a price) or booked (took a slot).
   Statuses New, Contacted, Replied, Snoozed, Rejected, Paid (D66). Quoted: Accept (price and share a
   proforma PI-) / Edit / Reject with message 18 (D60, D61). Booked: assign and confirm, message 10 (D62).
   Customers is an extra the Owner switches on (D63); "still due" counts bills only (D75). */
import { PRIORITY, SOURCES, isHigh } from "../biz/leads.js";
import { addressOf, fill, template, varsFor } from "../biz/messages.js";
import * as store from "../core/store.js";
import {
  addDays,
  ago,
  byId,
  daysBetween,
  fail,
  fmtDate,
  fmtTime,
  fyCode,
  nextId,
  nowStamp,
  token,
} from "../core/util.js";
import { call } from "../ui/actions.js";
import {
  I,
  C,
  M,
  ST,
  av,
  chip,
  dataTable,
  empty,
  esc,
  flabel,
  hint,
  inr,
  input,
  link,
  modal,
  page,
  pill,
  radios,
  search,
  seg,
  select,
  shareBody,
  textarea,
  toolbar,
  uiv, bookingPill
} from "../ui/kit.js";
import { app } from "../ui/shell.js";

/* The quick invoice dialogs live in payments.js (written in parallel). Loaded lazily so this file works
   before it exists and so the two files may import each other. */
let PAY = null;
const PAY_ACTIONS = {};
let mergePay = () => {};
import("./payments.js")
  .then((m) => {
    PAY = m;
    for (const sc of m.default || [])
      for (const [k, f] of Object.entries(sc.actions || {}))
        PAY_ACTIONS[k] ??= f;
    mergePay();
  })
  .catch(() => {});

/* ---------- small helpers ---------- */
const DRAFT_NOTE = `<p class="hint italic">[Draft wording, owner to approve]</p>`;
const custOf = (s, id) => byId(s.customers, id) || { name: "Unknown", id };
const first = (n = "") => String(n).split(" ")[0];
const typeChip = (t) =>
  t === "booked"
    ? chip("Booked", "calendar-check")
    : chip("Quoted", "indian-rupee");
const who = (s, id) => {
  const m = id && byId(s.members, id);
  return m
    ? `<span class="flex items-center gap-2">${av(m.initials)}${esc(first(m.name))}</span>`
    : "";
};
const isOpen = (l) => !["paid", "rejected"].includes(l.status);
/* High priority marker (WBS 3.1, D87): an icon, not a status colour (D55). */
const highFlag = (l, label = false) =>
  isHigh(l)
    ? `<span class="inline-flex items-center gap-1 font-medium" data-priority="high" title="High priority">${I("flag", "size-icon-sm")}${label ? "High priority" : '<span class="sr-only">High priority</span>'}</span>`
    : "";
const canAssign = (ctx) =>
  ctx.role === "superadmin" || ctx.biz.perms.can(ctx.role, "assign");
/* Age of a record: time today, else days. */
const age = (s, at) => {
  const n = daysBetween(at, s.meta.today);
  return n <= 0 ? fmtTime(at) || "Today" : `${n} d`;
};
const when = (x) =>
  x ? `${fmtDate(x)}${fmtTime(x) ? `, ${fmtTime(x)}` : ""}` : "";
const staffOf = (s) =>
  s.members.filter((m) => m.status === "active" && m.role !== "accountant");
const nextPI = (s) => {
  const n = s.workspace.numbering.PI;
  return `${n.prefix}-${fyCode(s.meta.today)}-${String(n.next).padStart(4, "0")}`;
};
const bookingOfLead = (s, lead) =>
  s.bookings.find(
    (b) => b.leadId === lead.id && !["cancelled", "no_show"].includes(b.status)
  );
const itemByName = (s, name) => s.items.find((i) => i.name === name);
const openArgs = (o) => `data-open-args="${esc(JSON.stringify(o))}"`;

/* Lines a quoted lead asked for, as invoice lines (rate from the request, else the catalog). */
const priceLinesOf = (ctx, lead) =>
  (lead.lines || []).map((l) => {
    const it = itemByName(ctx.s, l.name);
    return {
      itemId: it?.id || "",
      name: l.name,
      desc: l.note || "",
      qty: l.qty || 1,
      rate: l.rate ?? it?.price ?? 0,
      gst: l.gst ?? ctx.biz.invoices.gstFor(ctx.s, { name: l.name }),
      unit: l.unit || it?.unit || "visit",
    };
  });
const normLine = (l) => ({
  itemId: l.itemId || null,
  name: String(l.name || "").trim(),
  desc: l.desc || "",
  unit: l.unit || "visit",
  qty: Math.max(0, +l.qty || 0),
  rate: Math.max(0, Math.round(+l.rate || 0)),
  gst: +l.gst || 0,
  optional: false,
  selected: true,
});
/* Live lines of the price dialog: the draft (as typed) or the request, plus a line picked from the catalog. */
function draftLines(ctx, lead) {
  const d = ctx.ui[`pr:${lead.id}`];
  const lines = d?.lines
    ? d.lines.map(normLine)
    : priceLinesOf(ctx, lead).map(normLine);
  const add = d?.add && byId(ctx.s.items, d.add);
  if (add) lines.push(normLine(ctx.biz.invoices.lineFromItem(add)));
  return lines;
}

const totalsBox = (t, lines) => {
  const rates = [
    ...new Set(lines.filter((l) => l.qty > 0).map((l) => +l.gst || 0)),
  ];
  const half = rates.length === 1 ? ` ${rates[0] / 2}%` : "";
  const full = rates.length === 1 ? ` ${rates[0]}%` : "";
  const row = (k, v) =>
    `<div class="flex justify-between"><span class="text-muted-foreground">${k}</span>${M(v)}</div>`;
  return `<div class="mt-2 flex justify-end"><div class="w-full @tab:w-56 space-y-1 text-body-sm" data-totals>
    ${t.discount ? row("Discount", -t.discount) : ""}${row("Taxable", t.subtotal - t.discount)}
    ${t.gstOn ? (t.igst ? row(`IGST${full}`, t.igst) : row(`CGST${half}`, t.cgst) + row(`SGST${half}`, t.sgst)) : ""}
    <div class="flex justify-between font-semibold pt-1 border-t border-border"><span>Total</span><span class="font-mono text-money" data-total="${t.total}">${inr(t.total)}</span></div></div></div>`;
};

const catalogPicker = (ctx, label) =>
  `<label class="mt-2 inline-flex items-center gap-1 btn btn-ghost btn-sm">${I("plus", "size-icon-sm")}${select(
    "add",
    [
      ["", label],
      ...ctx.s.items
        .filter((i) => i.active !== false)
        .map((i) => [i.id, `${i.name} · ${inr(i.price)}`]),
    ],
    "",
    { cls: "h-control-sm w-auto border-0 bg-transparent", label }
  )}</label>`;

/* ---------- dialogs ---------- */
/* Price and reply (Accept on a quoted lead): editable lines, add from the catalog, live totals, pay-by,
   channel tabs. Submit shares the proforma PI- (D60, D61). */
function priceForm(ctx, lead) {
  const s = ctx.s;
  const c = custOf(s, lead.customerId);
  const lines = draftLines(ctx, lead);
  const t = ctx.biz.invoices.totals(s, {
    customerId: c.id,
    lines,
    discount: 0,
  });
  const d = ctx.ui[`pr:${lead.id}`] || {};
  const payBy = addDays(s.meta.today, s.workspace.replyValidDays || 15);
  const pi = nextPI(s);
  const vars = varsFor(s, {
    invoice: { customerId: c.id, piNumber: pi, payBy, _total: t.total },
  });
  const tpl = template(s, 4);
  const pay = d.pay || "full";
  return `<form data-do="lead.accept" data-a-id="${lead.id}" data-draft="pr:${lead.id}" data-after="lead">
    <p class="text-muted-foreground">${esc(c.name)} · ${esc(lead.brief)}</p>
    <div class="mt-3 overflow-x-auto rounded-control border border-border"><table class="w-full border-collapse"><thead class="bg-muted"><tr>${["Item", "Qty", "Rate", "Amount"].map((h, i) => `<th class="th ${i ? "text-right" : ""}">${h}</th>`).join("")}</tr></thead><tbody>${
      lines.length
        ? lines
            .map(
              (
                l,
                i
              ) => `<tr data-line><td class="td"><span class="font-medium">${esc(l.name)}</span>${l.desc ? `<span class="block text-caption text-muted-foreground">${esc(l.desc)}</span>` : ""}
          ${["itemId", "name", "desc", "unit", "gst"].map((k) => `<input type="hidden" name="lines[${i}][${k}]" value="${esc(l[k] ?? "")}" />`).join("")}</td>
          <td class="td text-right">${input(`lines[${i}][qty]`, { type: "number", value: l.qty, min: 0, cls: "inline-flex w-16 h-control-sm text-right", money: true, attrs: { "aria-label": `Quantity of ${l.name}` } })}</td>
          <td class="td text-right">${input(`lines[${i}][rate]`, { type: "number", value: l.rate, min: 0, cls: "inline-flex w-24 h-control-sm text-right", money: true, attrs: { "aria-label": `Rate of ${l.name}` } })}</td>
          <td class="td text-right">${M(l.qty * l.rate)}</td></tr>`
            )
            .join("")
        : `<tr><td class="td text-muted-foreground" colspan="4">The request has no items yet. Add a line from the catalog.</td></tr>`
    }</tbody></table></div>
    ${catalogPicker(ctx, "Add a line from the catalog")}
    <p class="hint">Set a quantity to 0 to drop a line.</p>
    ${totalsBox(t, lines)}
    <div class="mt-3 grid grid-cols-2 gap-3"><div><p class="flabel">Pay by</p><div class="field">${fmtDate(payBy)}${I("calendar", "size-icon-sm ml-auto text-muted-foreground")}</div>${hint(`${s.workspace.replyValidDays || 15} days, from Settings`)}</div>
      <div><p class="flabel">To confirm, customer pays</p>${radios(
        "pay",
        [
          ["full", "Full amount"],
          ["advance", "Advance"],
        ],
        pay,
        { label: "To confirm, customer pays" }
      )}${pay === "advance" ? `<div class="mt-2">${input("advancePct", { type: "number", min: 1, max: 99, value: d.advancePct ?? "", placeholder: "Advance %", req: true, attrs: { "aria-label": "Advance %" } })}</div>` : ""}</div></div>
    <p class="hint">Creates proforma ${C(pi)}; it becomes a tax invoice ${C("INV-")} when the payment is approved (D60). With an advance, this proforma is the advance and the balance is a separate proforma after the service (D70). The advance % is yours to set (D66).</p>
    <div class="mt-4 pt-3 border-t border-border"><p class="text-muted-foreground">Reply to ${esc(c.name)} · ${M(t.total)}</p>${shareBody(ctx, `prch:${lead.id}`, { to: addressOf(c, "email"), subject: fill(tpl.subject, vars), body: fill(tpl.body, vars), from: s.workspace.name, replyTo: s.members.find((m) => m.role === "owner")?.email })}${DRAFT_NOTE}</div>
    <div class="mt-4 flex gap-2 justify-end"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="submit" data-need="write" class="btn btn-primary" ${t.total > 0 ? "" : "disabled"}>${I("send")}Share and create ${pi}</button></div>
    <p class="hint text-right">Email is sent for you; SMS and WhatsApp copy the message (D67).</p></form>`;
}

/* Edit request: items, quantities, brief and date before pricing (D61). */
function editForm(ctx, lead) {
  const s = ctx.s;
  const c = custOf(s, lead.customerId);
  const d = ctx.ui[`ed:${lead.id}`];
  const lines = (d?.lines || lead.lines || []).map((l) => ({
    name: l.name,
    qty: l.qty ?? 1,
  }));
  const add = d?.add && byId(s.items, d.add);
  if (add) lines.push({ name: add.name, qty: 1 });
  const names = s.items.filter((i) => i.active !== false).map((i) => i.name);
  const date =
    d?.preferredDate ?? String(lead.preferredDate || "").slice(0, 10);
  return `<form data-do="lead.edit" data-a-id="${lead.id}" data-draft="ed:${lead.id}">
    <p class="text-muted-foreground">${esc(c.name)} · change the request before you price it</p>
    <div class="mt-3 space-y-2">${
      lines.length
        ? lines
            .map(
              (l, i) =>
                `<div class="flex gap-2">${select(`lines[${i}][name]`, [...new Set([l.name, ...names])], l.name, { cls: "flex-1 min-w-0", label: "Item" })}${input(`lines[${i}][qty]`, { type: "number", min: 0, value: l.qty, cls: "w-16 text-center", money: true, attrs: { "aria-label": "Quantity" } })}</div>`
            )
            .join("")
        : `<p class="text-muted-foreground">No items yet.</p>`
    }</div>
    ${catalogPicker(ctx, "Add item")}
    <p class="hint">Quantity 0 removes the item.</p>
    <div class="mt-3">${flabel("Brief", false, `ed-brief-${lead.id}`)}${textarea("brief", { id: `ed-brief-${lead.id}`, value: d?.brief ?? lead.brief })}</div>
    <div class="mt-3">${flabel("Preferred date", false, `ed-date-${lead.id}`)}${input("preferredDate", { type: "date", id: `ed-date-${lead.id}`, value: date })}</div>
    <p class="hint">The customer is not told about edits. Accept next to price it.</p>
    <div class="mt-4 flex gap-2 justify-end"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="submit" data-need="write" class="btn btn-primary">${I("check")}Save</button></div></form>`;
}

/* Reject and reply: ready message 18, Request declined (D61, wording D95). */
function rejectForm(ctx, lead) {
  const s = ctx.s;
  const c = custOf(s, lead.customerId);
  const tpl = template(s, 18);
  const vars = varsFor(s, { customerId: c.id });
  return `<form data-do="leads.reject" data-a-id="${lead.id}">
    <p class="text-muted-foreground">${esc(c.name)} · ${esc(lead.brief)}</p>
    <div class="mt-3">${flabel("Reason", false, `rj-reason-${lead.id}`)}${input("reason", { id: `rj-reason-${lead.id}`, placeholder: "For example: not available on that date" })}${hint("Kept on the lead for your team; the customer gets the message below.")}</div>
    <div class="mt-3"><p class="text-muted-foreground">Tell ${esc(c.name)}</p>${shareBody(ctx, `rjch:${lead.id}`, { to: addressOf(c, "email"), subject: fill(tpl.subject, vars), body: fill(tpl.body, vars), from: s.workspace.name })}${DRAFT_NOTE}</div>
    <div class="mt-4 flex gap-2 justify-end"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="submit" data-need="write" class="btn btn-primary text-destructive-foreground bg-destructive">${I("circle-x")}Share and mark rejected</button></div></form>`;
}

/* Confirm and reply: booked lead, ready message 10; advance invoice when the package sets one (D62). */
function confirmForm(ctx, lead) {
  const s = ctx.s;
  const c = custOf(s, lead.customerId);
  const b = bookingOfLead(s, lead);
  const pkg = byId(s.packages, lead.packageId || b?.packageId);
  if (!b || b.status !== "tentative")
    return `<p class="text-muted-foreground">${esc(c.name)} · this lead has no booking waiting to be confirmed.</p>`;
  const d = ctx.ui[`cf:${lead.id}`] || {};
  const memberId = d.memberId ?? (b.memberId || lead.assigneeId || "");
  const m = byId(s.members, memberId);
  const tpl = template(s, 10);
  const vars = varsFor(s, {
    booking: { ...b, memberId },
    extra: { service: pkg?.name || "your booking" },
  });
  return `<form data-do="leads.confirm" data-a-id="${lead.id}" data-draft="cf:${lead.id}">
    <div class="mt-1 rounded-control bg-muted p-3"><div class="flex justify-between"><span>${esc(pkg?.name || lead.brief)}${pkg?.durationMin ? ` · ${pkg.durationMin / 60} h` : ""}</span>${pkg ? M(pkg.price) : ""}</div><div class="text-caption text-muted-foreground">${when(b.start)}${m ? ` · with ${esc(first(m.name))}` : ""}</div></div>
    <div class="mt-3">${flabel("With", true, `cf-m-${lead.id}`)}${select("memberId", [["", "Pick a team member"], ...staffOf(s).map((x) => [x.id, x.name])], memberId, { id: `cf-m-${lead.id}`, req: true })}</div>
    <div class="mt-3"><p class="text-muted-foreground">Confirm to ${esc(c.name)}</p>${shareBody(ctx, `cfch:${lead.id}`, { to: addressOf(c, "email"), subject: fill(tpl.subject, vars), body: fill(tpl.body, vars), from: s.workspace.name })}</div>
    <p class="hint">${pkg?.advancePct ? `This package asks for a ${pkg.advancePct}% advance: confirming shares an advance proforma (D62).` : "No advance set for this package: the invoice is raised after the service (D62)."}</p>
    <div class="mt-4 flex gap-2 justify-end"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="submit" data-need="write" class="btn btn-primary">${I("calendar-check")}Share and confirm</button></div></form>`;
}

/* Ready messages 1–3 (Quick Reply). Email goes to the outbox as sent; SMS / WhatsApp are logged and copied (D67). */
const READY = [2, 3, 1];
function readyBlock(ctx, lead, tid) {
  const s = ctx.s;
  const c = custOf(s, lead.customerId);
  const tpl = template(s, tid);
  const body = fill(tpl.body, varsFor(s, { customerId: c.id }));
  return `<form class="rounded-control border border-border p-3" data-do="lead.message" data-a-id="${lead.id}" data-a-t="${tid}"><div class="flex items-center gap-2"><span class="count">${tid}</span><span class="font-medium">${esc(tpl.name)}</span></div>
    <div class="mt-1.5">${textarea("body", { value: body, rows: 3, attrs: { "aria-label": `${tpl.name} message` } })}</div>
    <div class="mt-2 flex flex-wrap gap-2"><button type="submit" name="channel" value="whatsapp" data-need="write" class="btn btn-primary btn-sm">${I("message-circle", "size-icon-sm")}WhatsApp</button><button type="submit" name="channel" value="sms" data-need="write" class="btn btn-outline btn-sm">${I("message-square", "size-icon-sm")}SMS</button><button type="button" class="btn btn-outline btn-sm" data-copy-text="${esc(body)}">${I("copy", "size-icon-sm")}Copy</button><button type="submit" name="channel" value="email" data-need="write" class="btn btn-ghost btn-sm" ${c.email ? "" : 'disabled title="No email on file"'}>${I("send", "size-icon-sm")}Email</button></div></form>`;
}
const readyMessages = (ctx, lead, only = null) => {
  const c = custOf(ctx.s, lead.customerId);
  return `<p class="text-muted-foreground">${esc(c.name)}${c.phone ? ` · <span class="money">${esc(c.phone)}</span>` : ""}</p>
  <div class="mt-3 space-y-3">${READY.filter((t) => !only || t === only)
    .map((t) => readyBlock(ctx, lead, t))
    .join("")}</div>
  <p class="hint">Sent and copied messages are logged on the lead. Email is sent by the app; SMS and WhatsApp are copied for you to paste (D67). Edit wording in Settings → Messages.</p>`;
};

/* Resend a shared reply: ready message 4 again. */
function resendForm(ctx, lead, inv) {
  const s = ctx.s;
  const c = custOf(s, lead.customerId);
  const total = ctx.biz.invoices.total(s, inv);
  const tpl = template(s, 4);
  const vars = varsFor(s, { invoice: { ...inv, _total: total } });
  return `<form data-do="lead.message" data-a-id="${lead.id}" data-a-t="4" data-a-invoice="${inv.id}"><p class="text-muted-foreground">${C(ctx.biz.invoices.numberOf(inv))} to ${esc(c.name)} · ${M(total)}</p>
    ${shareBody(ctx, `rsch:${inv.id}`, { to: addressOf(c, "email"), subject: fill(tpl.subject, vars), body: fill(tpl.body, vars), from: s.workspace.name })}
    <div class="mt-4 flex gap-2 justify-end"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="submit" data-need="write" class="btn btn-primary">${I("send")}Resend</button></div></form>`;
}

/* New lead by hand (a walk-in or a call): phone first, type quoted or booked (D59). Exported for other screens. */
export function newLeadDialog(ctx) {
  const s = ctx.s;
  const d = ctx.ui["new-lead"] || {};
  const type = d.type === "booked" ? "booked" : "quoted";
  const pk = s.packages.filter((p) => p.bookable && p.active !== false);
  return modal(
    "new-lead",
    "New lead",
    `<form data-do="leads.create" data-after="lead" data-draft="new-lead"><div class="space-y-3"><div class="grid grid-cols-2 gap-3"><div>${flabel("Phone", true, "nl-phone")}${input("phone", { id: "nl-phone", type: "tel", value: d.phone, placeholder: "10-digit mobile", money: true, req: true })}</div><div>${flabel("Name", true, "nl-name")}${input("name", { id: "nl-name", value: d.name, req: true })}</div></div>
      <div><p class="flabel">Customer wants</p>${radios(
        "type",
        [
          ["quoted", "A price (quoted)"],
          ["booked", "A slot (booked)"],
        ],
        type,
        { label: "Customer wants" }
      )}</div>
      ${
        type === "booked"
          ? `<div class="grid grid-cols-2 gap-3"><div>${flabel("Package", true, "nl-pkg")}${select("packageId", [["", "Pick a package"], ...pk.map((p) => [p.id, `${p.name}${p.tier ? ` · ${p.tier}` : ""} · ${inr(p.price)}`])], d.packageId || "", { id: "nl-pkg", req: true })}</div><div>${flabel("Slot", true, "nl-start")}${input("start", { id: "nl-start", type: "datetime-local", value: d.start, req: true })}</div></div>`
          : ""
      }
      <div>${flabel("Request", type === "quoted", "nl-brief")}${textarea("brief", { id: "nl-brief", value: d.brief, rows: 2, req: type === "quoted" })}</div>
      <div class="grid grid-cols-2 gap-3"><div>${flabel("Source", false, "nl-source")}${select("source", Object.entries(SOURCES), d.source || "manual", { id: "nl-source" })}</div><div>${flabel("Assign to", false, "nl-assign")}${select("assigneeId", [["", "Unassigned"], ...staffOf(s).map((m) => [m.id, m.id === ctx.memberId ? `Me (${m.name})` : m.name])], d.assigneeId ?? ctx.memberId ?? "", { id: "nl-assign" })}</div></div></div>
      <p class="hint">An existing phone number links to that customer. The lead opens next so you can reply.</p>
      <div class="mt-4 flex gap-2 justify-end"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="submit" data-need="write" class="btn btn-primary">${I("plus")}Add lead</button></div></form>`
  );
}

/* Assign select that saves on change (Owner / Manager); others see the name. */
const assignCtl = (ctx, lead, { compact = false } = {}) => {
  if (!canAssign(ctx))
    return lead.assigneeId
      ? who(ctx.s, lead.assigneeId)
      : `<span class="text-muted-foreground">Unassigned</span>`;
  return `<form data-do="leads.assign" data-a-id="${lead.id}" data-autosubmit>${select("memberId", [["", compact ? "Assign" : "Unassigned"], ...staffOf(ctx.s).map((m) => [m.id, m.name])], lead.assigneeId || "", { cls: compact ? "h-control-sm w-32" : "", label: `Assign ${custOf(ctx.s, lead.customerId).name}`, attrs: { "data-need": "assign" } })}</form>`;
};

/* ---------- leads inbox ---------- */
const TABS = [
  ["new", "New"],
  ["contacted", "Contacted"],
  ["replied", "Replied"],
  ["snoozed", "Snoozed"],
  ["rejected", "Rejected"],
  ["paid", "Paid"],
  ["all", "All"],
];
const quotedToReply = (s) =>
  s.leads.filter(
    (l) =>
      l.type === "quoted" && ["new", "contacted", "snoozed"].includes(l.status)
  );
const bookedToConfirm = (s) =>
  s.leads.filter(
    (l) =>
      l.type === "booked" &&
      isOpen(l) &&
      s.bookings.some((b) => b.leadId === l.id && b.status === "tentative")
  );

function leadsInbox(ctx) {
  const s = ctx.s;
  const tab = uiv(ctx, "leads:tab", "new");
  const type = uiv(ctx, "leads:type", "all");
  const list = s.leads
    .filter(
      (l) =>
        (tab === "all" || l.status === tab) &&
        (type === "all" || l.type === type)
    )
    .sort((a, b) => (isHigh(b) ? 1 : 0) - (isHigh(a) ? 1 : 0));
  const n = (k) =>
    s.leads.filter(
      (l) =>
        (k === "all" || l.status === k) && (type === "all" || l.type === type)
    ).length;
  /* Dialog targets: picked from the row (data-open-args) or the first lead waiting. */
  const toReply = quotedToReply(s);
  const pr =
    byId(s.leads, ctx.ui.pr) && toReply.some((l) => l.id === ctx.ui.pr)
      ? byId(s.leads, ctx.ui.pr)
      : toReply.find((l) => l.status === "new") || toReply[0];
  const toConfirm = bookedToConfirm(s);
  const cr = byId(s.leads, ctx.ui.cr) || toConfirm[0];
  const rm = byId(s.leads, ctx.ui.rm) || s.leads[0];
  const rows = list.map((l) => {
    const c = custOf(s, l.customerId);
    const waiting = l.status === "new" || l.status === "contacted";
    const tentative = s.bookings.some(
      (b) => b.leadId === l.id && b.status === "tentative"
    );
    return {
      id: l.id,
      f: l.assigneeId || "none",
      text: `${c.name} ${c.phone || ""} ${l.brief} ${SOURCES[l.source] || ""}`,
      cells: [
        `<span class="inline-flex items-center gap-1.5">${highFlag(l)}<span class="font-medium">${esc(c.name)}</span></span>`,
        `<span class="block max-w-64 truncate">${esc(l.brief)}</span>`,
        typeChip(l.type),
        chip(SOURCES[l.source] || l.source),
        pill(l.status),
        l.assigneeId
          ? canAssign(ctx)
            ? assignCtl(ctx, l, { compact: true })
            : who(s, l.assigneeId)
          : assignCtl(ctx, l, { compact: true }),
        C(age(s, l.createdAt)),
        `<span class="flex justify-end gap-1">${
          waiting
            ? l.type === "booked"
              ? tentative
                ? `<button type="button" data-need="write" class="btn btn-outline btn-sm" data-open="confirm-reply" ${openArgs({ cr: l.id })}>${I("calendar-check", "size-icon-sm")}Confirm</button>`
                : ""
              : `<button type="button" data-need="write" class="btn btn-ghost btn-sm btn-icon" data-open="ready-messages" ${openArgs({ rm: l.id })} aria-label="Ready messages" title="Ready messages">${I("message-square-text", "size-icon-sm")}</button><button type="button" data-need="write" class="btn btn-outline btn-sm" data-open="price-reply" ${openArgs({ pr: l.id })}>${I("send", "size-icon-sm")}Reply</button>`
            : ""
        }<a ${link("lead", { id: l.id })} class="btn btn-ghost btn-sm btn-icon" aria-label="Open lead" title="Open">${I("chevron-right", "size-icon-sm")}</a></span>`,
      ],
    };
  });
  const pick = (key, cur, opts, label) =>
    `<label class="field mb-1">${I("inbox", "size-icon-sm text-muted-foreground")}${select("", opts, cur, { cls: "border-0 bg-transparent h-auto px-0", label, attrs: { "data-ui": key } })}</label>`;
  const dialogs =
    newLeadDialog(ctx) +
    modal(
      "price-reply",
      `Price and reply${pr ? ` · ${esc(custOf(s, pr.customerId).name)}` : ""}`,
      pr
        ? `${
            toReply.length > 1
              ? pick(
                  "pr",
                  pr.id,
                  toReply.map((l) => [
                    l.id,
                    `${custOf(s, l.customerId).name} · ${l.brief}`,
                  ]),
                  "Lead to reply to"
                )
              : ""
          }${priceForm(ctx, pr)}`
        : empty(
            "inbox",
            "No price request waiting",
            "Quoted leads that are New or Contacted show here."
          )
    ) +
    modal(
      "confirm-reply",
      `Confirm and reply${cr ? ` · ${esc(custOf(s, cr.customerId).name)}` : ""}`,
      cr
        ? confirmForm(ctx, cr)
        : empty(
            "calendar-check",
            "No booking waiting",
            "Booked leads to confirm show here."
          )
    ) +
    (rm
      ? modal("ready-messages", "Ready messages", readyMessages(ctx, rm))
      : "");
  return app(
    ctx,
    "leads",
    {
      icon: "inbox",
      title: "Leads",
      fab: `${I("plus")}New lead`,
      fabOpen: "new-lead",
      dialogs,
    },
    page(`
    ${hint("Price requests and bookings from your page and your team arrive here. Reply straight from the row.")}
    ${toolbar(
      seg(
        ctx,
        "leads:tab",
        TABS.map(([k, t]) => [k, `${t} <span class="count">${n(k)}</span>`]),
        "new"
      ),
      `<button type="button" data-need="write" class="btn btn-primary" data-open="new-lead">${I("plus")}New lead</button>`
    )}
    <div class="flex flex-wrap items-center gap-1.5" data-type-chips><span class="text-caption text-muted-foreground">Type:</span>${[
      ["all", "All types", "list-filter"],
      ["quoted", "Quoted", "indian-rupee"],
      ["booked", "Booked", "calendar-check"],
    ]
      .map(
        ([k, t, ic]) =>
          `<button type="button" class="chip ${type === k ? "bg-accent text-accent-foreground" : "hover:bg-muted"}" data-ui="leads:type" data-v="${k}" aria-pressed="${type === k}">${I(ic, "size-icon-sm")}${t}</button>`
      )
      .join("")}</div>
    ${dataTable(ctx, {
      key: "leads",
      icon: "inbox",
      title:
        TABS.find((x) => x[0] === tab)?.[1] === "All"
          ? "Leads"
          : `${TABS.find((x) => x[0] === tab)?.[1]} leads`,
      go: "lead",
      ph: "Search leads",
      filters: [
        ["none", "Unassigned"],
        ...staffOf(s).map((m) => [m.id, `Assigned to ${m.name}`]),
      ],
      cols: [
        { t: "Customer", role: "title" },
        { t: "Request", m: 1, role: "sub" },
        { t: "Type" },
        { t: "Source", web: 1 },
        { t: "Status", role: "status" },
        { t: "Assigned", web: 1 },
        { t: "Age", m: 1, role: "end" },
        { t: "", role: "act" },
      ],
      rows,
    })}`)
  );
}

/* ---------- lead detail ---------- */
const recordIdsOfLead = (s, lead) => {
  const invs = s.invoices.filter((i) => i.leadId === lead.id);
  return new Set([
    lead.id,
    ...invs.map((i) => i.id),
    ...s.bookings.filter((b) => b.leadId === lead.id).map((b) => b.id),
    ...s.payments
      .filter((p) => invs.some((i) => i.id === p.invoiceId))
      .map((p) => p.id),
  ]);
};
const CH = { email: "Email", sms: "SMS", whatsapp: "WhatsApp" };
function leadActivity(ctx, lead) {
  const s = ctx.s;
  const ids = recordIdsOfLead(s, lead);
  const rows = [
    ...s.activity
      .filter((a) => ids.has(a.recordId))
      .map((a) => ({ at: a.at, text: a.text })),
    ...s.outbox
      .filter((m) => ids.has(m.recordId))
      .map((m) => ({
        at: m.at,
        text: `${CH[m.channel] || m.channel} ${m.status === "sent" ? "sent" : "copied"}${m.to ? ` to ${m.to}` : ""}: ${template(s, m.templateId).name || m.subject}`,
      })),
  ].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  if (!rows.some((r) => String(r.text).startsWith("New ")))
    rows.push({
      at: lead.createdAt,
      text: `Lead created · ${SOURCES[lead.source] || lead.source}`,
    });
  return `<div class="card p-card-sm @tab:p-card" data-activity><h3 class="text-title font-semibold mb-2">Activity</h3>
    ${rows.map((a) => `<div class="flex items-center gap-2 min-h-row-sm"><span class="size-1.5 rounded-pill bg-border shrink-0"></span><span class="min-w-0">${esc(a.text)}</span><span class="ml-auto shrink-0 code text-muted-foreground">${esc(ago(s, a.at))}</span></div>`).join("")}
    <form class="mt-2" data-do="lead.note" data-a-id="${lead.id}">${input("note", { placeholder: "Add a note…", attrs: { "aria-label": "Add a note", "data-need": "write" } })}</form>
  </div>`;
}

const leadAside = (ctx, lead) => {
  const s = ctx.s;
  const c = custOf(s, lead.customerId);
  const crm = s.workspace.modules?.customers !== false;
  return `<div class="space-y-4">
    <div class="card p-card-sm"><p class="label">Customer</p><p class="mt-1 font-medium">${crm ? `<a ${link("customer", { id: c.id })} class="hover:underline">${esc(c.name)}</a>` : esc(c.name)}</p>${c.phone ? `<p class="code">${esc(c.phone)}</p>` : ""}${c.email ? `<p class="text-muted-foreground">${esc(c.email)}</p>` : ""}
      ${c.phone ? `<a href="tel:${esc(String(c.phone).replace(/\s+/g, ""))}" class="mt-2 btn btn-outline w-full">${I("phone")}Call</a>` : `<p class="mt-2 text-caption text-muted-foreground">No phone on file.</p>`}</div>
    <div class="card p-card-sm space-y-3"><div><p class="flabel">Assigned to</p>${assignCtl(ctx, lead)}</div>
      <div><p class="flabel">Priority</p>${
        isOpen(lead)
          ? `<form data-do="leads.setPriority" data-a-id="${lead.id}" data-autosubmit data-need="write" data-priority-form>${select("priority", Object.entries(PRIORITY), lead.priority || "normal", { id: "ld-priority", label: "Priority" })}</form>`
          : `<p>${PRIORITY[lead.priority] || PRIORITY.normal}</p>`
      }</div>
      <div><p class="flabel">Created</p><p>${esc(when(lead.createdAt))} · ${esc(SOURCES[lead.source] || lead.source)}</p></div>
      ${lead.status === "snoozed" && lead.snoozedUntil ? `<div><p class="flabel">Snoozed until</p><p>${fmtDate(lead.snoozedUntil)}</p></div>` : ""}
      ${lead.status === "rejected" ? `<div><p class="flabel">Reason</p><p>${esc(lead.rejectReason || "No reason given")}</p></div>` : ""}</div>
  </div>`;
};

/* The lead's invoices: replies (proformas), advances and bills, each with its status. */
function invoiceCards(ctx, lead) {
  const s = ctx.s;
  const B = ctx.biz.invoices;
  return B.ofLead(s, lead.id)
    .map((inv) => {
      const t = B.totals(s, inv);
      const st = B.statusOf(s, inv);
      const shared = inv.sharedAt
        ? `shared ${when(inv.sharedAt)}`
        : "not shared yet";
      const rates = [...new Set(inv.lines.map((l) => +l.gst || 0))];
      const taxLabel = t.igst
        ? `IGST${rates.length === 1 ? ` ${rates[0]}%` : ""}`
        : `CGST${rates.length === 1 ? ` ${rates[0] / 2}%` : ""} + SGST${rates.length === 1 ? ` ${rates[0] / 2}%` : ""}`;
      return `<div class="card p-card-sm @tab:p-card" data-invoice="${inv.id}"><div class="flex flex-wrap items-center gap-2"><h3 class="text-title font-semibold">${B.KIND[inv.kind] || "Invoice"}</h3>${pill(st)}<span class="text-caption text-muted-foreground">${
        B.isReplyLike(inv)
          ? inv.payBy
            ? `Pay by ${fmtDate(inv.payBy)} · then Expired (D75)`
            : ""
          : inv.dueDate
            ? `Due ${fmtDate(inv.dueDate)}`
            : ""
      }</span><span class="ml-auto font-mono text-money-lg">${inr(t.total)}</span></div>
      <p class="mt-1 text-muted-foreground">${B.docKind(inv)} ${C(B.numberOf(inv))}${inv.invNumber && inv.piNumber ? ` (was ${C(inv.piNumber)})` : ""} · ${esc(shared)}${inv.version > 1 ? ` · version ${inv.version}` : ""}${inv.invNumber ? "" : ` · becomes a tax invoice ${C("INV-")} when the payment is approved`}</p>
      <div class="mt-3 divide-y divide-border">${inv.lines.map((l) => `<div class="flex justify-between h-row-sm items-center"><span>${esc(l.name)}${l.qty > 1 ? ` × ${l.qty}` : ""}</span>${M(l.qty * l.rate)}</div>`).join("")}${t.discount ? `<div class="flex justify-between h-row-sm items-center text-muted-foreground"><span>Discount</span>${M(-t.discount)}</div>` : ""}${t.gstOn ? `<div class="flex justify-between h-row-sm items-center text-muted-foreground"><span>${taxLabel}</span>${M(t.tax)}</div>` : ""}<div class="flex justify-between h-row-sm items-center font-semibold"><span>Total</span>${M(t.total)}</div></div>
      <div class="mt-3 hidden @tab:flex flex-wrap gap-2"><a ${link("invoice", { id: inv.id })} class="btn btn-primary">${I("receipt")}Open ${inv.invNumber ? "invoice" : "proforma"}</a>${inv.sharedAt ? `<a ${link("p-pay", { id: inv.id })} class="btn btn-outline">${I("smartphone")}Customer sees</a>` : ""}${B.isReplyLike(inv) && ["awaiting", "expired"].includes(st) ? `<button type="button" data-need="write" class="btn btn-outline" data-open="resend-${inv.id}">${I("send")}Resend</button>` : ""}</div></div>`;
    })
    .join("");
}

/* Fallback lead per v2 state when the URL names none. */
const FALLBACK = [
  (s) => s.leads.find((l) => l.type === "quoted" && l.status === "new"),
  (s) => s.leads.find((l) => l.type === "booked" && l.status === "new"),
  (s) =>
    s.leads.find(
      (l) =>
        l.status === "replied" &&
        s.invoices.some((i) => i.leadId === l.id && i.kind === "reply")
    ),
];
function leadDetail(ctx, state) {
  const s = ctx.s;
  const lead = byId(s.leads, ctx.params.id) || FALLBACK[state](s) || s.leads[0];
  if (!lead)
    return app(
      ctx,
      "leads",
      { icon: "inbox", title: "Lead", back: "leads" },
      page(empty("inbox", "No leads yet"))
    );
  const c = custOf(s, lead.customerId);
  const B = ctx.biz.invoices;
  const open = isOpen(lead);
  const quotedOpen =
    lead.type === "quoted" &&
    ["new", "contacted", "snoozed"].includes(lead.status);
  const b = bookingOfLead(s, lead);
  const pkg = byId(s.packages, lead.packageId || b?.packageId);
  const toConfirm = lead.type === "booked" && open && b?.status === "tentative";
  const replies = B.ofLead(s, lead.id).filter(
    (i) =>
      B.isReplyLike(i) && ["awaiting", "expired"].includes(B.statusOf(s, i))
  );
  const canContact = open && ["new", "snoozed"].includes(lead.status);
  const snoozeBtn = open
    ? `<button type="button" data-need="write" class="btn btn-ghost" data-do="leads.snooze" data-a-id="${lead.id}" data-a-days="3">${I("alarm-clock")}Snooze 3 days</button>`
    : "";
  const contactBtn = canContact
    ? `<button type="button" data-need="write" class="btn btn-ghost" data-do="leads.contacted" data-a-id="${lead.id}">${I("phone")}Mark contacted</button>`
    : "";
  const head = `<div class="flex flex-wrap items-center gap-2">${pill(lead.status)}${highFlag(lead, true)}${typeChip(lead.type)}${chip(SOURCES[lead.source] || lead.source)}<span class="ml-auto text-caption text-muted-foreground">${esc(ago(s, lead.createdAt))}</span></div>`;
  const facts = (rows) =>
    `<div class="mt-4 grid grid-cols-2 @tab:grid-cols-3 gap-3">${rows
      .filter((r) => r[1])
      .map(
        (r) =>
          `<div><p class="label">${r[0]}</p><p class="mt-0.5">${r[1]}</p></div>`
      )
      .join("")}</div>`;
  let main;
  if (lead.type === "booked") {
    const m = byId(s.members, b?.memberId || lead.assigneeId);
    main = `<div class="card p-card-sm @tab:p-card">${head}
      <h2 class="mt-3 font-serif text-heading font-semibold">${esc(pkg?.name || lead.brief)}</h2>
      <p class="mt-1 text-muted-foreground">${esc(SOURCES[lead.source] || "")} booking${pkg ? ` · package price ${inr(pkg.price)}${pkg.durationMin ? ` · ${pkg.durationMin / 60} h` : ""}` : ""}${pkg ? "" : ` · ${esc(lead.brief)}`}</p>
      ${facts([
        ["Slot", esc(when(b?.start || lead.preferredDate))],
        ["With", m ? esc(first(m.name)) : "Not assigned"],
        ["Booking", b ? bookingPill(b.status) : "None"],
        ["Advance", pkg?.advancePct ? `${pkg.advancePct}%` : "None set"],
      ])}
      ${b?.notes ? `<p class="mt-3 text-body text-muted-foreground">Note from ${esc(first(c.name))}: "${esc(b.notes)}"</p>` : ""}
      ${
        open
          ? `<div class="mt-4 hidden @tab:flex flex-wrap gap-2">${toConfirm ? `<button type="button" data-need="write" class="btn btn-primary" data-open="confirm-reply">${I("calendar-check")}Confirm booking</button>` : ""}<a ${link("bookings")} class="btn btn-outline">${I("calendar")}Change slot</a><span class="ml-auto"></span>${contactBtn}${snoozeBtn}<button type="button" data-need="write" class="btn btn-ghost text-destructive" data-open="reject-reply">${I("circle-x")}Mark as lost</button></div>
      <p class="mt-2 hidden @tab:block text-caption text-muted-foreground">Confirm assigns the staff member and tells the customer. The invoice is raised after the service.</p>`
          : ""
      }</div>`;
  } else {
    const lines = priceLinesOf(ctx, lead);
    main = `<div class="card p-card-sm @tab:p-card">${head}
      <h2 class="mt-3 font-serif text-heading font-semibold">${esc(lead.brief || "Price request")}</h2>
      ${facts([
        ["Preferred date", esc(when(lead.preferredDate))],
        ["Asked for", esc(lines.map((l) => `${l.name} × ${l.qty}`).join(", "))],
        ["Customer", esc(c.name)],
      ])}
      ${
        lines.length
          ? `<div class="mt-4 overflow-x-auto rounded-control border border-border"><table class="w-full border-collapse"><thead class="bg-muted"><tr>${["Items requested", "Qty", "Catalog rate"].map((h, i) => `<th class="th ${i ? "text-right" : ""}">${h}</th>`).join("")}</tr></thead><tbody>${lines.map((l) => `<tr><td class="td"><span class="font-medium">${esc(l.name)}</span>${l.desc ? `<span class="block text-caption text-muted-foreground">${esc(l.desc)}</span>` : ""}</td><td class="td text-right money">${l.qty}</td><td class="td text-right">${M(l.rate)}</td></tr>`).join("")}</tbody></table></div>`
          : quotedOpen
            ? `<p class="mt-4 text-muted-foreground">No items picked yet. Edit adds them, or add lines while you price it.</p>`
            : ""
      }
      ${
        quotedOpen
          ? `<div class="mt-4 hidden @tab:flex flex-wrap gap-2"><button type="button" data-need="write" class="btn btn-primary" data-open="price-reply">${I("check")}Accept</button><button type="button" data-need="write" class="btn btn-outline" data-open="edit-request">${I("pencil")}Edit</button><button type="button" data-need="write" class="btn btn-outline text-destructive" data-open="reject-reply">${I("circle-x")}Reject</button><span class="ml-auto"></span>${contactBtn}<button type="button" data-need="write" class="btn btn-ghost" data-open="ready-3">${I("message-circle-question")}Ask customer</button>${snoozeBtn}</div>
      <p class="mt-2 hidden @tab:block text-caption text-muted-foreground">Accept prices the request and shares a proforma. The customer confirms by paying.</p>`
          : ""
      }
      ${open ? `<div class="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-1.5"><span class="text-caption text-muted-foreground">Quick reply:</span>${READY.map((t) => `<button type="button" data-need="write" class="chip hover:bg-muted" data-open="ready-${t}">${I("message-square-text", "size-icon-sm")}${esc(template(s, t).name)}</button>`).join("")}</div>` : ""}
    </div>`;
  }
  const dialogs = [
    quotedOpen
      ? modal("price-reply", "Price and reply", priceForm(ctx, lead))
      : "",
    quotedOpen
      ? modal("edit-request", "Edit request", editForm(ctx, lead))
      : "",
    open
      ? modal(
          "reject-reply",
          lead.type === "booked"
            ? "Mark as lost and reply"
            : "Reject and reply",
          rejectForm(ctx, lead)
        )
      : "",
    toConfirm
      ? modal("confirm-reply", "Confirm and reply", confirmForm(ctx, lead))
      : "",
    open
      ? READY.map((t) =>
          modal(
            `ready-${t}`,
            `${t} · ${esc(template(s, t).name)}`,
            readyMessages(ctx, lead, t)
          )
        ).join("")
      : "",
    replies
      .map((i) =>
        modal(`resend-${i.id}`, "Resend the reply", resendForm(ctx, lead, i))
      )
      .join(""),
  ].join("");
  const fab = quotedOpen
    ? [`${I("check")}Accept`, "price-reply"]
    : toConfirm
      ? [`${I("calendar-check")}Confirm booking`, "confirm-reply"]
      : replies[0]
        ? [`${I("send")}Resend`, `resend-${replies[0].id}`]
        : ["", ""];
  return app(
    ctx,
    "leads",
    {
      icon: "inbox",
      title: esc(c.name),
      crumb: "Lead",
      back: "leads",
      fab: fab[0],
      fabOpen: fab[1],
      dialogs,
    },
    page(`<div class="grid @web:grid-cols-[1fr_var(--size-aside)] gap-4" data-lead="${lead.id}">
    <div class="space-y-4 min-w-0">${main}${invoiceCards(ctx, lead)}${leadActivity(ctx, lead)}</div>
    ${leadAside(ctx, lead)}
  </div>`)
  );
}

/* ---------- customers (extra, D63) ---------- */
const crmOff = (ctx) => ctx.s.workspace.modules?.customers === false;
const offPage = (ctx, title) =>
  app(
    ctx,
    "customers",
    { icon: "users", title },
    page(
      empty(
        "users",
        "Customers is switched off",
        "Customers is an extra (D63). The Owner turns it on in Settings.",
        ctx.role === "owner"
          ? `<a ${link("settings")} class="btn btn-outline">${I("settings")}Open Settings</a>`
          : ""
      )
    )
  );
const digits = (p) =>
  String(p || "")
    .replace(/\D/g, "")
    .slice(-10);

function customerForm(ctx, c) {
  const k = c?.id || "new";
  const f = (label, name, o = {}) =>
    `<div class="${o.wrap || ""}">${flabel(label, o.req, `cu-${name}-${k}`)}${input(name, { ...o, id: `cu-${name}-${k}`, value: c?.[name] ?? "" })}</div>`;
  return `<form data-do="customer.save" ${c ? `data-a-id="${c.id}"` : ""} ${c ? "" : 'data-after="customer"'}><div class="space-y-3">
    <div class="grid grid-cols-2 gap-3">${f("Phone", "phone", { type: "tel", req: true, money: true, placeholder: "10-digit mobile" })}${f("Name", "name", { req: true })}</div>
    <div class="grid grid-cols-2 gap-3">${f("Email", "email", { type: "email" })}${f("Company", "company")}</div>
    <div class="grid grid-cols-2 gap-3">${f("GSTIN", "gstin", { cls: "code" })}<div>${flabel("Tags", false, `cu-tags-${k}`)}${input("tags", { id: `cu-tags-${k}`, value: (c?.tags || []).join(", "), placeholder: "Comma separated" })}</div></div>
    ${f("Address", "address")}
    <div>${flabel("Notes", false, `cu-notes-${k}`)}${textarea("notes", { id: `cu-notes-${k}`, value: c?.notes || "", rows: 2 })}</div></div>
    <p class="hint">The phone number is unique in your workspace.</p>
    <div class="mt-4 flex gap-2 justify-end"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="submit" data-need="write" class="btn btn-primary">${I(c ? "check" : "plus")}${c ? "Save" : "Add customer"}</button></div></form>`;
}

function customerList(ctx) {
  if (crmOff(ctx)) return offPage(ctx, "Customers");
  const s = ctx.s;
  const tab = uiv(ctx, "cu:tab", "all");
  const month = s.meta.today.slice(0, 7);
  const stats = new Map(
    s.customers.map((c) => [c.id, ctx.biz.sel.customerStats(s, c)])
  );
  const list = s.customers.filter(
    (c) =>
      tab === "all" ||
      (tab === "owes" && stats.get(c.id).owed > 0) ||
      (tab === "new" && String(c.createdAt).slice(0, 7) === month)
  );
  const tags = [...new Set(s.customers.flatMap((c) => c.tags || []))].sort();
  const ec = byId(s.customers, ctx.ui.ec);
  const rows = list.map((c) => {
    const st = stats.get(c.id);
    return {
      id: c.id,
      f: c.tags || [],
      text: `${c.name} ${c.phone || ""} ${c.email || ""} ${(c.tags || []).join(" ")}`,
      cells: [
        `<span class="flex items-center gap-2">${av(initialsOf(c.name))}<span class="font-medium">${esc(c.name)}</span></span>`,
        c.phone ? C(c.phone) : '<span class="text-muted-foreground">—</span>',
        (c.tags || []).map((t) => chip(t)).join(" "),
        st.leads + st.invoices,
        fmtDate(st.last),
        st.owed ? M(st.owed) : '<span class="text-muted-foreground">—</span>',
        `<button type="button" data-need="write" class="btn btn-ghost btn-sm btn-icon" data-open="customer-form" ${openArgs({ ec: c.id })} aria-label="Edit ${esc(c.name)}" title="Edit">${I("pencil", "size-icon-sm")}</button>`,
      ],
    };
  });
  const count = (k) =>
    s.customers.filter(
      (c) =>
        k === "all" ||
        (k === "owes" && stats.get(c.id).owed > 0) ||
        (k === "new" && String(c.createdAt).slice(0, 7) === month)
    ).length;
  return app(
    ctx,
    "customers",
    {
      icon: "users",
      title: "Customers",
      fab: `${I("plus")}New customer`,
      fabOpen: "customer-form",
      dialogs: modal(
        "customer-form",
        ec ? `Edit ${esc(ec.name)}` : "New customer",
        customerForm(ctx, ec)
      ),
    },
    page(`
    ${hint("Vyapar calls this Party. Still due counts bills only; a reply waiting for payment is not money owed (D75).")}
    ${toolbar(
      seg(
        ctx,
        "cu:tab",
        [
          ["all", `All <span class="count">${count("all")}</span>`],
          ["owes", `Owes money <span class="count">${count("owes")}</span>`],
          ["new", `New this month <span class="count">${count("new")}</span>`],
        ],
        "all"
      ),
      `<button type="button" data-need="write" class="btn btn-primary" data-open="customer-form" ${openArgs({ ec: "" })}>${I("plus")}New customer</button>`
    )}
    ${dataTable(ctx, {
      key: "cu",
      icon: "users",
      title: "Customers",
      go: "customer",
      ph: "Search name or phone",
      filters: tags.map((t) => [t, `Tag: ${t}`]),
      cols: [
        { t: "Name", role: "title" },
        { t: "Phone", role: "sub" },
        { t: "Tag", web: 1 },
        { t: "Records", m: 1, web: 1 },
        { t: "Last activity", m: 1 },
        { t: "Still due", r: 1, role: "end" },
        { t: "", role: "act" },
      ],
      rows,
    })}`)
  );
}
const initialsOf = (n = "") =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/* Timeline events: leads, invoices, payments, bookings and messages (not a ledger). */
function timelineOf(ctx, c) {
  const s = ctx.s;
  const B = ctx.biz.invoices;
  const leads = s.leads.filter((l) => l.customerId === c.id);
  const invs = s.invoices.filter((i) => i.customerId === c.id);
  const books = s.bookings.filter((b) => b.customerId === c.id);
  const pays = s.payments.filter((p) => invs.some((i) => i.id === p.invoiceId));
  const ids = new Set(
    [c.id, ...leads, ...invs, ...books, ...pays].map((r) => r.id || r)
  );
  const word = (k) => (ST[k] ? ST[k][0] : k).toLowerCase();
  const ev = [
    ...leads.map((l) => ({
      at: l.createdAt,
      icon: "inbox",
      tone: "text-muted-foreground",
      text: `${l.type === "booked" ? "Booking" : "Price request"} from ${esc(SOURCES[l.source] || l.source)}: <a ${link("lead", { id: l.id })} class="hover:underline">"${esc(l.brief)}"</a> · ${word(l.status)}`,
      kind: "lead",
    })),
    ...invs.map((i) => ({
      at: i.sharedAt || i.createdAt,
      icon: "file-text",
      tone: "text-secondary-foreground",
      text: `${B.KIND[i.kind] || "Invoice"} <a ${link("invoice", { id: i.id })} class="hover:underline">${C(B.numberOf(i))}</a>${i.cancelled ? " · cancelled" : ` · ${word(B.statusOf(s, i))}`}`,
      amount: B.total(s, i),
      kind: "invoice",
    })),
    ...pays.map((p) => ({
      at: p.uploadedAt || p.decidedAt,
      icon: "wallet",
      tone: p.status === "approved" ? "text-success" : "text-muted-foreground",
      text: `Payment${p.method ? ` by ${esc(ctx.biz.payments.METHODS[p.method] || p.method)}` : ""} for ${C(B.numberOf(byId(s.invoices, p.invoiceId)))} · ${word(p.status)}`,
      amount: p.amount,
      kind: "payment",
    })),
    ...books.map((b) => ({
      at: b.start,
      icon: "calendar-check",
      tone: "text-secondary-foreground",
      text: `Booking: ${esc(byId(s.packages, b.packageId)?.name || "Appointment")}${byId(s.members, b.memberId) ? ` with ${esc(first(byId(s.members, b.memberId).name))}` : ""}, ${esc(when(b.start))} · ${word(b.status)}`,
      kind: "booking",
    })),
    ...s.outbox
      .filter(
        (m) =>
          ids.has(m.recordId) ||
          (m.to &&
            (m.to === c.email || (c.phone && digits(m.to) === digits(c.phone))))
      )
      .map((m) => ({
        at: m.at,
        icon: "message-circle",
        tone: "text-muted-foreground",
        text: `${CH[m.channel] || m.channel} ${m.status === "sent" ? "sent" : "copied"}: ${esc(m.subject || template(s, m.templateId).name)}`,
        kind: "message",
      })),
  ];
  return ev
    .filter((e) => e.at)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

function customerTimeline(ctx) {
  if (crmOff(ctx)) return offPage(ctx, "Customer");
  const s = ctx.s;
  const c = byId(s.customers, ctx.params.id) || s.customers[0];
  if (!c)
    return app(
      ctx,
      "customers",
      { icon: "users", title: "Customer", back: "customers" },
      page(empty("users", "No customers yet"))
    );
  const B = ctx.biz.invoices;
  const st = ctx.biz.sel.customerStats(s, c);
  const awaiting = B.ofCustomer(s, c.id)
    .filter((i) => B.isReplyLike(i) && B.statusOf(s, i) === "awaiting")
    .reduce((t, i) => t + B.open(s, i), 0);
  const ev = timelineOf(ctx, c);
  const filter = uiv(ctx, "tl:f", "all");
  const shown = ev.filter((e) => filter === "all" || e.kind === filter);
  const inv = PAY?.newInvoiceDialogs
    ? PAY.newInvoiceDialogs(ctx, { customerId: c.id })
    : "";
  const ordersLink = `${s.workspace.slug}.biz4kit.com/me/${c.token}`;
  return app(
    ctx,
    "customers",
    {
      icon: "users",
      title: esc(c.name),
      crumb: "Customer",
      back: "customers",
      fab: inv ? `${I("plus")}New invoice` : "",
      fabOpen: inv ? "new-invoice" : "",
      dialogs:
        inv +
        modal("customer-form", `Edit ${esc(c.name)}`, customerForm(ctx, c)),
    },
    page(`<div class="grid @web:grid-cols-[var(--size-aside)_1fr] gap-4" data-customer="${c.id}">
    <div class="card p-card-sm h-fit"><div class="flex items-center gap-3">${av(initialsOf(c.name))}<div><p class="text-title font-semibold">${esc(c.name)}</p>${(c.tags || []).map((t) => chip(t)).join(" ")}</div></div>
      <div class="mt-3 space-y-1.5">${
        [
          ["phone", c.phone ? C(c.phone) : ""],
          ["mail", esc(c.email || "")],
          ["building-2", esc(c.company || "")],
          ["map-pin", esc(c.address || "")],
          ["file-text", c.gstin ? C(`GSTIN ${c.gstin}`) : ""],
        ]
          .filter((r) => r[1])
          .map(
            (r) =>
              `<div class="flex items-center gap-2">${I(r[0], "size-icon-sm text-muted-foreground")}${r[1]}</div>`
          )
          .join("") ||
        `<p class="text-muted-foreground">No contact details yet.</p>`
      }</div>
      ${c.notes ? `<p class="mt-2 text-muted-foreground">${esc(c.notes)}</p>` : ""}
      <div class="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2"><div><p class="label">Reply awaiting</p>${awaiting ? M(awaiting) : '<span class="text-muted-foreground">—</span>'}</div><div><p class="label">Still due</p><span data-owed="${st.owed}">${st.owed ? M(st.owed) : '<span class="text-muted-foreground">—</span>'}</span></div><div><p class="label">Paid</p>${st.paid ? M(st.paid) : '<span class="text-muted-foreground">—</span>'}</div><div><p class="label">Records</p><span>${st.leads} leads · ${st.invoices} invoices</span></div></div>
      <div class="mt-3 flex flex-col gap-2">${inv ? `<button type="button" data-need="write" class="hidden @tab:inline-flex btn btn-primary" data-open="new-invoice">${I("plus")}New invoice</button>` : ""}<button type="button" data-need="write" class="btn btn-outline" data-open="customer-form">${I("pencil")}Edit details</button><button type="button" class="btn btn-outline" data-copy-text="${esc(ordersLink)}">${I("link")}Copy My-orders link</button></div>
    </div>
    <div class="card p-card-sm @tab:p-card min-w-0"><div class="flex flex-wrap items-center gap-2 mb-3"><h3 class="text-title font-semibold">Timeline</h3><span class="count">${ev.length}</span><div class="ml-auto">${seg(
      ctx,
      "tl:f",
      [
        ["all", "All"],
        ["lead", "Leads"],
        ["invoice", "Invoices"],
        ["payment", "Payments"],
        ["booking", "Bookings"],
        ["message", "Messages"],
      ],
      "all"
    )}</div></div>
      ${
        shown.length
          ? shown
              .map(
                (
                  e,
                  i,
                  a
                ) => `<div class="flex gap-3" data-event="${e.kind}"><div class="flex flex-col items-center"><span class="size-control-sm rounded-pill bg-muted flex items-center justify-center ${e.tone}">${I(e.icon, "size-icon-sm")}</span>${i < a.length - 1 ? '<span class="w-px flex-1 bg-border"></span>' : ""}</div>
          <div class="pb-3 flex-1 min-w-0 flex flex-col @tab:flex-row @tab:items-start gap-x-3 pt-1"><span class="min-w-0">${e.text}</span><span class="@tab:ml-auto shrink-0">${e.amount ? M(e.amount) : ""}</span><span class="text-caption @tab:text-body-sm text-muted-foreground @tab:w-24 @tab:text-right shrink-0">${fmtDate(e.at)}</span></div></div>`
              )
              .join("")
          : `<p class="text-muted-foreground">Nothing here yet.</p>`
      }
    </div>
  </div>`)
  );
}

/* ---------- screen actions (shared by the four screens) ---------- */
const ACTIONS = {
  /* Accept: numbers from the form, lines with a quantity, optional advance %. */
  "lead.accept": (ctx, a) => {
    const lines = (a.lines || [])
      .map(normLine)
      .filter((l) => l.name && l.qty > 0);
    const advancePct = a.pay === "advance" ? +a.advancePct || null : null;
    if (a.pay === "advance" && !(advancePct > 0 && advancePct < 100))
      fail("Enter the advance as a % between 1 and 99.");
    return call(
      "Leads: accept",
      (s, c) =>
        ctx.biz.leads.accept(
          s,
          { id: a.id, lines, channel: a.channel || "email", advancePct },
          c
        ),
      ctx
    );
  },
  "lead.edit": (ctx, a) =>
    call(
      "Leads: edit",
      (s, c) => {
        const lead = byId(s.leads, a.id) || fail("Lead not found.");
        const prev = lead.lines || [];
        const lines = (a.lines || [])
          .map((l) => {
            const old = prev.find((p) => p.name === l.name);
            const it = itemByName(s, l.name);
            return {
              name: l.name,
              note: old?.note || "",
              qty: Math.max(0, +l.qty || 0),
              rate: old?.rate ?? it?.price ?? 0,
            };
          })
          .filter((l) => l.name && l.qty > 0);
        const out = ctx.biz.leads.edit(
          s,
          { id: a.id, brief: a.brief, lines },
          c
        );
        const was = String(lead.preferredDate || "");
        if ((a.preferredDate || "") !== was.slice(0, 10))
          lead.preferredDate = a.preferredDate
            ? a.preferredDate + (was.length > 10 ? was.slice(10) : "")
            : null;
        return out;
      },
      ctx
    ),
  /* Ready message (or a resend): email goes to the outbox as sent; SMS / WhatsApp are logged and copied. */
  "lead.message": (ctx, a) =>
    call(
      "Ready message",
      (s, c) => {
        ctx.biz.perms.need(c, "write");
        const lead = byId(s.leads, a.id) || fail("Lead not found.");
        const cu = byId(s.customers, lead.customerId);
        const channel = a.channel || "email";
        const to = addressOf(cu, channel);
        if (!to)
          fail(
            channel === "email"
              ? `No email on file for ${cu?.name}. Use SMS or WhatsApp.`
              : `No phone on file for ${cu?.name}.`
          );
        const t = +a.t;
        const inv = a.invoice && byId(s.invoices, a.invoice);
        const vars = inv
          ? varsFor(s, {
              invoice: { ...inv, _total: ctx.biz.invoices.total(s, inv) },
            })
          : varsFor(s, { customerId: cu.id });
        const tpl = template(s, t);
        const message = ctx.biz.messages.send(
          s,
          {
            channel,
            templateId: t,
            vars,
            to,
            recordId: inv ? inv.id : lead.id,
            body: a.body ? String(a.body) : undefined,
          },
          c
        );
        return {
          recordId: lead.id,
          text: `Ready message ${t} "${tpl.name}" ${channel === "email" ? "emailed" : `copied for ${CH[channel]}`}`,
          message,
        };
      },
      ctx
    ),
  "lead.note": (ctx, a) => {
    const note = String(a.note || "").trim();
    if (!note) fail("Write a note first.");
    return call(
      "Note",
      (s, c) => {
        ctx.biz.perms.need(c, "write");
        return { recordId: a.id, text: `Note: ${note}` };
      },
      ctx
    );
  },
  /* Add or edit a customer. Phone is unique per workspace. */
  "customer.save": (ctx, a) =>
    call(
      a.id ? "Customers: edit" : "Customers: add",
      (s, c) => {
        ctx.biz.perms.need(c, "write");
        const name = String(a.name || "").trim();
        const phone = String(a.phone || "").trim();
        if (!name) fail("Enter the customer's name.");
        if (!/^\+?[\d\s-]{10,16}$/.test(phone) || digits(phone).length < 10)
          fail("Enter a 10-digit mobile number.");
        const dup = s.customers.find(
          (x) => x.id !== a.id && x.phone && digits(x.phone) === digits(phone)
        );
        if (dup) fail(`${dup.name} already has this phone number.`);
        const email = String(a.email || "").trim();
        if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
          fail("Check the email address.");
        const gstin = String(a.gstin || "")
          .trim()
          .toUpperCase();
        if (gstin && !/^\d{2}[A-Z0-9]{13}$/.test(gstin))
          fail("A GSTIN has 15 characters and starts with the state code.");
        const fields = {
          name,
          phone,
          email: email || null,
          company: String(a.company || "").trim() || null,
          gstin: gstin || null,
          address: String(a.address || "").trim() || null,
          tags: String(a.tags || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          notes: String(a.notes || "").trim(),
        };
        if (a.id) {
          const cu = byId(s.customers, a.id) || fail("Customer not found.");
          Object.assign(cu, fields);
          return { recordId: cu.id, text: `${name} updated` };
        }
        const cu = {
          id: nextId(s, "C"),
          ...fields,
          token: token("c"),
          createdAt: nowStamp(s),
        };
        s.customers.unshift(cu);
        return { recordId: cu.id, text: `${name} added` };
      },
      ctx
    ),
};
/* Customer screens also carry the quick invoice actions from payments.js (merged when it loads). */
const CUST_ACTIONS = { ...ACTIONS };
mergePay = () => {
  for (const [k, f] of Object.entries(PAY_ACTIONS)) CUST_ACTIONS[k] ??= f;
};
if (PAY) mergePay();

/* ---------- checks ---------- */
const OWNER = (s) => ({ role: "owner", memberId: s.meta.people.owner });
const rowsOf = (f) =>
  [...f.querySelectorAll("tbody tr[data-row]")].filter((r) => r.dataset.row);
const uiOf = (h, id, params = {}) => {
  h.at(id, params);
  return h.makeCtx().ui;
};
const checkCtx = (h) => ({
  ...h.makeCtx(),
  role: "owner",
  memberId: store.get().meta.people.owner,
});

const checks = {
  leads: [
    (t, h) => {
      const ui = uiOf(h, "leads");
      for (const [k] of TABS.filter((x) => x[0] !== "all")) {
        ui["leads:tab"] = k;
        ui["leads:per"] = 50;
        const f = h.at("leads");
        const rows = rowsOf(f);
        const want = store.get().leads.filter((l) => l.status === k).length;
        t(
          rows.length === want,
          `tab ${k} shows ${want} leads (got ${rows.length})`
        );
        t(
          rows.every((r) => r.querySelector(`[data-status="${k}"]`)),
          `tab ${k} shows only ${k} leads`
        );
      }
      ui["leads:tab"] = "all";
      ui["leads:type"] = "booked";
      const f = h.at("leads");
      t(
        rowsOf(f).length ===
          store.get().leads.filter((l) => l.type === "booked").length,
        "type chip Booked filters to booked leads"
      );
      ui["leads:type"] = "all";
      ui["leads:q"] = "Kiran";
      t(rowsOf(h.at("leads")).length === 1, "search finds one lead for Kiran");
      for (const k of ["leads:tab", "leads:type", "leads:q", "leads:per"])
        delete ui[k];
    },
    (t, h) => {
      const f = h.at("leads");
      t(
        Boolean(
          f.querySelector(
            '[data-dialog="price-reply"] form[data-do="lead.accept"]'
          )
        ),
        "Today's Send reply finds a price-reply dialog on Leads"
      );
      t(
        Boolean(
          f.querySelector(
            '[data-dialog="new-lead"] form[data-do="leads.create"]'
          )
        ),
        "New lead dialog creates a lead"
      );
      const s = store.get();
      const out = store.commit("check", (d) =>
        h.biz.leads.create(
          d,
          {
            name: "Check Walkin",
            phone: "9811122233",
            type: "quoted",
            brief: "Hair spa at the counter",
          },
          OWNER(d)
        )
      );
      const ui = uiOf(h, "leads");
      ui["leads:tab"] = "new";
      const g = h.at("leads");
      t(
        Boolean(g.querySelector(`[data-row="${out.lead.id}"]`)),
        "a new lead appears in the New tab"
      );
      delete ui["leads:tab"];
    },
  ],
  lead: [
    (t, h) => {
      const s = store.get();
      const L = s.leads.find(
        (l) => l.type === "quoted" && l.status === "new" && l.lines.length
      );
      const f = h.at("lead", { id: L.id });
      const tot = +f.querySelector('[data-dialog="price-reply"] [data-total]')
        ?.dataset.total;
      const lines = L.lines.map((l) => ({
        name: l.name,
        qty: l.qty,
        rate: l.rate,
        gst: h.biz.invoices.gstFor(s, l),
      }));
      const want = h.biz.invoices.totals(s, {
        customerId: L.customerId,
        lines,
      }).total;
      t(
        tot === want,
        `price dialog total ${tot} equals biz.invoices.totals ${want}`
      );
      const ui = h.makeCtx().ui;
      ui[`pr:${L.id}`] = {
        lines: lines.map((l, i) => ({ ...l, qty: i ? l.qty : 1 })),
        add: s.items[0].id,
      };
      const g = h.at("lead", { id: L.id });
      const tot2 = +g.querySelector('[data-dialog="price-reply"] [data-total]')
        ?.dataset.total;
      t(
        tot2 !== tot &&
          g.querySelectorAll('[data-dialog="price-reply"] tr[data-line]')
            .length ===
            lines.length + 1,
        "totals update live and a catalog line is added"
      );
      delete ui[`pr:${L.id}`];
    },
    (t, h) => {
      const s0 = store.get();
      const L = s0.leads.find(
        (l) => l.type === "quoted" && l.status === "new" && l.lines.length
      );
      const pi = s0.workspace.numbering.PI.next;
      ACTIONS["lead.accept"](checkCtx(h), {
        id: L.id,
        channel: "email",
        pay: "full",
        lines: L.lines.map((l) => ({
          name: l.name,
          qty: String(l.qty),
          rate: String(l.rate),
          gst: "18",
        })),
      });
      const s = store.get();
      const lead = byId(s.leads, L.id);
      const inv = s.invoices.find(
        (i) => i.leadId === L.id && i.kind === "reply"
      );
      t(lead.status === "replied", "accept makes the lead Replied");
      t(
        Boolean(inv?.piNumber?.startsWith("PI-")) &&
          inv.piNumber.endsWith(String(pi).padStart(4, "0")),
        "accept creates the next PI- invoice"
      );
      t(typeof inv.lines[0].qty === "number", "accepted lines are numbers");
      const f = h.at("lead", { id: L.id });
      t(
        Boolean(
          f.querySelector(`[data-invoice="${inv.id}"] [data-status="awaiting"]`)
        ),
        "lead shows its reply as Awaiting payment"
      );
      t(
        f.querySelector("[data-activity]").textContent.includes(inv.piNumber),
        "activity lists the reply"
      );
    },
    (t, h) => {
      const s = store.get();
      const L = s.leads.find(
        (l) => l.type === "quoted" && ["new", "contacted"].includes(l.status)
      );
      const n = s.outbox.length;
      ACTIONS["lead.message"](checkCtx(h), {
        id: L.id,
        t: "2",
        channel: "sms",
      });
      t(
        store.get().outbox.length === n + 1 &&
          store.get().outbox[0].channel === "sms",
        "ready message goes to the outbox"
      );
      store.commit("check", (d) =>
        h.biz.leads.snooze(d, { id: L.id, days: 3 }, OWNER(d))
      );
      t(byId(store.get().leads, L.id).status === "snoozed", "snooze works");
      const f = h.at("lead", { id: L.id });
      t(
        f.querySelectorAll('[data-dialog^="ready-"]').length === 3,
        "three ready message dialogs"
      );
      t(
        Boolean(
          f.querySelector(
            '[data-dialog="reject-reply"] form[data-do="leads.reject"]'
          )
        ),
        "reject dialog"
      );
    },
    (t, h) => {
      const s = store.get();
      const B = s.leads.find(
        (l) =>
          l.type === "booked" &&
          s.bookings.some((b) => b.leadId === l.id && b.status === "tentative")
      );
      if (!B) return t(false, "sample has a booked lead to confirm");
      const f = h.at("lead", { id: B.id });
      t(
        Boolean(
          f.querySelector(
            '[data-dialog="confirm-reply"] form[data-do="leads.confirm"]'
          )
        ),
        "booked lead has Confirm"
      );
      store.commit("check", (d) =>
        h.biz.leads.confirm(
          d,
          { id: B.id, memberId: s.meta.people.staff },
          OWNER(d)
        )
      );
      t(
        store.get().bookings.find((b) => b.leadId === B.id).status ===
          "confirmed",
        "confirm agrees the booking"
      );
    },
  ],
  customers: [
    (t, h) => {
      const s = store.get();
      const ui = uiOf(h, "customers");
      ui["cu:tab"] = "owes";
      ui["cu:per"] = 50;
      const f = h.at("customers");
      const want = s.customers.filter(
        (c) => h.biz.sel.customerStats(s, c).owed > 0
      );
      t(
        rowsOf(f).length === want.length,
        `Owes money shows ${want.length} customers`
      );
      ui["cu:tab"] = "all";
      ui["cu:f"] = "Regular";
      t(
        rowsOf(h.at("customers")).length ===
          s.customers.filter((c) => c.tags?.includes("Regular")).length,
        "tag filter works"
      );
      delete ui["cu:f"];
      ui["cu:q"] = "98765";
      t(rowsOf(h.at("customers")).length === 1, "search by phone");
      for (const k of ["cu:tab", "cu:q", "cu:per"]) delete ui[k];
    },
    (t, h) => {
      const s = store.get();
      const dup = s.customers.find((c) => c.phone);
      let msg = "";
      try {
        ACTIONS["customer.save"](checkCtx(h), {
          name: "Dup",
          phone: dup.phone,
        });
      } catch (e) {
        msg = e.message;
      }
      t(msg.includes("already has"), "phone is unique per workspace");
      const out = ACTIONS["customer.save"](checkCtx(h), {
        name: "New Person",
        phone: "9822001122",
        tags: "VIP, Regular",
      });
      const c = byId(store.get().customers, out.recordId);
      t(c?.tags.length === 2, "new customer added with tags");
      ACTIONS["customer.save"](checkCtx(h), {
        id: c.id,
        name: "New Person Two",
        phone: "9822001122",
      });
      t(
        byId(store.get().customers, c.id).name === "New Person Two",
        "edit keeps the same phone"
      );
    },
  ],
  customer: [
    (t, h) => {
      const s = store.get();
      const c =
        s.customers.find((x) =>
          s.invoices.some((i) => i.customerId === x.id && i.invNumber)
        ) || s.customers[0];
      const f = h.at("customer", { id: c.id });
      const nos = s.invoices
        .filter((i) => i.customerId === c.id)
        .map((i) => i.invNumber || i.piNumber)
        .filter(Boolean);
      t(
        nos.every((n) => f.textContent.includes(n)),
        "timeline lists every invoice of the customer"
      );
      t(
        +f.querySelector("[data-owed]").dataset.owed ===
          h.biz.sel.customerStats(s, c).owed,
        "still due = bills only (customerStats)"
      );
      const ui = h.makeCtx().ui;
      ui["tl:f"] = "invoice";
      const g = h.at("customer", { id: c.id });
      t(
        [...g.querySelectorAll("[data-event]")].every(
          (e) => e.dataset.event === "invoice"
        ),
        "timeline filter shows invoices only"
      );
      delete ui["tl:f"];
    },
  ],
};

export default [
  {
    n: 11,
    area: "Leads",
    id: "leads",
    name: "Leads inbox",
    route: "/w/:slug/leads",
    action: "Assign, open, reply",
    who: "All",
    notes:
      "Every request is a lead: quoted (asked for a price) or booked (took a slot), D59. Reply and Confirm open their sheet from the row; the message icon opens ready messages. Tabs are statuses (D66); type is a filter. Paid = every invoice on the lead approved (D72).",
    render: leadsInbox,
    actions: ACTIONS,
    checks: checks.leads,
  },
  {
    n: 12,
    area: "Leads",
    id: "lead",
    name: "Lead detail",
    route: "/w/:slug/leads/:id",
    action: "Accept / Edit / Reject, or Confirm",
    who: "All",
    notes:
      "Quoted lead: Accept prices it and shares a proforma PI- by Email or SMS; Edit changes the request first; Reject shares a decline (ready message 18, D95). Booked lead: assign a staff member and Confirm (message 10). Replied: the linked proforma and the reply log. Paying is the acceptance (D60–D62). States pick a sample lead when the URL names none.",
    states: [
      ["Quoted lead", (ctx) => leadDetail(ctx, 0)],
      ["Booked lead", (ctx) => leadDetail(ctx, 1)],
      ["Replied", (ctx) => leadDetail(ctx, 2)],
    ],
    actions: ACTIONS,
    checks: checks.lead,
  },
  {
    n: 26,
    area: "Customers",
    id: "customers",
    name: "Customer list",
    route: "/w/:slug/customers",
    action: "Open",
    who: "All",
    notes:
      'An extra (D63). Phone number unique per workspace; hint "Vyapar calls this Party". Still due = bills only; a reply awaiting payment is not money owed (D75).',
    render: customerList,
    actions: ACTIONS,
    checks: checks.customers,
  },
  {
    n: 27,
    area: "Customers",
    id: "customer",
    name: "Customer timeline",
    route: "/w/:slug/customers/:id",
    action: "New invoice",
    who: "All",
    notes:
      "Leads, bookings, invoices, payments and messages as events, not a ledger; My-orders link. New invoice opens the Quick Invoice for this customer.",
    render: customerTimeline,
    actions: CUST_ACTIONS,
    checks: checks.customer,
  },
];
