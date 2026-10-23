/* PAYMENTS: Invoices list, Invoice editor, Overdue, Invoice email, Invoice PDF, Record payment, Approval queue
   (screens-v2 n19–n25). Every figure comes from the business layer; every control acts.
   Exports for other screens: newInvoiceDialogs(ctx, { customerId }) (Quick Invoice, D77) and
   recordPaymentDialog(ctx, invoiceId, id). */
import { biz as B } from "../biz/index.js";
import {
  addDays,
  byId,
  esc,
  fail,
  fmtDate,
  fmtLong,
  fmtTime,
  inr,
  nextId,
  sum,
} from "../core/util.js";
import { call } from "../ui/actions.js";
import {
  I,
  C,
  M,
  chip,
  pill,
  link,
  modal,
  page,
  toolbar,
  seg,
  kpis,
  dataTable,
  input,
  textarea,
  radios,
  check,
  flabel,
  hint,
  select,
  qr,
  empty,
  shareBody,
} from "../ui/kit.js";
import { app, bizLogo, bizMark } from "../ui/shell.js";

/* ---------- helpers ---------- */
const CH = { email: "Email", sms: "SMS", whatsapp: "WhatsApp" };
const CHANNELS = ["email", "sms", "whatsapp"];
const custOf = (s, id) => byId(s.customers, id) || { name: "Unknown customer" };
const ownerOf = (s) => s.members.find((m) => m.role === "owner");
const firstName = (n) => String(n || "").split(" ")[0];
const nameOf = (s, id) => byId(s.members, id)?.name || "";
const digits = (p) => String(p || "").replace(/\D/g, "");
const json = (o) => esc(JSON.stringify(o));
const stOf = (s, inv) =>
  inv.cancelled ? "cancelled" : B.invoices.statusOf(s, inv);
const noOf = (inv) => inv.invNumber || inv.piNumber || "";
/* The next number of a series, without taking it. */
const nextNo = (s, series) =>
  B.invoices.takeNumber(
    {
      meta: s.meta,
      workspace: { numbering: structuredClone(s.workspace.numbering) },
    },
    series
  );
const paidOn = (s, inv) =>
  B.invoices
    .paymentsOf(s, inv)
    .filter((p) => p.status === "approved")
    .map((p) => p.decidedAt || "")
    .sort()
    .pop() || "";
const kindLabel = (inv) =>
  inv.invNumber ? "Tax invoice" : B.invoices.KIND[inv.kind] || inv.kind;
/* "Due Wed 28 Oct" / "Pay by Sat 31 Oct" / "Paid Mon 19 Oct" */
const dateLine = (s, inv) => {
  const st = stOf(s, inv);
  if (st === "paid") return `Paid ${fmtDate(paidOn(s, inv))}`;
  if (B.invoices.isReplyLike(inv))
    return inv.payBy
      ? `${st === "expired" ? "Expired" : "Pay by"} ${fmtDate(inv.payBy)}`
      : "—";
  return inv.dueDate ? `Due ${fmtDate(inv.dueDate)}` : "—";
};
/* Form lines arrive as strings: the same normalising the business layer does. */
const flag = (v, d) =>
  v === undefined || v === "" ? d : v === true || v === "true" || v === "on";
const norm = (lines = []) =>
  lines
    .filter((l) => l && !flag(l.remove, false))
    .map(({ remove, ...l }) => ({
      ...l,
      qty: +l.qty || 0,
      rate: +l.rate || 0,
      gst: l.gst === undefined || l.gst === "" ? 0 : +l.gst || 0,
      optional: flag(l.optional, false),
      selected: flag(l.selected, true),
    }));
const lineAmt = (l) => (l.optional && !l.selected ? 0 : l.qty * l.rate);

/* ---------- serial numbers and warranty (D85, D86) ---------- */
const SR = B.serials;
/* Under a line on the document: model and cover always; serial and batch only on the tax invoice (D86). */
const serialMeta = (s, inv, l, cls = "text-caption text-customer-muted") => {
  if (!SR.on(s) || !l.tracked) return "";
  const parts = [esc(SR.modelText(l))];
  if (inv.invNumber && l.serial)
    parts.push(
      `S/N <span class="code">${esc(l.serial)}</span>${l.batch ? ` · Batch <span class="code">${esc(l.batch)}</span>` : ""}`
    );
  const txt = parts.filter(Boolean);
  return txt.length
    ? `<div class="${cls}" data-serial-meta>${txt.join(" · ")}</div>`
    : "";
};
/* One entry per unit of every tracked line (a line of qty 5 has five). */
const unitsOf = (inv) => {
  const out = [];
  inv.lines.forEach((l, i) => {
    if (!l.tracked || (l.optional && !l.selected)) return;
    const q = Math.max(0, Math.round(l.qty || 0));
    for (let k = 0; k < q; k++)
      out.push({
        line: i,
        name: l.name,
        model: l.model,
        trackBatch: l.trackBatch,
        serial: q === 1 ? l.serial || "" : "",
        batch: q === 1 ? l.batch || "" : "",
        cover: l.cover || "",
        coverMonths: l.coverMonths || "",
      });
  });
  return out;
};
/* Units as typed (draft) or as filled from a list or a scan, over the invoice's own. */
const draftUnits = (ctx, inv, typed) => {
  const d = typed || ctx.ui.sr?.units || ctx.ui.srData?.units;
  return unitsOf(inv).map((u, k) => {
    const x = d?.[k];
    if (!x) return u;
    return {
      ...u,
      serial: String(x.serial ?? u.serial).trim(),
      batch: String(x.batch ?? u.batch).trim(),
      cover: x.cover ?? u.cover,
      coverMonths: x.coverMonths ?? u.coverMonths,
    };
  });
};
const SERIAL_KEYS = [
  "tracked",
  "model",
  "modelNo",
  "cover",
  "coverMonths",
  "trackBatch",
  "serial",
  "batch",
  "card",
];
const COVER_OPTS = [
  ["", "None"],
  ["warranty", "Warranty"],
  ["guarantee", "Guarantee"],
];
function serialPanel(ctx, inv) {
  const units = draftUnits(ctx, inv);
  const done = units.filter((u) => u.serial).length;
  const anyBatch = units.some((u) => u.trackBatch);
  const head = [
    "#",
    "Item",
    "Serial number",
    ...(anyBatch ? ["Batch / lot"] : []),
    "Cover",
    "Months",
  ];
  const rows = units
    .map(
      (
        u,
        k
      ) => `<tr data-unit="${k}"><td class="td text-muted-foreground">${k + 1}</td><td class="td"><div class="font-medium">${esc(u.name)}</div>${u.model ? `<div class="text-caption text-muted-foreground">${esc(u.model)}</div>` : ""}<input type="hidden" name="units[${k}][line]" value="${u.line}" /></td>
      <td class="td">${input(`units[${k}][serial]`, { id: `sr-s${k}`, value: u.serial, cls: "h-control-sm code min-w-36", placeholder: "Not entered", attrs: { "aria-label": `Serial number, unit ${k + 1}` } })}</td>
      ${anyBatch ? `<td class="td">${u.trackBatch ? input(`units[${k}][batch]`, { id: `sr-b${k}`, value: u.batch, cls: "h-control-sm code w-28", placeholder: "Optional", attrs: { "aria-label": `Batch or lot, unit ${k + 1}` } }) : '<span class="text-caption text-muted-foreground">—</span>'}</td>` : ""}
      <td class="td">${select(`units[${k}][cover]`, COVER_OPTS, u.cover, { id: `sr-c${k}`, cls: "h-control-sm w-32", label: `Cover, unit ${k + 1}` })}</td>
      <td class="td">${input(`units[${k}][coverMonths]`, { id: `sr-m${k}`, type: "number", min: 0, money: true, value: u.coverMonths, cls: "h-control-sm w-16 text-right", attrs: { "aria-label": `Months, unit ${k + 1}` } })}</td></tr>`
    )
    .join("");
  return `<form data-do="saveSerials" data-draft="sr" data-a-id="${esc(inv.id)}" class="card p-card-sm max-w-2xl mx-auto mb-4" data-serial-panel>
    <button type="submit" name="then" value="scan" class="sr-only" tabindex="-1">Next</button>
    <div class="flex items-center gap-2"><h2 class="text-title font-semibold">Serial numbers</h2><span class="ml-auto text-caption text-muted-foreground" data-serial-count>${done} of ${units.length} entered</span></div>
    <p class="hint">One row per unit: saving splits a line of qty 5 into 5 rows of 1, amounts unchanged (D86). Serials can be added later, even after payment. A serial can be used once in your business (D85).</p>
    <label class="mt-3 field flex items-center gap-2">${I("scan-barcode", "size-icon text-muted-foreground")}<input name="scan" id="sr-scan" class="min-w-0 flex-1 bg-transparent outline-none code" placeholder="Scan a barcode or type a serial, then Enter" autocomplete="off" aria-label="Scan or type a serial" /></label>
    <div class="mt-3 overflow-x-auto rounded-control border border-border"><table class="w-full border-collapse"><thead class="bg-muted"><tr>${head.map((x) => `<th class="th">${x}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>
    <details class="mt-3"><summary class="cursor-pointer font-medium">Paste a list</summary><div class="mt-2">${textarea("paste", { id: "sr-paste", rows: 3, placeholder: "One serial per line, or separated by commas. Fills the empty rows in order." })}<div class="mt-2 flex justify-end"><button type="submit" name="then" value="fill" class="btn btn-outline btn-sm">${I("list-plus")}Fill empty rows</button></div></div></details>
    <div class="mt-3 flex gap-2 justify-end"><button type="button" class="btn btn-ghost" data-do="closeSerials">Cancel</button><button type="submit" name="then" value="save" data-need="write" class="btn btn-primary">${I("check")}Save serials</button></div>
  </form>`;
}
function serialAside(ctx, inv) {
  const s = ctx.s;
  if (!SR.on(s) || inv.cancelled || !SR.trackedUnits(inv)) return "";
  const all = SR.trackedUnits(inv);
  const miss = SR.missing(inv);
  const cards = inv.lines.filter((l) => l.tracked && l.serial && l.card);
  return `<div data-serials><p class="label mb-1">Serial numbers</p><div class="rounded-control border border-border p-2 space-y-2"><div class="flex items-center gap-2">${miss ? pill("no_serial") : `<span class="pill bg-success-soft text-success">${I("circle-check", "size-icon-sm")}All entered</span>`}<span class="text-caption text-muted-foreground">${all - miss} of ${all}</span><button type="button" data-need="write" class="ml-auto btn btn-outline btn-sm" data-do="openSerials">${I("scan-barcode", "size-icon-sm")}${miss ? "Enter" : "Edit"}</button></div>
    ${cards.length ? `<ul class="space-y-1" data-cards>${cards.map((l) => `<li><a ${link("p-warranty", { id: l.card })} class="flex items-center gap-1.5 hover:underline">${I("shield-check", "size-icon-sm text-muted-foreground")}<span class="code">${esc(l.serial)}</span><span class="ml-auto text-caption text-muted-foreground">Warranty card</span></a></li>`).join("")}</ul>` : `<p class="text-caption text-muted-foreground">Each row gets a warranty card once it has a serial (D86).</p>`}</div></div>`;
}

/* Totals rows with GST labels from the lines' own rates. */
function totalsOf(s, x) {
  const t = B.invoices.totals(s, x);
  const rates = [
    ...new Set(x.lines.filter((l) => lineAmt(l) > 0).map((l) => l.gst ?? 0)),
  ];
  const g = rates.length === 1 ? rates[0] : null;
  const rows = [];
  if (t.discount)
    rows.push(["Subtotal", t.subtotal], ["Discount", -t.discount]);
  rows.push(["Taxable", t.subtotal - t.discount]);
  if (t.gstOn && t.tax) {
    if (t.igst) rows.push([`IGST${g === null ? "" : ` ${g}%`}`, t.igst]);
    else
      rows.push(
        [`CGST${g === null ? "" : ` ${g / 2}%`}`, t.cgst],
        [`SGST${g === null ? "" : ` ${g / 2}%`}`, t.sgst]
      );
  }
  return { t, rows, g };
}

/* A ready message for an invoice, filled from the data. amount: the figure the message quotes. */
function messageFor(s, inv, templateId, channel, amount) {
  const t = B.messages.template(s, templateId);
  const vars = B.messages.varsFor(s, { invoice: { ...inv, _total: amount } });
  const o = ownerOf(s);
  return {
    to: B.messages.addressOf(custOf(s, inv.customerId), channel),
    subject: t.subject
      ? B.messages.fill(t.subject, vars)
      : `${t.name} · ${s.workspace.name}`,
    body: B.messages.fill(t.body, vars),
    from: s.workspace.name,
    replyTo: o?.email || "",
    vars,
  };
}
const lastReminder = (inv) => {
  const r = (inv.reminders || []).at(-1);
  return r
    ? `${fmtDate(r.at)} · message ${r.templateId} · ${CH[r.channel] || r.channel}`
    : "None yet";
};
const sendLabel = (ch) =>
  ch === "email" ? `${I("send")}Send email` : `${I("copy")}Copy for ${CH[ch]}`;
const chOf = (ctx, key) =>
  CHANNELS.includes(ctx.ui[key]) ? ctx.ui[key] : "email";

/* ---------- invoice document (same blocks as v2 doc()): editor, portal and email preview ---------- */
function invDoc(s, inv, o = {}) {
  const x = {
    ...inv,
    lines: o.lines || inv.lines,
    discount: o.discount ?? inv.discount,
  };
  const { t, rows } = totalsOf(s, x);
  const c = custOf(s, inv.customerId);
  const rl = B.invoices.isReplyLike(inv);
  const kind = inv.cancelled
    ? "Cancelled"
    : inv.sharedAt
      ? B.invoices.docKind(inv)
      : "Draft";
  const no = noOf(inv) || "Not numbered";
  const ver = inv.version > 1 ? ` · version ${inv.version}` : "";
  const sub = inv.sharedAt
    ? `${fmtDate(inv.sharedAt)} · ${dateLine(s, inv)}${ver}`
    : `${inv.jobId ? "From the job" : "Created"} · ${fmtDate(inv.createdAt)}`;
  const [rightLabel, right] = c.gstin
    ? ["GSTIN", C(c.gstin)]
    : rl
      ? [
          "Pay by",
          inv.payBy
            ? fmtDate(inv.payBy)
            : `${s.workspace.replyValidDays} days after sharing`,
        ]
      : [
          "Due",
          inv.dueDate
            ? fmtDate(inv.dueDate)
            : `${s.workspace.billDueDays} days after issue`,
        ];
  const extra =
    inv.sharedAt && !inv.invNumber && !inv.cancelled
      ? `<div class="px-4 @tab:px-8 py-2 text-caption text-customer-muted border-b border-customer-border">Proforma: not a tax invoice. The tax invoice follows once your payment is approved.</div>`
      : "";
  const gst = t.gstOn;
  return `<div class="doc font-customer w-full max-w-2xl mx-auto bg-customer-surface text-customer-text rounded-card border border-customer-border shadow-md overflow-hidden" data-doc="${esc(inv.id)}">
    <div class="bg-biz text-biz-foreground px-4 @tab:px-8 py-5 flex items-start gap-3"><span class="bg-customer-surface text-customer-text rounded-control px-2 py-1">${bizLogo(s, "h-6")}</span>
      <div class="ml-auto text-right"><div class="text-label uppercase tracking-wider">${kind}</div><div class="text-title font-semibold">${esc(no)}</div><div class="text-caption">${sub}</div></div></div>
    <div class="px-4 @tab:px-8 py-4 grid grid-cols-2 gap-4 border-b border-customer-border"><div><div class="text-label uppercase tracking-wider text-customer-muted">Bill to</div><div class="mt-0.5 font-semibold">${esc(c.name)}</div><div class="text-caption text-customer-muted">${esc(c.address || c.phone || "")}</div></div>
      <div class="text-right"><div class="text-label uppercase tracking-wider text-customer-muted">${rightLabel}</div><div class="mt-0.5 font-semibold">${right}</div></div></div>
    ${extra}
    <div class="px-4 @tab:px-8 overflow-x-auto"><table class="w-full border-collapse"><thead><tr class="bg-biz-soft text-biz">${["Item", "Qty", "Rate", ...(gst ? ["GST"] : []), "Amount"].map((h, i) => `<th class="h-row-sm px-2 text-label uppercase tracking-wider font-semibold ${i === 0 ? "text-left" : "text-right"} ${h === "Rate" || h === "GST" ? "hidden @tab:table-cell" : ""}">${h}</th>`).join("")}</tr></thead><tbody>
      ${
        x.lines.length
          ? x.lines
              .map(
                (
                  l
                ) => `<tr class="border-b border-customer-border"><td class="py-2 px-2"><div class="font-medium flex flex-wrap items-center gap-1.5">${esc(l.name || "Unnamed line")}${l.optional ? `<span class="text-label uppercase tracking-wider px-1.5 rounded-xs bg-customer-page text-customer-muted">${l.selected ? "Optional, selected" : "Optional"}</span>` : ""}</div>${l.desc ? `<div class="text-caption text-customer-muted">${esc(l.desc)}</div>` : ""}${serialMeta(s, inv, l)}</td>
        <td class="px-2 text-right money">${l.qty}</td><td class="hidden @tab:table-cell px-2 text-right money">${inr(l.rate)}</td>${gst ? `<td class="hidden @tab:table-cell px-2 text-right money">${l.gst ?? 0}%</td>` : ""}<td class="px-2 text-right money ${l.optional && !l.selected ? "text-customer-muted line-through" : ""}">${inr(l.qty * l.rate)}</td></tr>`
              )
              .join("")
          : `<tr><td class="py-4 px-2 text-customer-muted" colspan="5">No lines yet.</td></tr>`
      }
    </tbody></table></div>
    <div class="px-4 @tab:px-8 py-4 flex justify-end"><div class="w-full @tab:w-64 space-y-1">${rows.map((r) => `<div class="flex justify-between"><span class="text-customer-muted">${r[0]}</span>${M(r[1])}</div>`).join("")}
      <div class="flex justify-between items-baseline pt-2 mt-1 border-t border-customer-text font-semibold"><span>Total</span><span class="font-mono text-money-lg" data-total>${inr(t.total)}</span></div></div></div>
  </div>`;
}

/* ---------- shared dialogs ---------- */
/* Share an invoice (ready message 4 / 5 for a reply, 12 for a bill), channel tabs, then invoices.share. */
function shareDialog(ctx, id, inv, title = "Request payment") {
  const s = ctx.s;
  if (!inv)
    return modal(
      id,
      title,
      `<p class="text-muted-foreground">Pick an invoice first.</p>`
    );
  const key = `${id}:ch`;
  const ch = chOf(ctx, key);
  const rl = B.invoices.isReplyLike(inv);
  const T = B.messages.T;
  const tpl = rl
    ? inv.sharedAt
      ? T.replyRevised
      : T.replyShared
    : T.invoiceShared;
  const x = {
    ...inv,
    piNumber: inv.piNumber || nextNo(s, "PI"),
    payBy:
      rl && !inv.payBy
        ? addDays(ctx.today, s.workspace.replyValidDays || 15)
        : inv.payBy,
    dueDate:
      !rl && !inv.dueDate
        ? addDays(ctx.today, s.workspace.billDueDays || 7)
        : inv.dueDate,
  };
  const total = B.invoices.total(s, x);
  const msg = messageFor(s, x, tpl, ch, total);
  const c = custOf(s, inv.customerId);
  return modal(
    id,
    inv.sharedAt ? title : "Issue and request payment",
    `<p class="text-muted-foreground">${C(noOf(x))} to ${esc(c.name)} · ${M(total)}${inv.sharedAt ? "" : " · gives the next proforma number (D71)"}</p>
    <form data-do="invoices.share" data-a-id="${esc(inv.id)}">${shareBody(ctx, key, msg)}
      <p class="hint">Ready message ${tpl}. Edit wording in Settings → Messages.</p>
      <div class="mt-4 flex flex-wrap gap-2 justify-end"><button type="button" class="btn btn-ghost" data-close>Cancel</button><a ${link("invoice-pdf", { id: inv.id })} class="btn btn-outline">${I("file-down")}PDF</a><button type="submit" data-need="write" class="btn btn-primary">${sendLabel(ch)}</button></div>
    </form>`
  );
}

/* Remind an overdue bill (13 up to 6 days, 14 from day 7, D64) or follow up a reply (6, D75). */
function remindDialog(ctx, id, inv, title = "Remind") {
  const s = ctx.s;
  if (!inv)
    return modal(
      id,
      title,
      `<p class="text-muted-foreground">Nothing to remind.</p>`
    );
  const key = `${id}:ch`;
  const ch = chOf(ctx, key);
  const T = B.messages.T;
  const rl = B.invoices.isReplyLike(inv);
  const days = B.invoices.daysOverdue(s, inv);
  const tpl = rl
    ? T.replyFollowUp
    : days <= 6
      ? T.reminderEarly
      : T.reminderLate;
  const amount = B.invoices.open(s, inv);
  const msg = messageFor(s, inv, tpl, ch, amount);
  const c = custOf(s, inv.customerId);
  return modal(
    id,
    rl ? "Follow up" : days <= 6 ? "Remind: gentle" : "Remind: overdue",
    `<p class="text-muted-foreground">${C(noOf(inv))} · ${esc(c.name)} · ${M(amount)} · ${rl ? `expired ${fmtDate(inv.payBy)}` : `${days} days overdue`} · last: ${esc(lastReminder(inv))}</p>
    <form data-do="invoices.remind" data-a-id="${esc(inv.id)}">${shareBody(ctx, key, msg)}
      <p class="hint">Ready message ${tpl}${rl ? " (follow-up; a reply is never overdue, D75)" : days <= 6 ? " (up to 6 days overdue, D64)" : " (from day 7, D64)"}.</p>
      <div class="mt-4 flex flex-wrap gap-2 justify-end"><button type="button" class="btn btn-ghost" data-close>Cancel</button><a ${link("invoice-email", { id: inv.id })} class="btn btn-outline">${I("eye")}Invoice email</a><button type="submit" data-need="write" class="btn btn-primary">${sendLabel(ch)}</button></div>
    </form>`
  );
}

/* Record payment / upload proof. Proof required for UPI and bank (Design inputs). Approve now only when the
   Owner is the only approver for the amount (D74). o: { open, after } */
export function recordPaymentDialog(ctx, invoiceId, id = "record-pay", o = {}) {
  const s = ctx.s;
  const inv = byId(s.invoices, invoiceId || ctx.ui[`${id}:id`]);
  if (!inv)
    return modal(
      id,
      "Record payment",
      `<p class="text-muted-foreground">Pick an invoice to record a payment against.</p>`,
      o.open
    );
  const c = custOf(s, inv.customerId);
  const pend = sum(B.invoices.pendingOf(s, inv), (p) => p.amount);
  const room = Math.max(0, B.invoices.open(s, inv) - pend);
  const p = B.payments.payable(s, inv);
  const dk = `rp:${id}:${inv.id}`;
  const d = ctx.ui[dk] || {};
  const method = d.method || o.method || "upi";
  const amount = d.amount ?? String(room);
  const amt = +amount || 0;
  const needProof = method === "upi" || method === "bank";
  const ap = B.payments.approvers(s, { amount: amt });
  const sole =
    ctx.role === "owner" &&
    ap.length > 0 &&
    ap.every((m) => m.id === ctx.memberId);
  const approveNow = sole && d.approveNow === true;
  const own = ownerOf(s);
  const pv = `${id}-proof-name`;
  const ok = p.ok && room > 0;
  return modal(
    id,
    "Record payment",
    `<p class="text-muted-foreground">${C(noOf(inv) || "Draft")} · ${esc(c.name)} · ${M(room)} due${pend ? ` · ${M(pend)} already waiting for approval` : ""}</p>
    ${p.ok ? "" : `<p class="mt-3 flex gap-1.5 p-2 rounded-control bg-destructive text-destructive-foreground">${I("circle-x", "size-icon-sm mt-0.5")}${esc(p.reason)}</p>`}
    ${p.ok && !room ? `<p class="mt-3 flex gap-1.5 p-2 rounded-control bg-muted">${I("info", "size-icon-sm mt-0.5")}Nothing is left to record: payments waiting for approval cover the open balance.</p>` : ""}
    ${p.warning ? `<p class="mt-3 flex gap-1.5 p-2 rounded-control bg-warning-soft text-warning">${I("triangle-alert", "size-icon-sm mt-0.5")}${esc(p.warning)} (D73)</p>` : ""}
    <form data-do="payments.recordNow" data-draft="${esc(dk)}" data-a-invoice-id="${esc(inv.id)}" ${o.after ? `data-after="${o.after}"` : ""}>
      <div class="mt-3 grid grid-cols-2 gap-3"><div>${flabel("Amount", true, `${id}-amount`)}${input("amount", { id: `${id}-amount`, type: "number", money: true, value: amount, min: 1, max: room || undefined, req: true })}</div><div><p class="flabel">Paid on</p><div class="field">${fmtDate(ctx.today)}</div></div></div>
      <p class="flabel mt-3">Method</p>${radios(
        "method",
        Object.entries(B.payments.METHODS).map(([k, v]) => [
          k,
          k === "bank" ? "Bank" : v,
        ]),
        method,
        { label: "Method" }
      )}
      <div class="mt-3">${flabel(method === "upi" ? "UPI reference" : method === "bank" ? "Bank reference" : "Reference", false, `${id}-ref`)}${input("reference", { id: `${id}-ref`, cls: "code", value: d.reference || "", placeholder: method === "cash" ? "Optional" : "Transaction or UTR number" })}</div>
      <p class="flabel mt-3">Proof ${needProof ? '<span class="text-destructive">*</span>' : '<span class="font-normal text-muted-foreground">(optional)</span>'}</p>
      <label class="flex items-center gap-2 p-2 rounded-control border border-border cursor-pointer hover:bg-muted">${I("file-image", "size-icon text-muted-foreground")}<span id="${pv}" class="font-medium truncate">${esc(d.proof?.name || "Choose a screenshot or receipt")}</span><span class="ml-auto text-caption text-muted-foreground">${I("upload", "size-icon-sm")}</span><input type="file" name="proof" accept="image/*,application/pdf" class="sr-only" data-preview="#${pv}" ${d.proof ? `data-keep="${json(d.proof)}"` : ""} /></label>
      ${needProof ? "" : hint(`${B.payments.METHODS[method]}: proof is optional (Design inputs.md:180).`)}
      <p class="mt-3 flex gap-1.5 text-muted-foreground">${I("info", "size-icon-sm mt-0.5")}Shown as received once ${esc(firstName(own?.name) || "the Owner")} approves. More than the open balance cannot be approved (D76).</p>
      ${sole ? `<div class="mt-3 flex items-start gap-2 p-2 rounded-control bg-muted">${check("approveNow", approveNow, { label: "Approve now" })}<span>Approve now<span class="block text-caption text-muted-foreground">Only you can approve this amount, so you may approve your own upload. Logged as self-approved (D74).</span></span></div>` : ""}
      <div class="mt-4 flex gap-2 justify-end"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="submit" data-need="record" class="btn btn-primary" ${ok ? "" : "disabled"}>${approveNow ? `${I("circle-check")}Record and approve` : `${I("send")}Submit for approval`}</button></div>
    </form>`,
    o.open
  );
}

/* ---------- Quick Invoice (D77): one sheet from Today, Invoices or a customer ---------- */
export function newInvoiceDialogs(ctx, { customerId } = {}) {
  const s = ctx.s;
  const ui = ctx.ui;
  /* State is keyed by the next invoice id, so it starts fresh after each invoice. */
  const P = `qi-${nextId(s, "I")}:`;
  const d = ui[`${P}form`] || {};
  const custId = ui[`${P}cust`] ?? customerId ?? "";
  const c = custId ? byId(s.customers, custId) : null;
  let lines = [];
  try {
    lines = JSON.parse(ui[`${P}lines`] || "[]");
  } catch {}
  const setLines = (next) => `data-ui="${P}lines" data-v="${json(next)}"`;
  const eff = lines.map((l) =>
    l.custom ? { ...l, name: d.cname || "", rate: +d.crate || 0 } : l
  );
  const x = norm(eff);
  const { t, rows } = totalsOf(s, {
    lines: x,
    discount: 0,
    customerId: custId,
  });

  /* customer */
  const q = String(d.q || "").trim();
  const qd = digits(q);
  const hits = q
    ? s.customers
        .filter(
          (k) =>
            k.name.toLowerCase().includes(q.toLowerCase()) ||
            (qd.length >= 3 && digits(k.phone).includes(qd))
        )
        .slice(0, 5)
    : [];
  const isNew =
    qd.length >= 10 &&
    !hits.some((k) => digits(k.phone).endsWith(qd.slice(-10)));
  const recent = [
    ...new Set(
      [...B.invoices.live(s)]
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .map((i) => i.customerId)
    ),
  ]
    .slice(0, 3)
    .map((id) => byId(s.customers, id))
    .filter(Boolean);
  const pick = (k) =>
    `<button type="button" class="chip hover:bg-muted" data-ui="${P}cust" data-v="${esc(k.id)}">${esc(k.name)}</button>`;
  const custBlock = c
    ? `<div class="field">${I("search", "size-icon-sm text-muted-foreground")}<span class="font-medium">${esc(c.name)}</span>${c.phone ? `<span class="code text-muted-foreground">${esc(c.phone)}</span>` : ""}<button type="button" class="ml-auto btn btn-ghost btn-sm btn-icon" data-ui="${P}cust" data-v="" aria-label="Change customer">${I("x", "size-icon-sm")}</button></div><input type="hidden" name="customerId" value="${esc(c.id)}" />`
    : `${input("q", { id: "qi-q", value: d.q || "", placeholder: "Name or phone number", attrs: { "aria-label": "Customer name or phone" } })}
      ${hits.length ? `<div class="mt-1.5 flex flex-wrap gap-1.5"><span class="text-caption text-muted-foreground">Found:</span>${hits.map(pick).join("")}</div>` : ""}
      ${isNew ? `<div class="mt-2 grid grid-cols-2 gap-2"><div class="field money">${esc(q)}</div>${input("name", { id: "qi-name", value: d.name || "", placeholder: "Name of the new customer", attrs: { "aria-label": "New customer name" } })}</div><input type="hidden" name="phone" value="${esc(q)}" /><p class="hint">A new phone number adds a customer.</p>` : ""}`;
  const last = c
    ? B.invoices
        .ofCustomer(s, c.id)
        .sort((a, b) =>
          String(b.createdAt).localeCompare(String(a.createdAt))
        )[0]
    : null;
  const lastBtn = last
    ? `<button type="button" class="mt-3 w-full flex items-center gap-2 p-2 rounded-control border border-dashed border-border hover:bg-muted text-left" ${setLines(
        last.lines.map((l) => ({
          itemId: l.itemId || null,
          name: l.name,
          desc: l.desc || "",
          unit: l.unit || null,
          qty: l.qty,
          rate: l.rate,
          gst: l.gst ?? 0,
        }))
      )}>${I("repeat", "size-icon-sm text-muted-foreground")}<span><span class="font-medium">Same as last time</span><span class="block text-caption text-muted-foreground">${esc(last.lines.map((l) => l.name).join(" + "))} · ${inr(B.invoices.total(s, last))} · ${noOf(last) ? C(noOf(last)) : "Draft"} · ${fmtDate(last.createdAt)}</span></span></button>`
    : "";

  /* items */
  const items = B.catalog.visibleItems(s);
  const chips = items
    .map((it) => {
      const on = lines.some((l) => l.itemId === it.id);
      return `<button type="button" class="chip ${on ? "bg-accent text-accent-foreground" : "hover:bg-muted"}" aria-pressed="${on}" data-item="${esc(it.id)}" ${setLines(on ? lines.filter((l) => l.itemId !== it.id) : [...lines, B.invoices.lineFromItem(it, 1)])}>${I(on ? "check" : "plus", "size-icon-sm")}${esc(it.name)} · ${inr(it.price)}</button>`;
    })
    .join("");
  const anyOn = lines.some((l) => l.custom);
  const anyChip = `<button type="button" class="chip ${anyOn ? "bg-accent text-accent-foreground" : "hover:bg-muted"}" aria-pressed="${anyOn}" ${setLines(anyOn ? lines.filter((l) => !l.custom) : [...lines, { custom: true, itemId: null, name: "", qty: 1, rate: 0, gst: B.invoices.gstFor(s, {}) }])}>${I("pencil", "size-icon-sm")}Any amount</button>`;
  const qtyBtn = (i, dlt, label, ic) => {
    const next = lines
      .map((l, k) => (k === i ? { ...l, qty: (+l.qty || 0) + dlt } : l))
      .filter((l) => l.qty > 0);
    return `<button type="button" class="btn btn-outline btn-sm btn-icon" aria-label="${label}" ${setLines(next)}>${I(ic, "size-icon-sm")}</button>`;
  };
  const lineRows = lines.length
    ? `<div class="mt-2 rounded-control border border-border divide-y divide-border">${lines
        .map((l, i) => {
          const e = x[i];
          return `<div class="flex items-center gap-2 px-3 h-row">${
            l.custom
              ? `<span class="flex-1 min-w-0 flex gap-2">${input("cname", { id: "qi-cname", value: d.cname || "", placeholder: "What for", cls: "h-control-sm", attrs: { "aria-label": "Line name" } })}${input("crate", { id: "qi-crate", type: "number", money: true, min: 0, value: d.crate || "", placeholder: "₹", cls: "h-control-sm w-24", attrs: { "aria-label": "Amount" } })}</span>`
              : `<span class="flex-1 min-w-0 truncate">${esc(l.name)}</span>`
          }<span class="inline-flex items-center gap-1">${qtyBtn(i, -1, "Less", "minus")}<span class="w-6 text-center money" data-qty>${l.qty}</span>${qtyBtn(i, 1, "More", "plus")}</span><span class="w-20 text-right">${M(e.qty * e.rate)}</span></div>`;
        })
        .join("")}</div>`
    : `<p class="mt-2 text-caption text-muted-foreground">Tap items to add them, or Any amount.</p>`;
  const hidden = x
    .map((l, i) =>
      ["itemId", "name", "desc", "unit", "qty", "rate", "gst"]
        .map(
          (k) =>
            `<input type="hidden" name="lines[${i}][${k}]" value="${esc(l[k] ?? "")}" />`
        )
        .join("")
    )
    .join("");
  const dueOpts = [
    ["0", "Today"],
    ["7", "7 days"],
    ["15", "15 days"],
  ];
  const dueDef = dueOpts.some((o) => +o[0] === s.workspace.billDueDays)
    ? String(s.workspace.billDueDays)
    : "7";
  const due = ui[`${P}due`] ?? dueDef;
  const body = `<form data-do="invoices.quick" data-draft="${P}form">
    <div><p class="flabel">Customer</p>${custBlock}
      <div class="mt-1.5 flex flex-wrap gap-1.5"><span class="text-caption text-muted-foreground">Recent:</span>${recent.map(pick).join("")}<span class="text-caption text-muted-foreground">· a new phone number adds a customer</span></div></div>
    ${lastBtn}
    <p class="flabel mt-3">Items</p>
    <div class="flex flex-wrap gap-1.5">${chips}${anyChip}</div>
    ${lineRows}${hidden}
    <div class="mt-2 flex justify-end"><div class="w-full @tab:w-56 space-y-1 text-body-sm">${rows
      .filter((r) => r[0] !== "Subtotal")
      .map(
        (r) =>
          `<div class="flex justify-between"><span class="text-muted-foreground">${r[0]}</span>${M(r[1])}</div>`
      )
      .join(
        ""
      )}<div class="flex justify-between font-semibold pt-1 border-t border-border"><span>Total</span><span class="font-mono text-money" data-qi-total>${inr(t.total)}</span></div></div></div>
    <div class="mt-3"><p class="flabel">Due</p>${seg(ctx, `${P}due`, dueOpts, dueDef)}<input type="hidden" name="dueDays" value="${esc(due)}" /></div>
    <p class="hint">Creates ${C(nextNo(s, "PI"))} when it is shared. It becomes tax invoice ${C(`${s.workspace.numbering.INV.prefix}-`)} when the payment is approved (D60, D71).</p>
    <div class="mt-4 flex flex-wrap gap-2 justify-end"><button type="submit" name="mode" value="draft" data-need="write" class="btn btn-ghost">Save draft</button><button type="submit" name="mode" value="paid" data-need="write" class="btn btn-outline" data-then-open="record-new">${I("wallet")}Paid now: record</button><button type="submit" name="mode" value="request" data-need="write" class="btn btn-primary" data-then-open="share-new">${I("indian-rupee")}Request payment · ${inr(t.total)}</button></div>
  </form>`;
  const made = (k) => byId(s.invoices, ui[`${k}:id`]);
  return (
    modal("new-invoice", "New invoice", body) +
    shareDialog(ctx, "share-new", made("share-new"), "Request payment") +
    recordPaymentDialog(ctx, made("record-new")?.id, "record-new", {
      method: "cash",
    })
  );
}

/* ---------- Invoices list ---------- */
const TABS = [
  ["all", "All"],
  ["replies", "Replies"],
  ["bills", "Bills"],
  ["overdue", "Overdue"],
  ["paid", "Paid"],
  ["draft", "Draft"],
];
const inTab = (s, tab, inv) => {
  const st = stOf(s, inv);
  if (tab === "replies") return !inv.cancelled && B.invoices.isReplyLike(inv);
  if (tab === "bills") return !inv.cancelled && !B.invoices.isReplyLike(inv);
  if (["overdue", "paid", "draft"].includes(tab)) return st === tab;
  return true;
};
const listOf = (ctx) =>
  [...ctx.s.invoices]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .filter((inv) => inTab(ctx.s, ctx.ui.tab || "all", inv));

function rowMenu(s, inv) {
  const st = stOf(s, inv);
  const rl = B.invoices.isReplyLike(inv);
  const items = [
    `<a ${link("invoice", { id: inv.id })}>${I("receipt", "size-icon-sm")}Open</a>`,
  ];
  if (!inv.cancelled && !["paid", "expired", "pending"].includes(st))
    items.push(
      `<button type="button" data-need="write" data-open="share-inv" data-open-args="${json({ "share-inv:id": inv.id })}">${I("send", "size-icon-sm")}${inv.sharedAt ? "Share again" : "Share"}</button>`
    );
  if (B.payments.payable(s, inv).ok)
    items.push(
      `<button type="button" data-need="record" data-open="record-pay" data-open-args="${json({ "record-pay:id": inv.id })}">${I("wallet", "size-icon-sm")}Record payment</button>`
    );
  if (st === "overdue" || (rl && ["awaiting", "expired"].includes(st)))
    items.push(
      `<button type="button" data-need="write" data-open="remind-inv" data-open-args="${json({ "remind-inv:id": inv.id })}">${I("bell", "size-icon-sm")}${rl ? "Follow up" : "Remind"}</button>`
    );
  if (!inv.cancelled && B.invoices.paid(s, inv) === 0)
    items.push(
      `<hr /><button type="button" data-need="${inv.sharedAt ? "void" : "write"}" data-do="invoices.cancel" data-a-id="${esc(inv.id)}" class="text-destructive">${I("circle-x", "size-icon-sm")}${inv.sharedAt ? "Cancel (number kept)" : "Delete draft"}</button>`
    );
  return `<details class="dd relative inline-block" data-menu><summary class="btn btn-ghost btn-sm btn-icon" aria-label="More">${I("ellipsis")}</summary><div class="menu right-0 top-full mt-1 w-56">${items.join("")}</div></details>`;
}

function invoicesPage(ctx, extra = "") {
  const s = ctx.s;
  const k = B.sel.kpis(s);
  const due = B.sel
    .owed(s)
    .filter((i) => ["due", "part_paid"].includes(stOf(s, i)))
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
  const replies = B.invoices
    .live(s)
    .filter((i) => B.invoices.isReplyLike(i) && stOf(s, i) === "awaiting");
  const ch = k.paid30.change;
  const rows = listOf(ctx).map((inv) => {
    const c = custOf(s, inv.customerId);
    const st = stOf(s, inv);
    const paid = B.invoices.paid(s, inv);
    return {
      id: inv.id,
      f: st,
      text: `${noOf(inv)} ${c.name} ${c.phone || ""} ${kindLabel(inv)} ${st}`,
      cells: [
        noOf(inv)
          ? C(noOf(inv))
          : '<span class="text-caption text-muted-foreground">Not numbered</span>',
        `<span class="font-medium">${esc(c.name)}</span>`,
        chip(kindLabel(inv)),
        SR.on(s) && !inv.cancelled && SR.missing(inv)
          ? `<span class="inline-flex flex-wrap gap-1">${pill(st)}${pill("no_serial")}</span>`
          : pill(st),
        `<span class="${st === "overdue" ? "text-destructive" : ""}">${dateLine(s, inv)}</span>`,
        paid ? M(paid) : "—",
        M(B.invoices.total(s, inv)),
        rowMenu(s, inv),
      ],
    };
  });
  const firstPayable = s.invoices.find(
    (i) =>
      B.payments.payable(s, i).ok &&
      B.invoices.open(s, i) > sum(B.invoices.pendingOf(s, i), (p) => p.amount)
  );
  const dialogs =
    newInvoiceDialogs(ctx) +
    shareDialog(ctx, "share-inv", byId(s.invoices, ctx.ui["share-inv:id"])) +
    recordPaymentDialog(
      ctx,
      ctx.ui["record-pay:id"] || firstPayable?.id,
      "record-pay"
    ) +
    remindDialog(ctx, "remind-inv", byId(s.invoices, ctx.ui["remind-inv:id"])) +
    extra;
  return app(
    ctx,
    "invoices",
    {
      icon: "receipt",
      title: "Invoices",
      fab: `${I("plus")}New invoice`,
      fabOpen: "new-invoice",
      dialogs,
    },
    page(`
    ${toolbar(seg(ctx, "tab", TABS, "all"), `<button type="button" data-need="export" class="btn btn-outline" data-do="exportCsv">${I("download")}Export CSV</button><button type="button" data-need="write" class="btn btn-primary" data-open="new-invoice">${I("plus")}New invoice</button>`)}
    ${kpis([
      {
        icon: "clock",
        t: "Due",
        sub: `${due.length} bills`,
        v: inr(sum(due, (i) => B.invoices.open(s, i))),
        foot: due.length
          ? `Next due ${fmtDate(due[0].dueDate)}`
          : "Nothing due",
        icon2: "clock",
        tone: "text-warning",
      },
      {
        icon: "hourglass",
        t: "Waiting for approval",
        sub: `${k.approve.count} proofs`,
        v: inr(k.approve.amount),
        foot: "Approve to mark paid",
        go: "approvals",
      },
      {
        icon: "circle-alert",
        t: "Overdue",
        sub: `${k.overdue.count} bills`,
        v: inr(k.overdue.amount),
        foot: k.overdue.count
          ? `Oldest: ${k.overdue.oldest} days · open the list`
          : "Nothing overdue",
        icon2: "arrow-right",
        tone: "text-destructive",
        go: "overdue",
      },
      {
        icon: "circle-check",
        t: "Paid, last 30 days",
        sub: `${k.paid30.count} payments`,
        v: inr(k.paid30.amount),
        foot:
          ch === null
            ? "Nothing paid the month before"
            : `${ch >= 0 ? "+" : ""}${ch}% vs last month`,
        icon2: ch !== null && ch < 0 ? "trending-down" : "trending-up",
        tone: ch !== null && ch < 0 ? "text-destructive" : "text-success",
      },
    ])}
    ${dataTable(ctx, {
      key: "inv",
      icon: "receipt",
      title:
        TABS.find((x) => x[0] === (ctx.ui.tab || "all"))[0] === "all"
          ? "Invoices"
          : `Invoices · ${TABS.find((x) => x[0] === ctx.ui.tab)[1]}`,
      go: "invoice",
      ph: "Search invoices",
      filters: [
        ["draft", "Draft"],
        ["awaiting", "Awaiting payment"],
        ["due", "Due"],
        ["part_paid", "Part paid"],
        ["overdue", "Overdue"],
        ["pending", "Waiting for approval"],
        ["paid", "Paid"],
        ["expired", "Expired"],
        ["cancelled", "Cancelled"],
      ],
      cols: [
        { t: "Number", role: "sub" },
        { t: "Customer", role: "title" },
        { t: "Kind", web: 1 },
        { t: "Status", role: "status" },
        { t: "Due or pay by", m: 1, web: 1 },
        { t: "Paid", r: 1, m: 1, web: 1 },
        { t: "Total", r: 1, role: "end" },
        { t: "", role: "act" },
      ],
      rows,
    })}
    <p class="text-caption text-muted-foreground">Replies awaiting payment (${inr(sum(replies, (i) => B.invoices.total(s, i)))}) are not counted as money owed; past the pay-by date they turn Expired (D75).</p>`)
  );
}

const listActions = {
  exportCsv: (ctx) => {
    B.perms.need(ctx, "export");
    const s = ctx.s;
    const list = listOf(ctx);
    const head = [
      "Number",
      "Customer",
      "Kind",
      "Status",
      "Due or pay by",
      "Total",
      "Paid",
      "Open",
    ];
    const lines = list.map((inv) => [
      noOf(inv) || "Draft",
      custOf(s, inv.customerId).name,
      kindLabel(inv),
      stOf(s, inv),
      inv.payBy || inv.dueDate || "",
      B.invoices.total(s, inv),
      B.invoices.paid(s, inv),
      B.invoices.open(s, inv),
    ]);
    const csv = [head, ...lines]
      .map((r) =>
        r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `invoices-${ctx.today}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    return { text: `Exported ${list.length} invoices as CSV` };
  },
};

/* ---------- Invoice editor ---------- */
const invOf = (ctx) => {
  const s = ctx.s;
  const id = ctx.params.id;
  return (
    byId(s.invoices, id) ||
    byId(s.invoices, byId(s.payments, id)?.invoiceId) ||
    s.invoices.find((i) => B.invoices.pendingOf(s, i).length) ||
    s.invoices[0]
  );
};
const editBlock = (s, inv) => {
  if (inv.cancelled) return "This invoice is cancelled.";
  if (inv.invNumber || stOf(s, inv) === "paid")
    return "A paid invoice cannot change. Raise a new one.";
  if (B.invoices.pendingOf(s, inv).length)
    return "A payment is waiting for approval. Approve or reject it first.";
  return "";
};

function editor(ctx, inv, lines, discount) {
  const s = ctx.s;
  const items = B.catalog.visibleItems(s);
  const { t } = totalsOf(s, { ...inv, lines: norm(lines), discount });
  const rl = B.invoices.isReplyLike(inv);
  const h = (i, k, v) =>
    `<input type="hidden" name="lines[${i}][${k}]" value="${esc(v ?? "")}" />`;
  return `<form data-do="saveLines" data-draft="ed" data-a-id="${esc(inv.id)}" class="card p-card-sm max-w-2xl mx-auto mb-4">
    <div class="flex items-center gap-2"><h2 class="text-title font-semibold">${inv.sharedAt ? `New version ${inv.version + 1} of ${esc(inv.piNumber)}` : "Edit draft"}</h2><span class="ml-auto font-mono text-money" data-ed-total>${inr(t.total)}</span></div>
    <div class="mt-3 overflow-x-auto rounded-control border border-border"><table class="w-full border-collapse"><thead class="bg-muted"><tr>${["Item", "Qty", "Rate", "Amount", ""].map((x, i) => `<th class="th ${i && i < 4 ? "text-right" : ""}">${x}</th>`).join("")}</tr></thead><tbody>
    ${lines
      .map((l, i) => {
        const n = norm([l])[0];
        return `<tr><td class="td">${input(`lines[${i}][name]`, { id: `ed-n${i}`, value: l.name, cls: "h-control-sm", attrs: { "aria-label": "Item" } })}${h(i, "itemId", l.itemId)}${h(i, "desc", l.desc)}${h(i, "unit", l.unit)}${h(i, "gst", l.gst)}${h(i, "hsn", l.hsn)}${h(i, "optional", n.optional)}${h(i, "selected", n.selected)}${l.tracked ? SERIAL_KEYS.map((k) => h(i, k, l[k])).join("") + serialMeta(s, { invNumber: "x" }, l, "mt-1 text-caption text-muted-foreground") : ""}</td>
        <td class="td text-right">${input(`lines[${i}][qty]`, { id: `ed-q${i}`, type: "number", min: 0, value: l.qty, money: true, cls: "h-control-sm w-16 text-right", attrs: { "aria-label": "Quantity", ...(l.tracked && l.serial ? { readonly: true, title: "One unit: this row has a serial number" } : {}) } })}</td>
        <td class="td text-right">${input(`lines[${i}][rate]`, { id: `ed-r${i}`, type: "number", min: 0, value: l.rate, money: true, cls: "h-control-sm w-24 text-right", attrs: { "aria-label": "Rate" } })}</td>
        <td class="td text-right">${M(lineAmt(n))}</td>
        <td class="td text-right"><label class="btn btn-ghost btn-sm btn-icon cursor-pointer" title="Remove line"><input type="checkbox" class="sr-only" name="lines[${i}][remove]" />${I("trash-2", "size-icon-sm")}<span class="sr-only">Remove line</span></label></td></tr>`;
      })
      .join("")}</tbody></table></div>
    <div class="mt-2 grid grid-cols-2 gap-3"><div>${select("add", [["", "Add a line from the catalog"], ...items.map((it) => [it.id, `${it.name} · ${inr(it.price)}`])], "", { id: "ed-add", label: "Add a line from the catalog" })}</div>
      <div class="flex items-center gap-2"><label class="flabel mb-0" for="ed-disc">Discount</label>${input("discount", { id: "ed-disc", type: "number", min: 0, money: true, value: discount ?? 0, cls: "flex-1" })}</div></div>
    <p class="hint">${inv.sharedAt ? `Saving makes version ${inv.version + 1} under the same number (D60)${rl ? ", with a new pay-by date (D75)" : ""}. Share it again to send ready message ${rl ? 5 : 12}. A payment made on an older version applies to the latest (D76).` : "A draft is not numbered; sharing gives it the next proforma number (D71)."}</p>
    <div class="mt-3 flex gap-2 justify-end"><button type="button" class="btn btn-ghost" data-do="cancelEdit">Cancel</button><button type="submit" data-need="write" class="btn btn-primary">${I("check")}${inv.sharedAt ? `Save version ${inv.version + 1}` : "Save draft"}</button></div>
  </form>`;
}

function invoiceAside(ctx, inv) {
  const s = ctx.s;
  const st = stOf(s, inv);
  const pays = B.invoices.paymentsOf(s, inv);
  const pend = pays.filter((p) => p.status === "pending");
  const total = B.invoices.total(s, inv);
  const paid = B.invoices.paid(s, inv);
  const lead = inv.leadId ? byId(s.leads, inv.leadId) : null;
  const job = inv.jobId ? byId(s.jobs, inv.jobId) : null;
  const bk = inv.bookingId ? byId(s.bookings, inv.bookingId) : null;
  const c = custOf(s, inv.customerId);
  const block = editBlock(s, inv);
  const payable = B.payments.payable(s, inv);
  const info = (t) =>
    `<p class="flex gap-1.5 text-caption text-muted-foreground">${I("info", "size-icon-sm mt-0.5")}<span>${t}</span></p>`;
  const lastOk = pays.find((p) => p.status === "approved");
  let head = "";
  if (inv.cancelled)
    head = `<div class="flex items-center gap-2">${pill("cancelled")}<span class="text-caption text-muted-foreground">Number ${C(noOf(inv))} kept (gap-free, D71)</span></div>`;
  else if (st === "draft")
    head = `<div class="flex items-center gap-2">${pill("draft")}<span class="text-caption text-muted-foreground">${job ? `From the job ${esc(nameOf(s, job.assigneeId))} marked done ${fmtDate(job.completedAt)}` : `Created ${fmtDate(inv.createdAt)}`} · not numbered</span></div>
      <button type="button" data-need="write" class="btn btn-primary w-full" data-open="share-invoice">${I("indian-rupee")}Issue and request payment</button>
      ${info(`Issuing gives the next proforma number ${C(nextNo(s, "PI"))}; the tax invoice number comes when the payment is approved (D71).`)}`;
  else if (st === "paid")
    head = `<div class="flex items-center gap-2">${pill("paid")}<span class="text-caption text-muted-foreground">${lastOk?.decidedBy ? `Approved by ${esc(firstName(nameOf(s, lastOk.decidedBy)))}, ${fmtTime(lastOk.decidedAt) || fmtDate(lastOk.decidedAt)}` : `Paid ${fmtDate(paidOn(s, inv))}`}</span></div>
      <div class="flex gap-2"><button type="button" data-need="write" class="btn btn-primary flex-1" data-open="share-invoice">${I("send")}Send receipt</button><a ${link("invoice-pdf", { id: inv.id })} class="btn btn-outline btn-icon" aria-label="PDF" title="PDF">${I("file-down")}</a></div>
      ${info(`${inv.piNumber ? `Was ${C(inv.piNumber)}. ` : ""}${C(inv.invNumber || "")} is from the tax-invoice series, given on approval (D60). It cannot be edited; cancelling needs a credit note (Phase 2).`)}`;
  else
    head = `<div class="flex items-center gap-2">${pill(st)}<span class="text-caption text-muted-foreground">${pend.length ? `Proof by ${esc(firstName(nameOf(s, pend[0].uploadedBy)) || "the customer")}, ${fmtTime(pend[0].uploadedAt) || fmtDate(pend[0].uploadedAt)}` : esc(dateLine(s, inv))}</span></div>
      ${pend.length ? `<div class="flex gap-2"><a ${link("approvals", { id: pend[0].id })} class="btn btn-primary flex-1">${I("badge-check")}Review proof</a><a ${link("invoice-pdf", { id: inv.id })} class="btn btn-outline btn-icon" aria-label="PDF" title="PDF">${I("file-down")}</a></div>` : ""}
      <div class="grid grid-cols-2 gap-2">${st === "expired" ? "" : `<button type="button" data-need="write" class="btn btn-outline" data-open="share-invoice">${I("indian-rupee")}Ask again</button>`}${payable.ok ? `<button type="button" data-need="record" class="btn btn-outline" data-open="record">${I("wallet")}Record payment</button>` : ""}</div>
      ${st === "expired" ? info(`Expired on ${fmtDate(inv.payBy)}: it cannot be paid (D73). Edit it to send a new version with a new pay-by date, or follow up from Overdue (D75).`) : ""}
      ${info(`Becomes tax invoice ${C(`${s.workspace.numbering.INV.prefix}-`)} with the next number when the payment is approved. Edits before that are versions of ${C(inv.piNumber || "")}; a payment made on an older version applies to the latest (D76).`)}`;
  const editBtns = !block
    ? `<div class="flex gap-2"><button type="button" data-need="write" class="btn btn-outline flex-1" data-do="startEdit">${I("pencil")}${inv.sharedAt ? "Edit (new version)" : "Edit lines"}</button>${!inv.cancelled && paid === 0 ? `<button type="button" data-need="${inv.sharedAt ? "void" : "write"}" class="btn btn-ghost text-destructive" data-do="invoices.cancel" data-a-id="${esc(inv.id)}" ${inv.sharedAt ? "" : 'data-after="invoices"'}>${I("circle-x")}${inv.sharedAt ? "Cancel" : "Delete"}</button>` : ""}</div>`
    : inv.cancelled || st === "paid"
      ? ""
      : info(esc(block));
  const versions = [
    ...inv.history.map(
      (h) =>
        `<li class="flex items-center gap-2"><span class="code">v${h.version}</span><span class="text-muted-foreground">${fmtDate(h.at)}</span><span class="ml-auto">${M(h.total)}</span></li>`
    ),
    `<li class="flex items-center gap-2"><span class="code">v${inv.version}</span><span class="text-muted-foreground">current</span><span class="ml-auto">${M(total)}</span></li>`,
  ];
  const from = [
    lead
      ? `Lead <a ${link("lead", { id: lead.id })} class="underline">${esc(c.name)} · ${esc(lead.brief)}</a>`
      : "",
    bk
      ? `Booking <a ${link("bookings")} class="underline">${esc(c.name)} · ${fmtDate(bk.start)}</a>`
      : "",
    job
      ? `Job <a ${link("job", { id: job.id })} class="underline">"${esc(job.title)}"</a>`
      : "",
  ].filter(Boolean);
  return `<aside class="w-full @web:w-aside shrink-0 border-t @web:border-t-0 @web:border-l border-border p-4 @tab:p-card-sm space-y-3">
    ${head}
    ${editBtns}
    <div class="rounded-control bg-muted p-3 space-y-1"><div class="flex justify-between"><span>Total</span>${M(total)}</div><div class="flex justify-between"><span>Approved</span>${M(paid)}</div><div class="flex justify-between font-medium"><span>Still due</span>${M(B.invoices.open(s, inv))}</div></div>
    <div><p class="label mb-1">Payments</p>${
      pays.length
        ? `<ul class="space-y-2" data-payments>${pays
            .map(
              (p) =>
                `<li class="rounded-control border border-border p-2"><div class="flex items-center gap-2">${pill(p.status)}<span class="ml-auto">${M(p.amount)}</span></div><p class="mt-1 text-caption text-muted-foreground">${esc(B.payments.METHODS[p.method] || "Payment")}${p.reference ? ` · ${C(p.reference)}` : ""} · ${p.byCustomer ? "by the customer" : p.uploadedBy ? `by ${esc(firstName(nameOf(s, p.uploadedBy)))}` : "recorded"}${p.uploadedAt ? ` · ${fmtDate(p.uploadedAt)}` : ""}${p.selfApproved ? " · self-approved (D74)" : ""}</p>${p.note ? `<p class="text-caption text-muted-foreground">"${esc(p.note)}"</p>` : ""}</li>`
            )
            .join("")}</ul>`
        : `<p class="text-caption text-muted-foreground">No payments yet.</p>`
    }</div>
    ${serialAside(ctx, inv)}
    <div><p class="label mb-1">Versions</p><ul class="space-y-1" data-versions>${versions.join("")}</ul></div>
    <div><p class="label mb-1">Customer sees</p><div class="grid grid-cols-2 gap-2"><a ${link("invoice-email", { id: inv.id })} class="btn btn-outline">${I("mail")}Email</a><a ${link("invoice-pdf", { id: inv.id })} class="btn btn-outline">${I("file-text")}PDF</a><a ${link("p-pay", { id: inv.id })} class="btn btn-outline col-span-2">${I("smartphone")}Pay page</a></div></div>
    <div><p class="label mb-1">From</p><p>${from.length ? from.join(" · ") : `Customer <a ${link("customer", { id: c.id || "" })} class="underline">${esc(c.name)}</a>`}</p></div>
  </aside>`;
}

/* Receipt (message 15) for a paid invoice. */
function receiptDialog(ctx, inv) {
  const s = ctx.s;
  const key = "share-invoice:ch";
  const ch = chOf(ctx, key);
  const amount = B.invoices.paid(s, inv);
  const msg = messageFor(s, inv, B.messages.T.paymentReceived, ch, amount);
  return modal(
    "share-invoice",
    "Send receipt",
    `<p class="text-muted-foreground">${C(noOf(inv))} to ${esc(custOf(s, inv.customerId).name)} · ${M(amount)} received</p>
    <form data-do="sendReceipt" data-a-id="${esc(inv.id)}">${shareBody(ctx, key, msg)}
      <div class="mt-4 flex flex-wrap gap-2 justify-end"><button type="button" class="btn btn-ghost" data-close>Cancel</button><a ${link("invoice-pdf", { id: inv.id })} class="btn btn-outline">${I("file-down")}PDF</a><button type="submit" data-need="write" class="btn btn-primary">${sendLabel(ch)}</button></div></form>`
  );
}

/* ---------- Invoice PDF helpers ---------- */
const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];
const two = (n) =>
  n < 20
    ? ONES[n]
    : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;
const three = (n) =>
  [
    n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred` : "",
    n % 100 ? two(n % 100) : "",
  ]
    .filter(Boolean)
    .join(" ");
/* Indian numbering: crore, lakh, thousand. */
export function inWords(n) {
  n = Math.round(Math.abs(n));
  if (!n) return "Zero";
  const cr = Math.floor(n / 1e7);
  const l = Math.floor((n % 1e7) / 1e5);
  const th = Math.floor((n % 1e5) / 1000);
  const r = n % 1000;
  return [
    cr ? `${inWords(cr)} Crore` : "",
    l ? `${two(l)} Lakh` : "",
    th ? `${two(th)} Thousand` : "",
    r ? three(r) : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/* ---------- Approvals ---------- */
function approvalsBody(ctx) {
  const s = ctx.s;
  const pend = B.payments.pending(s);
  const pay = byId(pend, ctx.ui.pick) || byId(pend, ctx.params.id) || pend[0];
  const done = s.payments.filter(
    (p) =>
      ["approved", "rejected"].includes(p.status) &&
      String(p.decidedAt || "").slice(0, 10) === ctx.today
  );
  const invOfPay = (p) => byId(s.invoices, p.invoiceId) || {};
  const custName = (p) => custOf(s, invOfPay(p).customerId).name;
  const by = (p) =>
    p.byCustomer
      ? "the customer"
      : firstName(nameOf(s, p.uploadedBy)) || "recorded";
  const when = (p) =>
    String(p.uploadedAt || "").slice(0, 10) === ctx.today
      ? fmtTime(p.uploadedAt) || "today"
      : String(p.uploadedAt || "").slice(0, 10) === addDays(ctx.today, -1)
        ? "yesterday"
        : fmtDate(p.uploadedAt);
  const list = `<div class="hidden @tab:block w-72 shrink-0 border-r border-border p-3">
      <div class="flex items-center px-2 h-control-md"><span class="label">Waiting</span><span class="count ml-2">${pend.length}</span></div>
      ${
        pend
          .map(
            (p) =>
              `<button type="button" class="w-full text-left p-2.5 rounded-control ${p === pay ? "bg-accent" : "hover:bg-muted"}" data-ui="pick" data-v="${esc(p.id)}" data-pay="${esc(p.id)}"><div class="flex"><span class="font-medium">${esc(custName(p))}</span><span class="ml-auto">${M(p.amount)}</span></div><div class="text-caption text-muted-foreground">${C(noOf(invOfPay(p)))} · ${esc(B.payments.METHODS[p.method] || "Payment")} · ${esc(by(p))} · ${esc(when(p))}</div></button>`
          )
          .join("") ||
        `<p class="px-2 text-caption text-muted-foreground">Nothing waiting.</p>`
      }
      <div class="flex items-center px-2 h-control-md mt-3"><span class="label">Done today</span></div>
      ${
        done
          .map(
            (p) =>
              `<div class="p-2.5"><div class="flex"><span>${esc(custName(p))}</span><span class="ml-auto">${M(p.amount)}</span></div><div class="mt-1 flex items-center gap-2">${pill(p.status)}${p.status === "approved" && invOfPay(p).invNumber ? C(invOfPay(p).invNumber) : ""}</div>${p.status === "rejected" && p.note ? `<p class="text-caption text-muted-foreground">"${esc(p.note)}" · ${esc(by(p))} told (message 16)</p>` : ""}${p.selfApproved ? `<p class="text-caption text-muted-foreground">Self-approved, logged (D74)</p>` : ""}</div>`
          )
          .join("") ||
        `<p class="px-2 text-caption text-muted-foreground">Nothing decided yet today.</p>`
      }
    </div>`;
  if (!pay)
    return `<div class="min-h-full flex">${list}<div class="flex-1 min-w-0 p-4 @tab:p-page">${empty("badge-check", "Nothing to approve", "Payments recorded by your team or paid on the pay page wait here for approval.")}</div></div>`;
  const inv = invOfPay(pay);
  const total = B.invoices.total(s, inv);
  const open = B.invoices.open(s, inv);
  const actx = { role: ctx.role, memberId: ctx.memberId };
  const why = B.payments.cannotApprove(s, pay, actx);
  const whyReject = B.payments.cannotApprove(
    s,
    { ...pay, uploadedBy: null },
    actx
  );
  const full = B.invoices.paid(s, inv) + pay.amount >= total && !inv.invNumber;
  const over = pay.amount > open;
  const self = !why && pay.uploadedBy && pay.uploadedBy === ctx.memberId;
  const pay2 = B.payments.payable(s, inv);
  const old =
    pay.version < inv.version
      ? inv.history.find((h) => h.version === pay.version)
      : null;
  const notes = [
    old || pay.version < inv.version
      ? `<p class="flex gap-1.5 p-2 rounded-control bg-info-soft text-info">${I("info", "size-icon-sm mt-0.5")}<span>Paid against version ${pay.version}; approving applies it to version ${inv.version}${old && total !== old.total ? ` (difference ${inr(total - old.total)})` : ""} (D76).</span></p>`
      : "",
    pay2.warning
      ? `<p class="flex gap-1.5 p-2 rounded-control bg-warning-soft text-warning" data-snoozed>${I("triangle-alert", "size-icon-sm mt-0.5")}<span>${esc(pay2.warning)} (D73)</span></p>`
      : "",
    !pay2.ok && pay2.reason && !pay2.reason.includes("already paid")
      ? `<p class="flex gap-1.5 p-2 rounded-control bg-warning-soft text-warning">${I("triangle-alert", "size-icon-sm mt-0.5")}<span>${esc(pay2.reason)} (D73)</span></p>`
      : "",
    over
      ? `<p class="flex gap-1.5 p-2 rounded-control bg-destructive text-destructive-foreground">${I("circle-x", "size-icon-sm mt-0.5")}<span>This is more than the open balance (${inr(open)}). It cannot be approved (D76).</span></p>`
      : "",
  ].join("");
  const proof = pay.proof?.url
    ? `<img src="${esc(pay.proof.url)}" alt="Payment proof ${esc(pay.proof.name || "")}" class="max-h-96 mx-auto rounded-control object-contain" />`
    : `<div class="aspect-[3/4] max-h-96 mx-auto rounded-control bg-muted flex flex-col items-center justify-center gap-1 text-muted-foreground">${I("image")}<span>${esc(pay.proof?.name || "No proof attached")}</span></div>`;
  const i = pend.indexOf(pay);
  const next = pend[(i + 1) % pend.length];
  return `<div class="min-h-full flex">${list}
    <div class="flex-1 min-w-0 p-4 @tab:p-page">
      <div class="flex flex-wrap items-center gap-2">${pill("pending")}<span class="text-muted-foreground">Uploaded by ${esc(by(pay))} ${String(pay.uploadedAt || "").slice(0, 10) === ctx.today ? `today at ${fmtTime(pay.uploadedAt)}` : esc(when(pay))} · ${i + 1} of ${pend.length}</span>${pend.length > 1 ? `<button type="button" class="ml-auto btn btn-ghost btn-sm" data-ui="pick" data-v="${esc(next.id)}">Next${I("arrow-right", "size-icon-sm")}</button>` : ""}</div>
      <h2 class="mt-2 text-title font-semibold flex flex-wrap items-baseline gap-2"><span class="font-mono text-money-lg">${inr(pay.amount)}</span>from ${esc(custName(pay))}</h2>
      ${notes ? `<div class="mt-3 space-y-2">${notes}</div>` : ""}
      <div class="mt-4 grid @web:grid-cols-[1fr_var(--size-aside)] gap-4">
        <div class="card p-3">${proof}</div>
        <div class="space-y-3">
          <div class="card px-card-sm">${[
            [
              "Invoice",
              `<a ${link("invoice", { id: inv.id })} class="hover:underline">${C(noOf(inv))}</a>`,
            ],
            ["Method", esc(B.payments.METHODS[pay.method] || "—")],
            ["Reference", pay.reference ? C(pay.reference) : "—"],
            ["Paid on", fmtDate(pay.uploadedAt)],
            ["Invoice total", M(total)],
            ["Open balance", M(open)],
            [
              "After approval",
              full
                ? `${pill("paid")} ${C(nextNo(s, "INV"))}`
                : `${M(Math.max(0, open - pay.amount))} still open`,
            ],
          ]
            .map(
              (r) =>
                `<div class="flex items-center h-row-sm border-b border-border last:border-0"><span class="text-muted-foreground">${r[0]}</span><span class="ml-auto">${r[1]}</span></div>`
            )
            .join("")}</div>
          ${
            why || over
              ? `<button type="button" data-need="approve" class="btn btn-primary btn-lg w-full" disabled aria-disabled="true" data-approve="${esc(pay.id)}">${I("lock")}Approve</button><p class="hint" data-why>${esc(why || "More than the open balance cannot be approved.")} (D57, D74)</p>`
              : `<button type="button" data-need="approve" class="btn btn-primary btn-lg w-full" data-do="payments.approve" data-a-id="${esc(pay.id)}" data-approve="${esc(pay.id)}">${I("circle-check")}Approve</button><p class="hint">${full ? `Gives tax invoice ${C(nextNo(s, "INV"))}, the next number (D60), and sends the receipt (message 15).` : "Part payment: the invoice stays a proforma until it is paid in full."}${self ? " You uploaded this and are the only approver for this amount: logged as self-approved (D74)." : ""}</p>`
          }
          <form data-do="payments.reject" data-a-id="${esc(pay.id)}"><label class="flabel" for="rej-note">Reject with a note</label>${textarea("note", { id: "rej-note", rows: 2, placeholder: "Amount on screenshot doesn't match…" })}<button type="submit" data-need="approve" class="mt-2 btn btn-outline w-full text-destructive" ${whyReject ? "disabled" : ""}>${I("circle-x")}Reject</button>${whyReject ? `<p class="hint">${esc(whyReject)}</p>` : `<p class="hint">${esc(by(pay))} is told why (message 16).</p>`}</form>
        </div>
      </div>
    </div>
  </div>`;
}

/* ---------- checks helpers ---------- */
const OWNER = (s) => ({
  role: "owner",
  memberId: s.meta.people.owner,
  today: s.meta.today,
});
const MANAGER = (s) => ({
  role: "manager",
  memberId: s.meta.people.manager,
  today: s.meta.today,
});
const STAFF = (s) => ({
  role: "staff",
  memberId: s.meta.people.staff,
  today: s.meta.today,
});
const throws = (fn) => {
  try {
    fn();
    return "";
  } catch (e) {
    return e.message || "error";
  }
};
const uiOf = (h, id, params = {}) => {
  h.at(id, params);
  return h.makeCtx().ui;
};

export default [
  {
    n: 19,
    area: "Invoices",
    id: "invoices",
    name: "Invoices list",
    route: "/w/:slug/invoices",
    action: "New invoice, overdue filter",
    who: "Owner, Manager, Accountant",
    notes:
      "Every unpaid invoice is a proforma (PI-): a reply to a quoted lead, or a bill after the service (D71). It becomes a tax invoice (INV-, its own gap-free series) when its payment is approved (D60). Replies are not money owed and expire after the pay-by date (D75). Due, Overdue and To approve count bills only. Overdue has its own tab with one-tap Remind (D64).",
    render: (ctx) => invoicesPage(ctx),
    actions: listActions,
    checks: [
      (t, h) => {
        const ui = uiOf(h, "invoices");
        const counts = {};
        for (const [tab] of TABS) {
          ui.tab = tab;
          ui["inv:per"] = 50;
          const f = h.at("invoices");
          counts[tab] = f.querySelectorAll("tbody tr[data-row]").length;
        }
        delete ui.tab;
        delete ui["inv:per"];
        const s = h.s;
        t(counts.all === s.invoices.length, "All lists every invoice");
        t(
          counts.overdue === h.biz.sel.overdue(s).length && counts.overdue > 0,
          "the Overdue tab shows only overdue bills"
        );
        t(
          counts.replies + counts.bills === h.biz.invoices.live(s).length,
          "Replies and Bills split the live invoices"
        );
        t(
          counts.draft === s.invoices.filter((i) => !i.sharedAt).length,
          "the Draft tab shows drafts"
        );
        t(
          counts.paid ===
            s.invoices.filter((i) => h.biz.invoices.statusOf(s, i) === "paid")
              .length,
          "the Paid tab shows paid invoices"
        );
      },
      (t, h) => {
        const ui = uiOf(h, "invoices");
        const c =
          h.s.customers.find((x) => x.name === "Meera Kulkarni") ||
          h.s.customers[0];
        ui["inv:q"] = c.name.split(" ")[1] || c.name;
        const n = h
          .at("invoices")
          .querySelectorAll("tbody tr[data-row]").length;
        delete ui["inv:q"];
        t(
          n === h.s.invoices.filter((i) => i.customerId === c.id).length,
          "search finds the customer's invoices"
        );
      },
      (t, h) => {
        /* Quick Invoice: live total from the chosen chips, then create. */
        const s = h.s;
        const ui = uiOf(h, "invoices");
        const P = `qi-${nextId(s, "I")}:`;
        const its = h.biz.catalog.visibleItems(s).slice(0, 2);
        ui[`${P}lines`] = JSON.stringify([
          h.biz.invoices.lineFromItem(its[0], 2),
          h.biz.invoices.lineFromItem(its[1], 1),
        ]);
        ui[`${P}cust`] = s.customers[0].id;
        const f = h.at("invoices");
        const want = h.biz.invoices.total(s, {
          customerId: s.customers[0].id,
          discount: 0,
          lines: [
            h.biz.invoices.lineFromItem(its[0], 2),
            h.biz.invoices.lineFromItem(its[1], 1),
          ],
        });
        t(
          f.querySelector("[data-qi-total]")?.textContent === inr(want),
          "Quick Invoice total follows the picked items and quantities"
        );
        t(
          f.querySelectorAll(
            '[data-dialog="new-invoice"] [data-item][aria-pressed="true"]'
          ).length === 2,
          "picked item chips show as on"
        );
        delete ui[`${P}lines`];
        delete ui[`${P}cust`];
        const x = structuredClone(s);
        const out = h.biz.invoices.quick(
          x,
          {
            name: "Walk In",
            phone: "9811122233",
            lines: [{ name: "Haircut", qty: "1", rate: "800", gst: "18" }],
            dueDays: "0",
            mode: "paid",
          },
          OWNER(x)
        );
        t(
          out.invoice.piNumber &&
            out.invoice.dueDate === x.meta.today &&
            out.invoice.lines[0].qty === 1,
          "Paid now issues a PI- number, due today, with numeric lines"
        );
        t(
          x.customers.some((c) => c.name === "Walk In"),
          "a new phone number adds a customer"
        );
      },
    ],
  },
  {
    n: 20,
    area: "Invoices",
    id: "invoice",
    name: "Invoice editor (doc)",
    route: "/w/:slug/invoices/:id",
    action: "Share, request payment",
    who: "All",
    notes:
      "Draft (not numbered) → Proforma PI- (shared; a reply or a bill, D71) → Tax invoice INV- (numbered on approval, its own series, D60). Edits before payment are versions of the same PI- (D60, D76). Cancelling keeps the number.",
    sample: { id: "I1" },
    render: (ctx) => {
      const s = ctx.s;
      const inv = invOf(ctx);
      if (!inv)
        return app(
          ctx,
          "invoices",
          { icon: "receipt", title: "Invoice", back: "invoices" },
          page(empty("receipt", "No invoices yet"))
        );
      const st = stOf(s, inv);
      const editing = ctx.ui.edit === "1" && !editBlock(s, inv);
      const ed = ctx.ui.ed;
      let lines = ed?.lines
        ? ed.lines.filter((l) => !flag(l.remove, false))
        : inv.lines.map((l) => ({ ...l }));
      const it = ed?.add ? byId(s.items, ed.add) : null;
      if (editing && it) lines = [...lines, B.invoices.lineFromItem(it, 1)];
      const discount = ed?.discount ?? inv.discount;
      const share = !inv.cancelled && st !== "expired" && st !== "pending";
      const dialogs =
        (st === "paid"
          ? receiptDialog(ctx, inv)
          : shareDialog(ctx, "share-invoice", inv)) +
        recordPaymentDialog(ctx, inv.id, "record");
      return app(
        ctx,
        "invoices",
        {
          icon: "receipt",
          title: esc(noOf(inv) || custOf(s, inv.customerId).name),
          crumb: inv.cancelled
            ? "Cancelled"
            : st === "draft"
              ? "Draft"
              : inv.invNumber
                ? "Invoice"
                : "Proforma",
          back: "invoices",
          fab: share
            ? st === "paid"
              ? `${I("send")}Send receipt`
              : `${I("indian-rupee")}Request payment`
            : "",
          fabOpen: "share-invoice",
          dialogs,
        },
        `<div class="min-h-full flex flex-col @web:flex-row"><div class="flex-1 min-w-0 bg-muted p-4 @tab:p-page">${editing ? editor(ctx, inv, lines, discount) : ""}${!editing && ctx.ui.serials === "1" && SR.on(s) && !inv.cancelled && SR.trackedUnits(inv) ? serialPanel(ctx, inv) : ""}${invDoc(s, inv, editing ? { lines: norm(lines), discount: +discount || 0 } : {})}</div>${invoiceAside(ctx, inv)}</div>`
      );
    },
    actions: {
      openSerials: (ctx) => {
        delete ctx.ui.sr;
        delete ctx.ui.srData;
        ctx.ui.edit = "";
        ctx.ui.serials = "1";
        return { text: "Scan or type each serial. Enter moves on." };
      },
      closeSerials: (ctx) => {
        delete ctx.ui.sr;
        delete ctx.ui.srData;
        ctx.ui.serials = "";
        return { text: "Serials not saved" };
      },
      /* then: scan (Enter in any field), fill (pasted list) or save. */
      saveSerials: (ctx, a) => {
        const inv = byId(ctx.s.invoices, a.id) || fail("Invoice not found.");
        const units = draftUnits(ctx, inv, a.units || []);
        if (a.then === "fill" || a.then === "scan") {
          const list = SR.parseList(a.then === "fill" ? a.paste : a.scan);
          const given = list.length;
          let n = 0;
          for (const u of units)
            if (!u.serial && list.length) {
              u.serial = list.shift();
              n++;
            }
          ctx.ui.srData = { units };
          if (!given)
            return {
              text: `${units.filter((u) => u.serial).length} of ${units.length} entered. Save when done.`,
            };
          return {
            text: n
              ? `${n} serial${n === 1 ? "" : "s"} filled${list.length ? `; ${list.length} left over (no empty rows)` : ""}`
              : "No empty rows left. Save, or clear a row first.",
          };
        }
        const out = call(
          "Serials: save",
          (s, c) => ctx.biz.serials.save(s, { id: a.id, units }, c),
          ctx
        );
        delete ctx.ui.srData;
        ctx.ui.serials = "";
        return out;
      },
      startEdit: (ctx) => {
        ctx.ui.serials = "";
        delete ctx.ui.ed;
        ctx.ui.edit = "1";
        return { text: "Editing. The document updates as you type." };
      },
      cancelEdit: (ctx) => {
        delete ctx.ui.ed;
        ctx.ui.edit = "";
        return { text: "Edit cancelled" };
      },
      saveLines: (ctx, a) => {
        const lines = (a.lines || []).filter((l) => !flag(l.remove, false));
        if (!norm(lines).some((l) => l.name && l.qty > 0))
          fail("Keep at least one line with a quantity.");
        const out = call(
          "Invoices: revise",
          (s, c) =>
            ctx.biz.invoices.revise(
              s,
              { id: a.id, lines, discount: a.discount },
              c
            ),
          ctx
        );
        delete ctx.ui.ed;
        ctx.ui.edit = "";
        return out;
      },
      sendReceipt: (ctx, a) =>
        call(
          "Send receipt",
          (s, c) => {
            B.perms.need(c, "write");
            const inv = byId(s.invoices, a.id) || fail("Invoice not found.");
            const channel = CHANNELS.includes(a.channel) ? a.channel : "email";
            const msg = B.messages.send(
              s,
              {
                channel,
                templateId: B.messages.T.paymentReceived,
                vars: B.messages.varsFor(s, {
                  invoice: { ...inv, _total: B.invoices.paid(s, inv) },
                }),
                to: B.messages.addressOf(custOf(s, inv.customerId), channel),
                recordId: inv.id,
              },
              c
            );
            return {
              recordId: inv.id,
              text: `Receipt for ${noOf(inv)} ${channel === "email" ? "sent" : "copied"}`,
              message: msg,
            };
          },
          ctx
        ),
    },
    checks: [
      (t, h) => {
        const s = h.s;
        const f = h.at("invoice", { id: "I1" });
        const inv = byId(s.invoices, "I1");
        t(
          f.querySelector("[data-doc] [data-total]")?.textContent ===
            inr(h.biz.invoices.total(s, inv)),
          "the document total comes from the data"
        );
        t(f.textContent.includes(inv.piNumber), "shows the PI- number");
        t(
          f.querySelectorAll("[data-payments] [data-status]").length ===
            h.biz.invoices.paymentsOf(s, inv).length,
          "lists the invoice's payments with statuses"
        );
      },
      (t, h) => {
        /* Edit a shared proforma: a new version, history kept (D60). */
        const x = structuredClone(h.s);
        const inv = x.invoices.find(
          (i) =>
            i.sharedAt &&
            !i.invNumber &&
            !h.biz.invoices.pendingOf(x, i).length &&
            !i.cancelled &&
            h.biz.invoices.statusOf(x, i) !== "expired"
        );
        const before = h.biz.invoices.total(x, inv);
        h.biz.invoices.revise(
          x,
          {
            id: inv.id,
            lines: inv.lines.map((l) => ({ ...l, qty: String(l.qty + 1) })),
          },
          OWNER(x)
        );
        t(
          inv.version === 2 &&
            inv.history[0].total === before &&
            inv.lines[0].qty === 2,
          "editing a shared proforma makes version 2 and keeps version 1"
        );
        const ui = uiOf(h, "invoice", { id: inv.id });
        ui.edit = "1";
        ui.ed = {
          lines: inv.lines.map((l) => ({ ...l, qty: "3" })),
          discount: "0",
        };
        const f = h.at("invoice", { id: inv.id });
        const want = h.biz.invoices.total(h.s, {
          ...inv,
          lines: norm(ui.ed.lines),
          discount: 0,
        });
        t(
          f.querySelector("[data-ed-total]")?.textContent === inr(want),
          "the editor total updates with the typed quantities"
        );
        delete ui.ed;
        delete ui.edit;
      },
      (t, h) => {
        const x = structuredClone(h.s);
        const inv = x.invoices.find(
          (i) => i.sharedAt && !i.invNumber && h.biz.invoices.paid(x, i) === 0
        );
        const no = inv.piNumber;
        h.biz.invoices.cancel(x, { id: inv.id }, OWNER(x));
        t(
          inv.cancelled && inv.piNumber === no,
          "cancel keeps the number (D71)"
        );
      },
    ],
  },
  {
    n: 21,
    area: "Invoices",
    id: "overdue",
    name: "Overdue payments",
    route: "/w/:slug/invoices/overdue",
    action: "Remind by Email or SMS",
    who: "Owner, Manager, Accountant",
    notes:
      "Ready message 13 up to 6 days overdue, 14 from day 7 (+7, +14). Phase 1: email is sent by the app, SMS and WhatsApp are copy-paste (D67); the app logs every one. Accountant sees the list, not the Remind button. Expired replies get the follow-up (message 6, D75).",
    render: (ctx) => {
      const s = ctx.s;
      const od = B.sel.overdue(s);
      const k = B.sel.kpis(s);
      const week = addDays(ctx.today, 7);
      const soon = B.sel
        .owed(s)
        .filter(
          (i) => ["due", "part_paid"].includes(stOf(s, i)) && i.dueDate <= week
        );
      const recent = B.invoices
        .live(s)
        .flatMap((i) => i.reminders || [])
        .filter((r) => String(r.at).slice(0, 10) > addDays(ctx.today, -7));
      const byCh = CHANNELS.map((c) => [
        c,
        recent.filter((r) => r.channel === c).length,
      ]).filter((x) => x[1]);
      const expired = B.invoices
        .live(s)
        .filter((i) => B.invoices.isReplyLike(i) && stOf(s, i) === "expired");
      const oldest = od[0];
      const btn = (inv, dlg, label) =>
        `<span class="flex justify-end gap-1"><button type="button" data-need="write" class="btn btn-outline btn-sm" data-open="${dlg}" data-open-args="${json({ [`${dlg}:id`]: inv.id })}" data-remind="${esc(inv.id)}">${I("send", "size-icon-sm")}${label}</button><a ${link("invoice", { id: inv.id })} class="btn btn-ghost btn-sm btn-icon" aria-label="Open invoice">${I("chevron-right", "size-icon-sm")}</a></span>`;
      return app(
        ctx,
        "overdue",
        {
          icon: "circle-alert",
          title: "Overdue",
          dialogs:
            remindDialog(
              ctx,
              "remind-od",
              byId(s.invoices, ctx.ui["remind-od:id"]) || oldest
            ) +
            remindDialog(
              ctx,
              "follow-up",
              byId(s.invoices, ctx.ui["follow-up:id"]) || expired[0],
              "Follow up"
            ),
        },
        page(`
    ${kpis([
      {
        icon: "circle-alert",
        t: "Overdue",
        sub: `${k.overdue.count} bills`,
        v: inr(k.overdue.amount),
        foot: "Past the due date",
        tone: "text-destructive",
      },
      {
        icon: "hourglass",
        t: "Oldest",
        sub: oldest
          ? `${esc(noOf(oldest))} · ${esc(custOf(s, oldest.customerId).name)}`
          : "none",
        v: oldest ? `${B.invoices.daysOverdue(s, oldest)} days` : "—",
        foot: oldest
          ? `Reminder ${B.invoices.daysOverdue(s, oldest) <= 6 ? 13 : 14} is due`
          : "Nothing overdue",
      },
      {
        icon: "send",
        t: "Reminders, last 7 days",
        sub: byCh.length
          ? byCh
              .map(
                ([c, n]) => `${n} ${c === "email" ? "email" : `${CH[c]} copy`}`
              )
              .join(" · ")
          : "none",
        v: String(recent.length),
        foot: "Sent by the app or copied",
      },
      {
        icon: "calendar-clock",
        t: "Falls due this week",
        sub: soon.length
          ? `${soon.map((i) => esc(custOf(s, i.customerId).name)).join(", ")} · not late yet`
          : "nothing",
        v: inr(sum(soon, (i) => B.invoices.open(s, i))),
        foot: `${soon.length} bill${soon.length === 1 ? "" : "s"}${soon.length ? ` · ${soon.map((i) => fmtDate(i.dueDate)).join(", ")}` : ""}`,
        go: "invoices",
      },
    ])}
    ${dataTable(ctx, {
      key: "od",
      icon: "circle-alert",
      title: "Overdue invoices",
      go: "invoice",
      ph: "Search overdue",
      select: false,
      cols: [
        { t: "Customer", role: "title" },
        { t: "Invoice", m: 1, role: "sub" },
        { t: "Days overdue", r: 1, role: "end" },
        { t: "Amount", r: 1, role: "end" },
        { t: "Last reminder", m: 1, web: 1 },
        { t: "", role: "act" },
      ],
      rows: od.map((inv) => {
        const c = custOf(s, inv.customerId);
        return {
          id: inv.id,
          text: `${c.name} ${noOf(inv)}`,
          cells: [
            `<span class="font-medium">${esc(c.name)}</span>`,
            C(noOf(inv)),
            `<span class="font-mono text-destructive">${B.invoices.daysOverdue(s, inv)} days</span>`,
            M(B.invoices.open(s, inv)),
            esc(lastReminder(inv)),
            btn(inv, "remind-od", "Remind"),
          ],
        };
      }),
    })}
    ${
      expired.length
        ? dataTable(ctx, {
            key: "exp",
            icon: "calendar-x",
            title: "Expired replies",
            go: "invoice",
            ph: "Search expired",
            select: false,
            cols: [
              { t: "Customer", role: "title" },
              { t: "Reply", m: 1, role: "sub" },
              { t: "Expired", m: 1, role: "end" },
              { t: "Amount", r: 1, role: "end" },
              { t: "Last follow-up", m: 1, web: 1 },
              { t: "", role: "act" },
            ],
            rows: expired.map((inv) => {
              const c = custOf(s, inv.customerId);
              return {
                id: inv.id,
                text: `${c.name} ${noOf(inv)}`,
                cells: [
                  `<span class="font-medium">${esc(c.name)}</span>`,
                  C(noOf(inv)),
                  fmtDate(inv.payBy),
                  M(B.invoices.total(s, inv)),
                  esc(lastReminder(inv)),
                  btn(inv, "follow-up", "Follow up"),
                ],
              };
            }),
          })
        : ""
    }
    <p class="text-caption text-muted-foreground">A bill turns Overdue by itself the day after its due date. Replies are never overdue: past the pay-by date they turn Expired and get a follow-up (message 6) (D75). Email reminders are sent by the app; SMS and WhatsApp are ready to copy and paste (D67).</p>`)
      );
    },
    checks: [
      (t, h) => {
        const s = h.s;
        const f = h.at("overdue");
        t(
          f.querySelectorAll('[data-table="od"] tbody tr[data-row]').length ===
            h.biz.sel.overdue(s).length,
          "rows come from the overdue selector"
        );
        const x = structuredClone(s);
        for (const inv of h.biz.sel.overdue(x)) {
          const d = h.biz.invoices.daysOverdue(x, inv);
          const n = x.outbox.length;
          h.biz.invoices.remind(x, { id: inv.id, channel: "email" }, OWNER(x));
          const m = x.outbox[0];
          t(
            x.outbox.length === n + 1 && m.templateId === (d <= 6 ? 13 : 14),
            `remind on ${d} days overdue uses message ${d <= 6 ? 13 : 14} (D64)`
          );
          t(
            !/\{\w+\}/.test(m.body),
            `reminder ${m.templateId} has no unfilled placeholder`
          );
        }
        const exp = h.biz.invoices
          .live(x)
          .find(
            (i) =>
              h.biz.invoices.isReplyLike(i) &&
              h.biz.invoices.statusOf(x, i) === "expired"
          );
        if (exp) {
          h.biz.invoices.remind(x, { id: exp.id, channel: "sms" }, OWNER(x));
          t(
            x.outbox[0].templateId === 6 && x.outbox[0].status === "copied",
            "an expired reply gets follow-up 6, SMS is copied (D67, D75)"
          );
        }
        t(
          !h.at("overdue", {}, "accountant").querySelector("[data-remind]"),
          "Accountant sees the list without Remind"
        );
      },
    ],
  },
  {
    n: 22,
    area: "Invoices",
    id: "invoice-email",
    name: "Invoice email",
    route: "email · ready message 12",
    action: "Open invoice",
    who: "Customer",
    notes:
      'Sender = business name, reply-to the owner, never "via Biz4Kit" (D35). Body is the ready message (12 for a bill, 4 for a reply) as sent from the outbox, or as it will be sent; email adds the subject and a one-line sign-off. PDF attached.',
    sample: { id: "I1" },
    states: [
      ["HTML", (ctx) => emailPage(ctx, false)],
      ["Plain text", (ctx) => emailPage(ctx, true)],
    ],
    checks: [
      (t, h) => {
        const s = h.s;
        const f = h.at("invoice-email", { id: "I1" });
        const own = s.members.find((m) => m.role === "owner");
        t(
          f.textContent.includes(s.workspace.name) &&
            f.textContent.includes(own.email),
          "sender is the business, reply-to the Owner (D35)"
        );
        t(
          !/via Biz4Kit/i.test(f.textContent) &&
            !f.querySelector('svg[aria-label="Biz4Kit"]'),
          "no Biz4Kit on the email (D35)"
        );
        t(
          f.textContent.includes(
            inr(h.biz.invoices.open(s, byId(s.invoices, "I1")))
          ),
          "the email quotes the invoice amount"
        );
      },
    ],
  },
  {
    n: 23,
    area: "Invoices",
    id: "invoice-pdf",
    name: "Invoice PDF",
    route: "PDF · A4 · /i/:token/pdf",
    action: "Download, attach to email",
    who: "Customer, Accountant",
    notes:
      "Same blocks as the editor and pay page, laid out for A4. GST fields from the CA checklist (supplier and customer GSTIN, place of supply, SAC per line, CGST + SGST, total in words). SAC codes, terms and the computer-generated note are samples until the CA signs off. No Biz4Kit mark on a document that carries money (D78).",
    sample: { id: "I1" },
    render: (ctx) => pdfPage(ctx),
    actions: {
      print: () => {
        window.print();
        return { text: "Print dialog opened. Choose Save as PDF to download." };
      },
    },
    checks: [
      (t, h) => {
        const s = h.s;
        for (const id of ["I1", "I6"]) {
          const inv = byId(s.invoices, id);
          const f = h.at("invoice-pdf", { id });
          t(
            f.querySelector("[data-pdf-total]")?.textContent ===
              inr(h.biz.invoices.total(s, inv)),
            `${noOf(inv)} PDF total from the data`
          );
          t(
            f.textContent.includes(
              inv.invNumber ? "TAX INVOICE" : "PROFORMA INVOICE"
            ),
            `${noOf(inv)} PDF title follows PI-/INV-`
          );
          t(
            !/Biz4Kit/.test(f.textContent) &&
              !f.querySelector(
                "svg use[href='#b4k-mark'], svg use[href='#b4k-lockup']"
              ),
            "no Biz4Kit mark on the PDF (D78)"
          );
        }
        t(
          inWords(9440) === "Nine Thousand Four Hundred Forty" &&
            inWords(125000) === "One Lakh Twenty Five Thousand",
          "amount in words (Indian numbering)"
        );
      },
    ],
  },
  {
    n: 24,
    area: "Payments",
    id: "record",
    name: "Record payment / upload proof",
    route: "modal",
    action: "Submit for approval",
    who: "All",
    notes:
      "Any member uploads; only the Owner (or a delegated Manager) approves. Proof required for UPI / bank, optional for cash. When the Owner is the only approver for the amount, Approve now is offered and logged as self-approved (D74). Phone: bottom sheet.",
    render: (ctx) => {
      const s = ctx.s;
      const id =
        (byId(s.invoices, ctx.params.id) && ctx.params.id) ||
        s.invoices.find(
          (i) =>
            B.payments.payable(s, i).ok &&
            B.invoices.open(s, i) >
              sum(B.invoices.pendingOf(s, i), (p) => p.amount)
        )?.id;
      return `<div class="relative h-full">${invoicesPage(ctx, recordPaymentDialog(ctx, id, "record", { open: true, after: "invoice" }))}</div>`;
    },
    actions: listActions,
    checks: [
      (t, h) => {
        /* record + approve turns PI → INV (D60, D71) */
        const x = structuredClone(h.s);
        const inv = x.invoices.find(
          (i) =>
            i.sharedAt &&
            !i.invNumber &&
            !i.cancelled &&
            h.biz.payments.payable(x, i).ok &&
            !h.biz.invoices.pendingOf(x, i).length &&
            !h.biz.invoices.isReplyLike(i)
        );
        const total = h.biz.invoices.total(x, inv);
        const next = x.workspace.numbering.INV.next;
        t(
          throws(() =>
            h.biz.payments.recordNow(
              x,
              { invoiceId: inv.id, amount: total, method: "upi" },
              STAFF(x)
            )
          ).includes("proof"),
          "UPI without proof is refused"
        );
        const { payment } = h.biz.payments.recordNow(
          x,
          {
            invoiceId: inv.id,
            amount: String(total),
            method: "upi",
            proof: { name: "upi.jpg" },
          },
          STAFF(x)
        );
        t(
          h.biz.invoices.statusOf(x, inv) === "pending" && !inv.invNumber,
          "a recorded payment waits for approval, still PI-"
        );
        h.biz.payments.approve(x, { id: payment.id }, OWNER(x));
        t(
          inv.invNumber?.endsWith(String(next).padStart(4, "0")) &&
            h.biz.invoices.statusOf(x, inv) === "paid",
          "approval turns the PI- into the next INV-"
        );
      },
      (t, h) => {
        /* Approve now: only when the Owner is the only approver (D74) */
        const x = structuredClone(h.s);
        const lim = x.workspace.approvals.managerLimit;
        const ok = (i) =>
          i.sharedAt &&
          !i.invNumber &&
          !i.cancelled &&
          h.biz.payments.payable(x, i).ok &&
          !h.biz.invoices.pendingOf(x, i).length;
        const big = x.invoices.find(
          (i) => ok(i) && h.biz.invoices.open(x, i) >= lim
        );
        const small = x.invoices.find(
          (i) => ok(i) && h.biz.invoices.open(x, i) < lim
        );
        if (big) {
          const r = h.biz.payments.recordNow(
            x,
            {
              invoiceId: big.id,
              amount: h.biz.invoices.open(x, big),
              method: "cash",
              approveNow: true,
            },
            OWNER(x)
          );
          t(
            r.payment.selfApproved && big.invNumber,
            "Owner as the only approver records and approves at once, logged self-approved"
          );
        }
        if (small)
          t(
            throws(() =>
              h.biz.payments.recordNow(
                x,
                {
                  invoiceId: small.id,
                  amount: h.biz.invoices.open(x, small),
                  method: "cash",
                  approveNow: true,
                },
                OWNER(x)
              )
            ).includes("Someone else"),
            "with a Manager able to approve, the Owner cannot approve their own upload"
          );
        t(Boolean(big || small), "sample has an open bill to record against");
        const f = h.at("record");
        t(
          f.querySelector(
            '[data-dialog="record"].open form[data-do="payments.recordNow"]'
          ),
          "the record dialog is open with a working form"
        );
        t(
          f.querySelectorAll('[data-dialog="record"] input[name="method"]')
            .length === 4,
          "method radios UPI, Bank, Cash, Card"
        );
      },
    ],
  },
  {
    n: 25,
    area: "Payments",
    id: "approvals",
    name: "Approval queue",
    route: "/w/:slug/approvals",
    action: "Approve / reject",
    who: "Owner",
    notes:
      "Approver cannot be the uploader when another approver exists; when only the Owner can approve the amount they may approve their own upload, logged (D74). A Manager approves only strictly below the limit (D57, D74). Approving gives the next INV- number (D60). More than the open balance is refused (D76). A payment on a snoozed lead shows a warning; rejected or expired replies cannot be paid (D73). Reject needs a note → message 16; approve sends receipt message 15.",
    render: (ctx) =>
      app(
        ctx,
        "approvals",
        { icon: "badge-check", title: "Approvals" },
        approvalsBody(ctx)
      ),
    checks: [
      (t, h) => {
        const s = h.s;
        const lim = s.workspace.approvals.managerLimit;
        const big = h.biz.payments.pending(s).find((p) => p.amount >= lim);
        if (big) {
          const ui = uiOf(h, "approvals", {});
          ui.pick = big.id;
          const f = h.at("approvals", {}, "manager");
          const b = f.querySelector(`[data-approve="${big.id}"]`);
          t(
            b?.disabled &&
              /Owner approves/.test(
                f.querySelector("[data-why]")?.textContent || ""
              ),
            "a Manager cannot approve at or above the limit, with the reason (D57, D74)"
          );
          t(
            throws(() =>
              h.biz.payments.approve(
                structuredClone(s),
                { id: big.id },
                MANAGER(s)
              )
            ).includes("below"),
            "the business layer refuses it too"
          );
          const o = h.at("approvals", {}, "owner");
          t(
            o.querySelector(
              `[data-approve="${big.id}"][data-do="payments.approve"]`
            ) && !o.querySelector(`[data-approve="${big.id}"]`).disabled,
            "the Owner can approve it"
          );
          delete ui.pick;
        }
        t(Boolean(big), "sample has a payment at or above the Manager limit");
        const f = h.at("approvals");
        t(
          f.querySelectorAll("[data-pay]").length ===
            h.biz.payments.pending(s).length,
          "lists every pending payment"
        );
      },
      (t, h) => {
        const x = structuredClone(h.s);
        const p = h.biz.payments.pending(x)[0];
        t(
          throws(() =>
            h.biz.payments.reject(x, { id: p.id, note: "" }, OWNER(x))
          ).includes("why"),
          "reject needs a note"
        );
        h.biz.payments.reject(
          x,
          { id: p.id, note: "Amount does not match" },
          OWNER(x)
        );
        t(
          p.status === "rejected" && x.outbox[0].templateId === 16,
          "reject tells the uploader (message 16)"
        );
        /* older version note (D76) */
        const y = structuredClone(h.s);
        const inv = y.invoices.find(
          (i) =>
            i.sharedAt &&
            !i.invNumber &&
            !h.biz.invoices.pendingOf(y, i).length &&
            h.biz.payments.payable(y, i).ok
        );
        const pay = h.biz.payments.record(
          y,
          { invoiceId: inv.id, amount: 100, method: "cash" },
          STAFF(y)
        ).payment;
        y.invoices
          .find((i) => i.id === inv.id)
          .history.push({
            version: 1,
            lines: inv.lines,
            discount: 0,
            total: h.biz.invoices.total(y, inv),
            at: y.meta.today,
          });
        inv.version = 2;
        h.biz.payments.approve(y, { id: pay.id }, OWNER(y));
        t(
          /version 1; applied to version 2/.test(pay.note),
          "a payment on an older version applies to the latest, noted (D76)"
        );
      },
    ],
  },
];

/* ---------- Invoice email ---------- */
function emailPage(ctx, plain) {
  const s = ctx.s;
  const ws = s.workspace;
  const inv =
    byId(s.invoices, ctx.params.id) ||
    s.invoices.find((i) => i.sharedAt && !i.invNumber) ||
    s.invoices[0];
  const c = custOf(s, inv.customerId);
  const own = ownerOf(s);
  const rl = B.invoices.isReplyLike(inv);
  const T = B.messages.T;
  const sent = s.outbox.find(
    (m) =>
      m.recordId === inv.id &&
      m.channel === "email" &&
      [T.invoiceShared, T.replyShared, T.replyRevised].includes(m.templateId)
  );
  const tpl = rl ? T.replyShared : T.invoiceShared;
  const amount = B.invoices.open(s, inv) || B.invoices.total(s, inv);
  const msg = sent || messageFor(s, inv, tpl, "email", amount);
  const vars = B.messages.varsFor(s, { invoice: { ...inv, _total: amount } });
  const sign = `— ${firstName(own?.name)}, ${ws.name}`;
  const no = noOf(inv) || "Draft";
  const head = (extra = "") =>
    `<div class="ccard p-4 @tab:p-5"><h1 class="text-title @tab:text-heading font-semibold">${esc(msg.subject)}</h1>
      <div class="mt-3 flex items-start gap-3">${bizMark(s, "size-control-lg shrink-0")}<div class="min-w-0 flex-1 text-caption text-customer-muted"><p class="text-body-sm text-customer-text"><span class="font-semibold" data-from>${esc(ws.name)}</span></p><p class="truncate">to ${esc(c.name)} &lt;${esc(c.email || "no email on file")}&gt;</p><p class="truncate">reply-to ${esc(own?.name || "")} &lt;${esc(own?.email || "")}&gt;</p></div><span class="shrink-0 text-caption text-customer-muted">${sent ? `${fmtDate(sent.at)}, ${fmtTime(sent.at)}` : inv.sharedAt ? `${fmtDate(inv.sharedAt)}${fmtTime(inv.sharedAt) ? `, ${fmtTime(inv.sharedAt)}` : ""}` : "Not sent yet"}</span></div>${extra}</div>`;
  const attach = `<a ${link("invoice-pdf", { id: inv.id })} class="mt-3 inline-flex items-center gap-2 p-2 pr-3 rounded-sm border border-customer-border hover:bg-customer-page">${I("file-text", "size-icon text-biz")}<span class="font-medium">${esc(no)}.pdf</span><span class="text-caption text-customer-muted">PDF</span></a>`;
  const footer = `${esc(ws.name)} · ${esc([ws.address, ws.city].filter(Boolean).join(", "))} · <span class="money">${esc(ws.phone)}</span>`;
  const wrap = (b) =>
    `<div class="doc h-full overflow-y-auto font-customer bg-customer-page text-customer-text"><div class="mx-auto max-w-2xl px-3 @tab:px-6 py-4 @tab:py-8 space-y-3">${b}</div></div>`;
  if (plain)
    return wrap(`${head()}
      <pre class="ccard p-4 @tab:p-6 font-mono text-code whitespace-pre-wrap">${esc(msg.body)}

${esc(sign)}

Attachment: ${esc(no)}.pdf
${esc(ws.name)} · ${esc([ws.address, ws.city].filter(Boolean).join(", "))} · ${esc(ws.phone)}</pre>`);
  const body = esc(msg.body).replace(
    esc(vars.link),
    `<a ${link("p-pay", { id: inv.id })} class="text-biz underline font-medium">${esc(vars.link)}</a>`
  );
  const dueRow = rl
    ? ["Pay by", inv.payBy ? fmtDate(inv.payBy) : "—"]
    : ["Due", inv.dueDate ? fmtDate(inv.dueDate) : "—"];
  return wrap(`${head(attach)}
      <div class="ccard overflow-hidden">
        <div class="bg-biz text-biz-foreground px-5 @tab:px-8 py-5 flex items-center gap-3"><span class="bg-customer-surface text-customer-text rounded-control px-2 py-1">${bizLogo(s, "h-6")}</span><span class="ml-auto text-label uppercase tracking-wider">${inv.invNumber ? "Tax invoice" : "Proforma invoice"}</span></div>
        <div class="px-5 @tab:px-8 py-6 space-y-4 text-body">
          <p class="whitespace-pre-line">${body}</p>
          <div class="rounded-sm bg-customer-page border border-customer-border divide-y divide-customer-border">${[
            ["Invoice", C(no)],
            [
              inv.invNumber ? "Amount paid" : "Amount due",
              `<span class="font-mono text-money-lg">${inr(inv.invNumber ? B.invoices.paid(s, inv) : amount)}</span>`,
            ],
            inv.invNumber ? ["Paid", fmtDate(paidOn(s, inv))] : dueRow,
            ["UPI ID", C(ws.upi || "—")],
          ]
            .map(
              (r) =>
                `<div class="flex items-center gap-3 px-4 min-h-row"><span class="text-customer-muted">${r[0]}</span><span class="ml-auto">${r[1]}</span></div>`
            )
            .join("")}</div>
          <a ${link("p-pay", { id: inv.id })} class="cbtn cbtn-biz">${I("receipt")}Open invoice</a>
          <p>${esc(sign)}</p>
        </div>
        <div class="px-5 @tab:px-8 py-4 border-t border-customer-border text-caption text-customer-muted">${footer}<br>Reply to this email to reach ${esc(firstName(own?.name))}.</div>
      </div>`);
}

/* ---------- Invoice PDF ---------- */
function pdfPage(ctx) {
  const s = ctx.s;
  const ws = s.workspace;
  const inv =
    byId(s.invoices, ctx.params.id) ||
    s.invoices.find((i) => i.sharedAt) ||
    s.invoices[0];
  const c = custOf(s, inv.customerId);
  const own = ownerOf(s);
  const pi = !inv.invNumber;
  const rl = B.invoices.isReplyLike(inv);
  const no = noOf(inv) || "Draft";
  const t = B.invoices.totals(s, inv);
  const ratio = t.subtotal ? (t.subtotal - t.discount) / t.subtotal : 0;
  const inter = t.igst > 0;
  const { rows, g } = totalsOf(s, inv);
  const th = (x, r = 1) =>
    `<th class="h-row-sm px-2 text-label uppercase tracking-wider font-semibold ${r ? "text-right" : "text-left"}">${x}</th>`;
  const field = (k, v) =>
    `<div class="flex gap-2"><span class="w-24 shrink-0 text-customer-muted">${k}</span><span class="font-medium">${v}</span></div>`;
  const pct = (x) => (g === null ? "" : ` ${x}%`);
  const taxCols = !t.gstOn
    ? []
    : inter
      ? [`IGST${pct(g)}`]
      : [
          `CGST${pct(g === null ? null : g / 2)}`,
          `SGST${pct(g === null ? null : g / 2)}`,
        ];
  const due = rl ? inv.payBy : inv.dueDate;
  const last = B.invoices
    .paymentsOf(s, inv)
    .filter((p) => p.status === "approved")
    .sort((a, b) => String(b.decidedAt).localeCompare(String(a.decidedAt)))[0];
  const terms = pi
    ? B.messages.fill(ws.terms || "", {
        due_date: due ? fmtLong(due) : "",
        business: ws.name,
        phone: ws.phone,
      })
    : `Paid in full on ${fmtLong(paidOn(s, inv))}${last?.method ? ` by ${B.payments.METHODS[last.method]}` : ""}${last?.reference ? ` (ref ${last.reference})` : ""}. Thank you. Questions: ${ws.phone}.`;
  const lineRows = inv.lines
    .map((l, i) => {
      const it = l.itemId ? byId(s.items, l.itemId) : null;
      const taxable = lineAmt(l) * ratio;
      const tax = t.gstOn ? (taxable * (l.gst ?? 0)) / 100 : 0;
      const taxCells = !t.gstOn ? [] : inter ? [tax] : [tax / 2, tax / 2];
      return `<tr class="border-b border-customer-border align-top"><td class="py-2 px-2">${i + 1}</td><td class="py-2 px-2"><div class="font-medium text-body-sm">${esc(l.name)}</div>${l.desc ? `<div class="text-customer-muted">${esc(l.desc)}</div>` : ""}${serialMeta(s, inv, l, "text-customer-muted")}</td><td class="py-2 px-2 code">${esc(l.hsn ?? it?.hsn ?? "") || "—"}</td><td class="py-2 px-2 text-right money">${l.qty}${l.unit ? ` ${esc(l.unit)}` : ""}</td><td class="py-2 px-2 text-right money">${inr(l.rate)}</td><td class="py-2 px-2 text-right money">${inr(taxable)}</td>${taxCells.map((x) => `<td class="py-2 px-2 text-right money">${inr(x)}</td>`).join("")}<td class="py-2 px-2 text-right money font-semibold">${inr(taxable + tax)}</td></tr>`;
    })
    .join("");
  /* Place of supply: the customer's state when their GSTIN gives it, else the business's own (CA to confirm B2C rules). */
  const cState = B.invoices.customerState(c);
  const placeState =
    cState && cState !== ws.stateCode
      ? `State code ${esc(cState)}`
      : `${esc(ws.state || "")}${ws.stateCode ? ` (${esc(ws.stateCode)})` : ""}`;
  return `<div class="h-full overflow-auto bg-muted p-4 @tab:p-page">
    <div class="mx-auto max-w-[794px] mb-3 flex justify-end gap-2 print:hidden"><a ${link("invoice", { id: inv.id })} class="btn btn-outline">${I("chevron-left")}Back to invoice</a><button type="button" class="btn btn-primary" data-do="print">${I("printer")}Print or save PDF</button></div>
    <div class="doc a4 font-customer bg-customer-surface text-customer-text text-caption shadow-lg flex flex-col">
      <div class="bg-biz text-biz-foreground px-12 py-8 flex items-center gap-4"><span class="bg-customer-surface text-customer-text rounded-control px-3 py-2">${bizLogo(s, "h-10")}</span>
        <div class="ml-auto text-right"><div class="text-heading font-bold tracking-wide">${pi ? "PROFORMA INVOICE" : "TAX INVOICE"}</div><div class="font-mono text-body">${esc(no)}</div>${pi ? `<div class="text-caption">Not a tax invoice</div>` : ""}</div></div>
      <div class="px-12 py-6 grid grid-cols-3 gap-6 border-b border-customer-border">
        <div><p class="text-label uppercase tracking-wider text-customer-muted">From</p><p class="mt-1 text-body font-semibold">${esc(ws.name)}</p>${own ? `<p>${esc(own.name)}</p>` : ""}<p>${esc([ws.address, ws.city].filter(Boolean).join(", "))}${ws.pin ? ` ${esc(ws.pin)}` : ""}</p><p>${esc(ws.state || "")}</p>${ws.gstin ? `<p class="mt-1">GSTIN ${C(ws.gstin)}</p>` : ""}<p class="money">${esc(ws.phone || "")}</p></div>
        <div><p class="text-label uppercase tracking-wider text-customer-muted">Bill to</p><p class="mt-1 text-body font-semibold">${esc(c.name)}</p>${c.address ? `<p>${esc(c.address)}</p>` : ""}${c.phone ? `<p class="money">${esc(c.phone)}</p>` : ""}${c.gstin ? `<p class="mt-1">GSTIN ${C(c.gstin)}</p>` : ""}</div>
        <div class="space-y-0.5">${field(pi ? "Proforma no." : "Invoice no.", C(no))}${field("Date", fmtLong(pi ? inv.sharedAt || inv.createdAt : paidOn(s, inv)))}${field(pi ? (rl ? "Pay by" : "Due date") : "Paid on", pi ? (due ? fmtLong(due) : "—") : fmtLong(paidOn(s, inv)))}${t.gstOn ? field("Place of supply", placeState) + field("Reverse charge", "No") : ""}${inv.version > 1 ? field("Version", String(inv.version)) : ""}</div>
      </div>
      <div class="px-12 pt-6"><table class="w-full border-collapse"><thead><tr class="bg-biz text-biz-foreground">${th("#", 0)}${th("Description", 0)}${th("HSN/SAC", 0)}${th("Qty")}${th("Rate")}${th("Taxable")}${taxCols.map((x) => th(x)).join("")}${th("Amount")}</tr></thead><tbody>
        ${lineRows}
      </tbody></table></div>
      <div class="px-12 py-4 grid grid-cols-[1fr_16rem] gap-8">
        <div><p class="text-label uppercase tracking-wider text-customer-muted">Amount in words</p><p class="mt-1 font-medium">Indian Rupees ${inWords(t.total)} Only</p></div>
        <div class="space-y-1">${rows
          .map(
            (r) =>
              `<div class="flex justify-between"><span class="text-customer-muted">${r[0] === "Taxable" ? "Taxable value" : r[0]}</span>${M(r[1])}</div>`
          )
          .join(
            ""
          )}<div class="flex justify-between items-baseline pt-2 mt-1 border-t border-customer-text font-semibold text-body"><span>Total</span><span class="font-mono text-money-lg" data-pdf-total>${inr(t.total)}</span></div></div>
      </div>
      ${pi ? "" : `<div class="mx-12 mt-2 p-3 rounded-sm bg-success-soft text-success font-semibold text-center">PAID · ${inr(B.invoices.paid(s, inv))} · ${fmtLong(paidOn(s, inv))}</div>`}
      ${
        pi
          ? `<div class="mx-12 mt-2 p-4 rounded-sm bg-biz-soft grid grid-cols-[6rem_1fr_1fr] gap-6 items-center">
        <div>${qr(96)}</div>
        <div><p class="text-label uppercase tracking-wider text-biz">Pay by UPI</p><p class="mt-1 code text-body-sm">${esc(ws.upi || "—")}</p><p class="text-customer-muted">Scan with any UPI app</p></div>
        <div><p class="text-label uppercase tracking-wider text-biz">Bank transfer</p>${ws.bank ? `<p class="mt-1">${esc(ws.name)} · ${esc(ws.bank.name)}</p><p>A/c ${C(ws.bank.account)}</p><p>IFSC ${C(ws.bank.ifsc)}</p>` : `<p class="mt-1 text-customer-muted">No bank details in Settings</p>`}</div>
      </div>`
          : ""
      }
      <div class="px-12 py-6 grid grid-cols-[1fr_14rem] gap-8">
        <div><p class="text-label uppercase tracking-wider text-customer-muted">Terms</p><p class="mt-1">${esc(terms)}</p>${pi ? "" : `<p class="mt-1 italic text-customer-muted">[Draft terms and SAC codes: CA to confirm (Legal &amp; compliance §7)]</p>`}</div>
        <div class="text-right"><p>For ${esc(ws.name)}</p><p class="mt-8 pt-1 border-t border-customer-border text-customer-muted">Authorised signatory</p></div>
      </div>
      <div class="mt-auto px-12 py-4 border-t border-customer-border flex text-customer-muted"><span>This is a computer-generated ${pi ? "proforma" : "invoice"}. <span class="italic">[Wording: CA to confirm]</span></span><span class="ml-auto">Page 1 of 1</span></div>
    </div></div>`;
}
