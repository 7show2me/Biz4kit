/* UI helpers: the same markup and classes as design/screens-v2.html, but every control is real
   (owner, 22 Oct: "make all tab, select, radio, input clickable and perform the action").
   - inputs carry a name; inside <form data-do="module.fn"> their values are the action's arguments
   - seg() / tabs() keep their choice in ctx.ui (per screen) and re-render
   - dataTable() searches, filters, selects and pages for real */
import { esc, inr } from "../core/util.js";

export { esc, inr };
export const I = (n, c = "size-icon") =>
  `<i data-lucide="${n}" class="${c} shrink-0"></i>`;
/* Phosphor icon (sidebar only): weight duotone, fill or regular. */
export const P = (n, w = "duotone", c = "") =>
  `<i class="${w === "regular" ? "ph" : `ph-${w}`} ph-${n} shrink-0 ${c}" aria-hidden="true"></i>`;
export const M = (n) => `<span class="money">${inr(n)}</span>`;
export const C = (s) => `<span class="code">${esc(s)}</span>`;
export const mark = (c = "h-4") =>
  `<svg class="${c} w-auto" viewBox="-14 -8 200.2 116" aria-hidden="true"><use href="#b4k-mark"/></svg>`;
export const lockup = (c = "h-7") =>
  `<svg class="${c} w-auto text-brand-ink" viewBox="-14 -8 443.6 116" role="img" aria-label="Biz4Kit"><use href="#b4k-lockup"/></svg>`;
export const av = (t, c = "") => `<span class="avatar ${c}">${esc(t)}</span>`;
export const link = (id, params = {}) =>
  `href="#screen=${id}${Object.entries(params)
    .map(([k, v]) => `&${k}=${encodeURIComponent(v)}`)
    .join("")}" data-go="${id}"${Object.entries(params)
    .map(([k, v]) => ` data-p-${k}="${esc(v)}"`)
    .join("")}`;
export const attrs = (o = {}) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => (v === true ? k : `${k}="${esc(v)}"`))
    .join(" ");

/* ---------- status pills (D26, D51, D55): word + icon + colour, unique within a record ---------- */
const OK = "bg-success-soft text-success",
  WARN = "bg-warning-soft text-warning",
  BAD = "bg-destructive text-destructive-foreground",
  INFO = "bg-info-soft text-info",
  VIOLET = "bg-violet-soft text-violet",
  TEAL = "bg-teal-soft text-teal",
  MUTE = "bg-muted text-muted-foreground";
export const ST = {
  paid: ["Paid", "circle-check", OK],
  due: ["Due", "clock", WARN],
  part_paid: ["Part paid", "circle-dot", TEAL],
  overdue: ["Overdue", "circle-alert", BAD],
  awaiting: ["Awaiting payment", "send", INFO],
  expired: ["Expired", "calendar-x", MUTE],
  draft: ["Draft", "file", MUTE],
  pending: ["Waiting for approval", "hourglass", VIOLET],
  approved: ["Approved", "circle-check", OK],
  new: ["New", "sparkle", INFO],
  contacted: ["Contacted", "phone", MUTE],
  snoozed: ["Snoozed", "alarm-clock", WARN],
  open: ["Open", "circle", MUTE],
  in_progress: ["In progress", "loader", INFO],
  done: ["Done", "circle-check", OK],
  invoiced: ["Invoiced", "receipt", VIOLET],
  replied: ["Replied", "send", VIOLET],
  rejected: ["Rejected", "circle-x", BAD],
  confirmed: ["Agreed", "calendar-check", TEAL],
  tentative: ["To confirm", "calendar-clock", MUTE],
  completed: ["Completed", "circle-check", OK],
  cancelled: ["Cancelled", "circle-x", MUTE],
  /* a cancelled booking is red: grey is To confirm (D55, D100) */
  booking_cancelled: ["Cancelled", "circle-x", BAD],
  no_show: ["No-show", "user-x", WARN],
  invited: ["Invited", "mail", WARN],
  active: ["Active", "circle-check", OK],
  /* serial numbers and warranty (D85) */
  no_serial: ["Serials missing", "scan-barcode", WARN],
  covered: ["In cover", "shield-check", OK],
  ended: ["Cover ended", "shield-off", MUTE],
};
export const FAMILY = {
  Reply: ["awaiting", "pending", "paid", "expired"],
  Invoice: ["draft", "due", "part_paid", "overdue", "paid", "pending"],
  Lead: ["new", "contacted", "replied", "snoozed", "rejected", "paid"],
  Job: ["open", "in_progress", "done", "invoiced"],
  Booking: ["confirmed", "tentative"],
  Payment: ["pending", "approved", "rejected"],
  Member: ["invited", "active"],
};
export const pill = (k) => {
  const [w, ic, cl] = ST[k] || [k, "circle", MUTE];
  return `<span class="pill ${cl}" data-status="${k}">${I(ic, "size-icon-sm")}${w}</span>`;
};
/* Booking status pill: Cancelled is red for bookings only (D100); invoices keep grey Cancelled. */
export const bookingPill = (st) =>
  pill(st === "cancelled" ? "booking_cancelled" : st);
export const chip = (t, ic) =>
  `<span class="chip">${ic ? I(ic, "size-icon-sm") : ""}${esc(t)}</span>`;

/* ---------- form controls (all real) ---------- */
export const flabel = (t, req = false, forId = "") =>
  `<label class="flabel" ${forId ? `for="${forId}"` : ""}>${t}${req ? ' <span class="text-destructive">*</span>' : ""}</label>`;
export const hint = (t) => `<p class="hint">${t}</p>`;

/* <input class="field">. opts: { type, value, placeholder, cls, req, attrs, id, money, list } */
export const input = (name, o = {}) =>
  `<input class="field ${o.money ? "money" : ""} ${o.cls || ""}" ${attrs({
    name,
    id: o.id,
    type: o.type || "text",
    value: o.value ?? "",
    placeholder: o.placeholder,
    required: o.req,
    min: o.min,
    max: o.max,
    step: o.step,
    inputmode: o.money ? "numeric" : o.inputmode,
    autocomplete: o.autocomplete || "off",
    list: o.list,
    ...o.attrs,
  })} />`;
/* Labelled field block. */
export const field = (label, name, o = {}) =>
  `<div class="${o.wrap || ""}">${flabel(label, o.req, o.id || `f-${name}`)}${input(name, { ...o, id: o.id || `f-${name}` })}${o.hint ? hint(o.hint) : ""}</div>`;
export const textarea = (name, o = {}) =>
  `<textarea class="field h-auto py-2 ${o.cls || ""}" ${attrs({ name, id: o.id, rows: o.rows || 3, placeholder: o.placeholder, required: o.req, ...o.attrs })}>${esc(o.value ?? "")}</textarea>`;
/* <select class="field">. options: [[value, label]] or ["label"] */
export const select = (name, options, value, o = {}) =>
  `<select class="field ${o.cls || ""}" ${attrs({ name, id: o.id, "aria-label": o.label, required: o.req, ...o.attrs })}>${options
    .map((op) => {
      const [v, t] = Array.isArray(op) ? op : [op, op];
      return `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(t)}</option>`;
    })
    .join("")}</select>`;
export const sel = select;
/* Toggle switch backed by a checkbox. */
export const toggle = (name, on, o = {}) =>
  `<label class="inline-flex cursor-pointer" ${o.title ? `title="${esc(o.title)}"` : ""}><input type="checkbox" class="sr-only" data-toggle ${attrs({ name, checked: Boolean(on), ...o.attrs })} /><span class="toggle ${on ? "on" : ""}" aria-hidden="true"><span></span></span><span class="sr-only">${esc(o.label || name)}</span></label>`;
/* Check box (square) backed by a checkbox. */
export const check = (name, on, o = {}) =>
  `<label class="inline-flex cursor-pointer"><input type="checkbox" class="sr-only" data-check ${attrs({ name, checked: Boolean(on), value: o.value, ...o.attrs })} /><span class="check ${on ? "bg-primary border-primary text-primary-foreground" : ""}" aria-hidden="true">${on ? I("check", "size-3") : ""}</span><span class="sr-only">${esc(o.label || "Select")}</span></label>`;
/* Radio group shown as a segmented control. Inside a form its value is submitted. */
export const radios = (name, options, value, o = {}) =>
  `<div class="seg noscroll ${o.cls || ""}" role="radiogroup" ${o.label ? `aria-label="${esc(o.label)}"` : ""}>${options
    .map((op) => {
      const [v, t] = Array.isArray(op) ? op : [op, op];
      const on = String(v) === String(value);
      return `<label class="${on ? "on" : ""} cursor-pointer"><input type="radio" class="sr-only" data-radio ${attrs({ name, value: v, checked: on })} />${t}</label>`;
    })
    .join("")}</div>`;

/* Search box: a real input; data-ui puts its value in ctx.ui[key] and re-renders (debounced). */
export const search = (ph, o = {}) =>
  `<label class="field ${o.cls || ""}">${I("search", "size-icon text-muted-foreground")}<input type="search" class="min-w-0 flex-1 bg-transparent outline-none" placeholder="${esc(ph)}" ${attrs(
    {
      name: o.name,
      value: o.value ?? "",
      "data-ui": o.ui,
      "aria-label": ph,
    }
  )} /></label>`;

/* Segmented tabs bound to ctx.ui[key]. items: [[value, label]] or ["label"]. */
export const seg = (ctx, key, items, def) => {
  const cur =
    ctx.ui[key] ?? def ?? (Array.isArray(items[0]) ? items[0][0] : items[0]);
  return `<div class="seg noscroll" role="tablist">${items
    .map((it) => {
      const [v, t] = Array.isArray(it) ? it : [it, it];
      return `<button type="button" role="tab" aria-selected="${String(v) === String(cur)}" class="${String(v) === String(cur) ? "on" : ""}" data-ui="${key}" data-v="${esc(v)}">${t}</button>`;
    })
    .join("")}</div>`;
};
export const uiv = (ctx, key, def) => ctx.ui[key] ?? def;

/* ---------- layout ---------- */
export const page = (b) => `<div class="p-4 @tab:p-page space-y-4">${b}</div>`;
export const toolbar = (left, right = "") =>
  `<div class="flex flex-wrap items-center gap-2">${left}<div class="ml-auto hidden @tab:flex items-center gap-2">${right}</div></div>`;
export const card = (b, c = "") => `<div class="card ${c}">${b}</div>`;
export const empty = (icon, title, body = "", action = "") =>
  `<div class="flex flex-col items-center justify-center gap-2 p-8 text-center"><span class="size-control-lg rounded-pill bg-muted text-muted-foreground flex items-center justify-center">${I(icon)}</span><p class="text-title font-semibold">${title}</p>${body ? `<p class="text-muted-foreground max-w-sm">${body}</p>` : ""}${action}</div>`;

/* KPI strip: one card, four cells. k: { t, icon, v, vTone, foot, tone, icon2, sub, go } */
export const kpis = (list) =>
  `<div class="card grid grid-cols-2 @web:grid-cols-4 overflow-hidden">${list
    .map(
      (
        k,
        i
      ) => `<${k.go ? `a ${link(k.go)}` : "div"} class="kpi-std block p-card-sm @tab:p-card min-w-0 border-border ${i % 2 ? "border-l" : ""} ${i > 1 ? "border-t @web:border-t-0" : ""} ${i === 2 ? "@web:border-l" : ""} ${k.go ? "hover:bg-muted/40" : ""}">
  <div class="flex items-center gap-2 text-muted-foreground">${I(k.icon, "size-icon-sm")}<span class="truncate">${k.t}</span></div>
  <div class="mt-3 font-mono text-money-lg ${k.vTone || ""}">${k.v}</div>
  <div class="mt-2 flex items-center gap-1.5 text-caption truncate"><span class="${k.tone || "text-muted-foreground"} flex items-center gap-1">${k.icon2 ? I(k.icon2, "size-icon-sm") : ""}${k.foot}</span>${k.sub ? `<span class="text-muted-foreground">• ${k.sub}</span>` : ""}</div></${k.go ? "a" : "div"}>`
    )
    .join("")}</div>`;

/* ---------- dialogs ---------- */
/* A dialog. Put a <form data-do="module.fn"> inside to make it act; data-close closes. */
export const modal = (id, title, body, open = false) =>
  `<div class="dlg ${open ? "open" : ""}" data-dialog="${id}" role="dialog" aria-modal="true" aria-labelledby="${id}-t"><div class="dlg-panel"><div class="grab"></div>
      <div class="flex items-center"><h2 id="${id}-t" class="text-title font-semibold">${title}</h2><button type="button" class="ml-auto btn btn-ghost btn-sm btn-icon" data-close aria-label="Close">${I("x")}</button></div>${body}</div></div>`;
export const actionsRow = (primary, extra = "") =>
  `<div class="mt-4 flex flex-wrap gap-2 justify-end"><button type="button" class="btn btn-ghost" data-close>Cancel</button>${extra}${primary}</div>`;

/* Message preview with channel tabs (D67: email is sent by the app, SMS / WhatsApp are copied).
   msg: { to, subject, body, from, replyTo }. channelName: the form field that carries the channel. */
export const shareBody = (
  ctx,
  key,
  msg,
  channels = ["email", "sms", "whatsapp"]
) => {
  const NAME = { email: "Email", sms: "SMS", whatsapp: "WhatsApp" };
  const cur =
    ctx.ui[key] && channels.includes(ctx.ui[key]) ? ctx.ui[key] : channels[0];
  const plain = String(msg.body || "");
  const words = plain.trim().split(/\s+/).filter(Boolean).length;
  return `<input type="hidden" name="channel" value="${cur}" />
  <div class="mt-3">${seg(
    ctx,
    key,
    channels.map((c) => [c, NAME[c]]),
    cur
  )}</div>
  ${cur === "email" ? `<div class="mt-3"><p class="flabel">Subject</p><div class="field">${esc(msg.subject || "")}</div></div>` : ""}
  <div class="mt-2 rounded-control bg-muted p-3 text-body whitespace-pre-line" data-msg>${esc(plain)}</div>
  <p class="hint">${
    cur === "email"
      ? `To ${esc(msg.to || "no email on file")} · sent as ${esc(msg.from || "")}${msg.replyTo ? ` · reply-to ${esc(msg.replyTo)}` : ""} · the only channel the app sends in Phase 1 (D35, D67)`
      : `${cur === "sms" ? `${plain.length} characters${plain.length > 160 ? ' · <span class="text-warning font-medium">over the 160-character SMS limit</span>' : ""}` : `${words} words`} · copied for you to paste; ${NAME[cur]} is not sent by the app in Phase 1 (D67)`
  }</p>`;
};

/* ---------- data table ----------
   Real search (ctx.ui[key+":q"]), filter chips (ctx.ui[key+":f"]), row selection, rows per page and pages.
   rows: [{ id, cells: [...], text: "searchable text", f: "filter value", go, params }]
   cols: [{ t, r (right), m (muted), web (web only), role: title / sub / end / status / act }] */
export function dataTable(
  ctx,
  {
    key,
    icon,
    title,
    ph = "Search",
    filters = null,
    cols,
    rows,
    compact = false,
    select = !compact,
    go = "",
    all = "",
    per = 10,
    actions = "",
  }
) {
  const q = String(ctx.ui[`${key}:q`] || "").toLowerCase();
  const f = ctx.ui[`${key}:f`] || "all";
  const picked = new Set(ctx.ui[`${key}:sel`] || []);
  let shown = rows.filter(
    (r) =>
      (!q ||
        String(r.text || r.cells.join(" "))
          .replace(/<[^>]+>/g, " ")
          .toLowerCase()
          .includes(q)) &&
      (f === "all" ||
        !filters ||
        r.f === f ||
        (Array.isArray(r.f) && r.f.includes(f)))
  );
  const n = shown.length;
  const size = compact ? per : +(ctx.ui[`${key}:per`] || per);
  const pages = Math.max(1, Math.ceil(n / size));
  const pg = Math.min(+(ctx.ui[`${key}:pg`] || 1), pages);
  shown = shown.slice((pg - 1) * size, pg * size);
  const hide = (c) => (c.web ? "hidden @web:table-cell" : "");
  const rowGo = (r) =>
    r.go || go
      ? `data-go="${r.go || go}" ${r.id ? `data-p-id="${esc(r.id)}"` : ""} ${Object.entries(
          r.params || {}
        )
          .map(([k, v]) => `data-p-${k}="${esc(v)}"`)
          .join(" ")}`
      : "";
  const head = `<div class="flex items-center gap-2 px-4 @tab:px-card-sm h-header">${I(icon, "size-icon text-muted-foreground")}<h2 class="text-title font-semibold truncate">${title}</h2><span class="count">${rows.length}</span>
    <div class="ml-auto flex items-center gap-2">${
      compact
        ? `<a ${all ? link(all) : ""} class="btn btn-ghost btn-sm">View all${I("arrow-right", "size-icon-sm")}</a>`
        : `${search(ph, { cls: "hidden @tab:flex w-56", ui: `${key}:q`, value: ctx.ui[`${key}:q`] || "" })}${
            filters
              ? `<label class="field w-auto">${I("list-filter", "size-icon-sm text-muted-foreground")}<select class="bg-transparent outline-none" data-ui="${key}:f" aria-label="Filter">${[
                  ["all", "All"],
                  ...filters,
                ]
                  .map(
                    ([v, t]) =>
                      `<option value="${esc(v)}" ${v === f ? "selected" : ""}>${esc(t)}</option>`
                  )
                  .join("")}</select></label>`
              : ""
          }${actions}`
    }</div></div>
    ${compact ? "" : `<div class="@tab:hidden px-4 pb-2">${search(ph, { ui: `${key}:q`, value: ctx.ui[`${key}:q`] || "" })}</div>`}`;
  const allOn = shown.length && shown.every((r) => picked.has(r.id));
  const table = `<div class="hidden @tab:block overflow-x-auto border-t border-border"><table class="tbl w-full border-collapse"><thead class="bg-muted"><tr>
    ${select ? `<th class="th w-10 pl-card-sm pr-0">${check("", allOn, { attrs: { "data-pick-all": key }, label: "Select all" })}</th>` : ""}${cols.map((c, i) => `<th class="th ${c.r ? "text-right" : ""} ${hide(c)} ${!select && i === 0 ? "pl-card-sm" : ""} ${i === cols.length - 1 ? "pr-card-sm" : ""}">${c.t}</th>`).join("")}</tr></thead>
    <tbody>${
      shown.length
        ? shown
            .map(
              (r) =>
                `<tr ${rowGo(r)} data-row="${esc(r.id || "")}" class="${rowGo(r) ? "cursor-pointer" : ""} hover:bg-muted ${picked.has(r.id) ? "bg-accent" : ""}">${select ? `<td class="td w-10 pl-card-sm pr-0" data-stop>${check("", picked.has(r.id), { attrs: { "data-pick": key, "data-id": r.id }, label: "Select row" })}</td>` : ""}${r.cells
                  .map(
                    (v, i) =>
                      `<td class="td ${cols[i].r ? "text-right" : ""} ${cols[i].m ? "text-muted-foreground" : ""} ${hide(cols[i])} ${!select && i === 0 ? "pl-card-sm" : ""} ${i === cols.length - 1 ? "pr-card-sm" : ""}" ${cols[i].role === "act" ? "data-stop" : ""}>${v}</td>`
                  )
                  .join("")}</tr>`
            )
            .join("")
        : `<tr><td class="td text-center text-muted-foreground" colspan="${cols.length + (select ? 1 : 0)}">Nothing matches.</td></tr>`
    }</tbody></table></div>`;
  const pick = (r, role) =>
    cols
      .map((c, i) => (c.role === role ? r.cells[i] : null))
      .filter((v) => v != null && v !== "");
  const list = `<ul class="@tab:hidden divide-y divide-border border-t border-border">${
    shown.length
      ? shown
          .map(
            (
              r
            ) => `<li ${rowGo(r)} class="flex items-center gap-3 px-4 py-2.5 min-h-touch ${rowGo(r) ? "cursor-pointer" : ""}">
    <div class="min-w-0 flex-1"><div class="truncate">${pick(r, "title")[0] ?? r.cells[0]}</div>${pick(r, "sub").length ? `<div class="text-caption text-muted-foreground truncate">${pick(r, "sub").join(" · ")}</div>` : ""}</div>
    <div class="shrink-0 flex flex-col items-end gap-1">${pick(r, "end").join("")}${pick(r, "status").join("")}</div>${pick(r, "act").length ? `<div class="shrink-0 flex items-center gap-1" data-stop>${pick(r, "act").join("")}</div>` : ""}</li>`
          )
          .join("")
      : `<li class="px-4 py-6 text-center text-muted-foreground">Nothing matches.</li>`
  }</ul>`;
  const btn = (p, label, ic) =>
    `<button type="button" class="btn ${p === pg ? "btn-primary" : "btn-outline"} btn-sm btn-icon" data-ui="${key}:pg" data-v="${p}" ${p < 1 || p > pages ? "disabled" : ""} aria-label="${label}">${ic ? I(ic, "size-icon-sm") : p}</button>`;
  const foot = compact
    ? ""
    : `<div class="flex items-center gap-3 px-4 @tab:px-card-sm h-header border-t border-border text-muted-foreground">
    <span class="hidden @tab:inline">Rows per page</span><label class="hidden @tab:inline-flex"><select class="field w-16 h-control-sm" data-ui="${key}:per" aria-label="Rows per page">${[5, 10, 20, 50].map((x) => `<option ${x === size ? "selected" : ""}>${x}</option>`).join("")}</select></label><span>${n ? `${(pg - 1) * size + 1}–${Math.min(pg * size, n)} of ${n}` : "0 of 0"}</span>${select && picked.size ? `<span class="hidden @web:inline">· ${picked.size} selected</span>` : ""}
    <div class="ml-auto flex items-center gap-1">${btn(pg - 1, "Previous", "chevron-left")}${Array.from({ length: Math.min(pages, 5) }, (_, i) => btn(i + 1, `Page ${i + 1}`)).join("")}${btn(pg + 1, "Next", "chevron-right")}</div></div>`;
  return `<div class="card overflow-hidden" data-table="${key}">${head}${table}${list}${foot}</div>`;
}

/* Fake QR (illustration only): business colour, mark in the centre. */
export function qr(size = 210) {
  let s = "";
  const n = 25,
    c = size / n;
  let seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49_297) % 233_280) / 233_280;
  const fd = (x, y) =>
    `<rect x="${x * c}" y="${y * c}" width="${7 * c}" height="${7 * c}" fill="var(--biz)"/><rect x="${(x + 1) * c}" y="${(y + 1) * c}" width="${5 * c}" height="${5 * c}" fill="#fff"/><rect x="${(x + 2) * c}" y="${(y + 2) * c}" width="${3 * c}" height="${3 * c}" fill="var(--biz)"/>`;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const inF = (x < 8 && y < 8) || (x > 16 && y < 8) || (x < 8 && y > 16),
        mid = x > 9 && x < 15 && y > 9 && y < 15;
      if (!inF && !mid && rnd() > 0.52)
        s += `<rect x="${x * c}" y="${y * c}" width="${c}" height="${c}" fill="var(--biz)"/>`;
    }
  return `<svg viewBox="0 0 ${size} ${size}" class="w-full h-auto" role="img" aria-label="QR code (illustration)"><rect width="${size}" height="${size}" fill="#fff"/>${s}${fd(0, 0)}${fd(18, 0)}${fd(0, 18)}<circle cx="${size / 2}" cy="${size / 2}" r="${c * 2.4}" fill="var(--biz)" stroke="#fff" stroke-width="3"/><circle cx="${size / 2}" cy="${size / 2 - 4}" r="3.5" fill="var(--biz-accent)"/></svg>`;
}
