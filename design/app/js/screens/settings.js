/* SETTINGS (n29): Brand, Business, Numbering, Team, Roles, Messages, Devices (D81). Owner only (app() shows
   the denied page to other roles). Owner, 22 Oct: "Add all Actual Build Screens" — every tab is a working panel.
   Team keeps v2's table; the other panels use the same cards, fields, flabel, hint and toggles. */
import { ROLES, can } from "../biz/perms.js";
import { esc, fail, fyCode, inr } from "../core/util.js";
import { call, run } from "../ui/actions.js";
import {
  I,
  C,
  M,
  av,
  link,
  modal,
  pill,
  chip,
  field,
  flabel,
  hint,
  input,
  textarea,
  select,
  toggle,
  seg,
  search,
  page,
  card,
  dataTable,
  actionsRow,
} from "../ui/kit.js";
import { app, bizMark, bizLogo } from "../ui/shell.js";

const TABS = [
  ["brand", "Brand"],
  ["business", "Business"],
  ["numbering", "Numbering"],
  ["team", "Team"],
  ["roles", "Roles"],
  ["messages", "Messages"],
  ["devices", "Devices"],
];
const HEX = /^#[0-9a-f]{6}$/i;
const LOGO_MAX = 1024 * 1024; // prototype keeps files in the browser tab (sessionStorage)

/* Which tab: params.tab (profile menu links) when the screen is newly opened, else the seg choice. */
function tabOf(ctx) {
  if (ctx.params.tab && ctx.ui._po !== ctx.params) ctx.ui.tab = ctx.params.tab;
  ctx.ui._po = ctx.params;
  const t = ctx.ui.tab;
  return TABS.some(([v]) => v === t) ? t : "team";
}

const panel = (id, body) =>
  `<div data-panel="${id}" class="space-y-4">${body}</div>`;
const cardHead = (icon, title, sub = "", right = "") =>
  `<div class="flex items-start gap-2">${I(icon, "size-icon text-muted-foreground mt-0.5")}<div class="min-w-0 flex-1"><h3 class="text-title font-semibold">${title}</h3>${sub ? `<p class="text-muted-foreground">${sub}</p>` : ""}</div>${right}</div>`;
const saveBtn = (label = "Save") =>
  `<button type="submit" data-need="settings" class="btn btn-primary">${I("check")}${label}</button>`;

/* ---------- Brand ---------- */
/* Colour picker and hex box both edit one colour; whichever changed last wins. */
function brandColours(prev, d) {
  const eff = {},
    show = {},
    raw = {};
  for (const k of ["primary", "accent"]) {
    const p = String(prev[k] || "").toLowerCase();
    const pick = String(d?.[`${k}_pick`] || "").toLowerCase();
    const hex = String(d?.[k] ?? p)
      .trim()
      .toLowerCase();
    const picked = pick && pick !== p;
    raw[k] = picked ? pick : hex;
    eff[k] = HEX.test(raw[k]) ? raw[k] : p;
    show[k] = picked ? pick : hex;
  }
  return { eff, show, raw };
}

function brandPanel(ctx) {
  const b = ctx.s.workspace.brand;
  const d = ctx.ui.brand;
  const prev = (d && ctx.ui.brandEff) || b;
  const { eff, show, raw } = brandColours(prev, d);
  ctx.ui.brandEff = eff;
  const row = (k, label, h) => `<div>${flabel(label, false, `f-${k}`)}
    <div class="flex items-center gap-2"><input type="color" name="${k}_pick" value="${eff[k]}" aria-label="${label} picker" class="h-control w-12 shrink-0 cursor-pointer rounded-control border border-border bg-card p-1" />${input(k, { id: `f-${k}`, value: show[k], cls: "font-mono w-36", placeholder: "#9f1239" })}</div>
    ${HEX.test(raw[k]) ? hint(h) : `<p class="hint text-destructive">Use a hex value like #9f1239.</p>`}</div>`;
  const preview = `<div class="rounded-card border border-border overflow-hidden" style="--biz:${eff.primary};--biz-accent:${eff.accent}" data-brand-preview>
      <div class="flex items-center gap-2 px-3 h-header border-b border-border bg-card">${bizLogo(ctx.s, "h-6")}<span class="ml-auto size-3 rounded-pill" style="background:${eff.accent}" title="Accent"></span></div>
      <div class="p-4 space-y-3 bg-background"><p class="font-customer font-semibold">Your reply ${C(`${ctx.s.workspace.numbering.PI.prefix}-${fyCode(ctx.today)}-${String(ctx.s.workspace.numbering.PI.next).padStart(4, "0")}`)}</p>
      <span class="inline-flex items-center gap-2 h-control px-4 rounded-control font-medium text-white" style="background:${eff.primary}">${I("check", "size-icon-sm")}Accept and pay</span>
      <p class="text-caption text-muted-foreground">How your customer pages, replies and invoices pick up your colours. The Biz4Kit app around you stays the same (D10–D19).</p></div></div>`;
  return panel(
    "brand",
    `<div class="grid @web:grid-cols-2 gap-4">
    ${card(
      `${cardHead("palette", "Colours", "Shown to your customers on your pages, replies and invoices.")}
      <form data-draft="brand" data-do="brandSave" class="mt-4 space-y-4">
        ${row("primary", "Primary colour", "Buttons, links and headers on your customer pages.")}
        ${row("accent", "Accent colour", "Small highlights, like the dot in your mark.")}
        <p class="hint">The viewer's <b>Own</b> brand follows these colours once saved.</p>
        <div class="flex justify-end gap-2">${d ? `<button type="button" class="btn btn-ghost" data-do="brandUndo">Undo changes</button>` : ""}${saveBtn()}</div>
      </form>`,
      "p-card-sm @tab:p-card"
    )}
    <div class="space-y-4">${card(`${cardHead("eye", "Preview")}<div class="mt-3">${preview}</div>`, "p-card-sm @tab:p-card")}
    ${card(
      `${cardHead("image", "Logo", "PNG, JPG or SVG. Square works best.")}
      <div class="mt-3 flex items-center gap-3">${bizMark(ctx.s, "size-control-lg shrink-0 rounded-pill")}<div class="min-w-0"><p class="font-medium">${b.logo ? "Your logo" : "No logo yet"}</p><p class="text-caption text-muted-foreground">${b.logo ? "Shown on your pages and documents." : "Until you add one, your pages show this mark in your colours."}</p></div></div>
      <form data-do="logoSave" class="mt-3 space-y-2">
        <label class="field cursor-pointer">${I("upload", "size-icon text-muted-foreground")}<span class="min-w-0 flex-1 truncate text-muted-foreground" id="logo-file">Choose an image</span><input type="file" name="logo" accept="image/*" class="sr-only" data-preview="#logo-file" /></label>
        <div class="flex justify-end gap-2">${b.logo ? `<button type="button" class="btn btn-ghost" data-do="settings.saveBrand" data-a-logo="" data-need="settings">${I("trash-2")}Remove logo</button>` : ""}<button type="submit" data-need="settings" class="btn btn-outline">${I("image-up")}Use this logo</button></div>
      </form>`,
      "p-card-sm @tab:p-card"
    )}</div>
  </div>`
  );
}

/* ---------- Business ---------- */
function businessPanel(ctx) {
  const w = ctx.s.workspace;
  const bank = w.bank || {};
  const f = (label, name, value, o = {}) =>
    field(label, name, { value: value ?? "", ...o });
  return panel(
    "business",
    `<form data-do="settings.saveBusiness" class="space-y-4">
    ${card(
      `${cardHead("building-2", "Company details", "Printed on every reply and invoice.")}
      <div class="mt-4 grid @tab:grid-cols-2 gap-3">
        ${f("Business name", "name", w.name, { req: true, wrap: "@tab:col-span-2" })}
        ${f("Address", "address", w.address, { wrap: "@tab:col-span-2" })}
        ${f("City", "city", w.city)}
        ${f("PIN", "pin", w.pin, { inputmode: "numeric", cls: "font-mono" })}
        ${f("State", "state", w.state)}
        ${f("Phone", "phone", w.phone, { type: "tel", cls: "font-mono" })}
        ${f("Email", "email", w.email, { type: "email", placeholder: "hello@yourbusiness.in", wrap: "@tab:col-span-2" })}
      </div>`,
      "p-card-sm @tab:p-card"
    )}
    <div class="grid @tab:grid-cols-2 gap-4">
    ${card(
      `${cardHead("receipt", "Tax and payments", "How customers pay you.")}
      <div class="mt-4 space-y-3">
        ${f("GSTIN", "gstin", w.gstin, { cls: "font-mono uppercase", placeholder: "27AAKFG4821M1Z3", hint: `15 characters. The first two digits set your state code${w.stateCode ? ` (now ${C(w.stateCode)})` : ""}. Leave empty if not registered.` })}
        ${f("UPI ID", "upi", w.upi, { cls: "font-mono", placeholder: "name@bank", hint: "Shown with the QR on replies and invoices." })}
        ${f("Bank name", "bank_name", bank.name)}
        <div class="grid grid-cols-2 gap-3">${f("Account number", "bank_account", bank.account, { cls: "font-mono", inputmode: "numeric" })}${f("IFSC", "bank_ifsc", bank.ifsc, { cls: "font-mono uppercase" })}</div>
      </div>`,
      "p-card-sm @tab:p-card"
    )}
    ${card(
      `${cardHead("file-text", "Replies and bills")}
      <div class="mt-4 space-y-3">
        <div class="grid grid-cols-2 gap-3">${f("Reply valid for (days)", "replyValidDays", w.replyValidDays, { type: "number", min: 1, cls: "money" })}${f("Bill due after (days)", "billDueDays", w.billDueDays, { type: "number", min: 0, cls: "money" })}</div>
        ${hint("An unpaid reply is not owed and expires after these days (D75). Bills fall due this many days after they are shared.")}
        <div>${flabel("Terms", false, "f-terms")}${textarea("terms", { id: "f-terms", rows: 5, value: w.terms })}${hint("Printed at the foot of replies and invoices. Placeholders like {due_date} are filled in. Keep the [Draft …] mark until your CA confirms the wording.")}</div>
      </div>`,
      "p-card-sm @tab:p-card"
    )}
    </div>
    <div class="flex justify-end">${saveBtn()}</div>
  </form>${hoursCard(ctx)}`
  );
}

/* Opening hours (D97, D99): up to two ranges per weekday; a day switched off is closed. Booking slots follow. */
function hoursCard(ctx) {
  const w = ctx.s.workspace;
  const d = ctx.ui.hrs?.hours || {};
  const rows = ctx.biz.settings.DAYS.map(([k, name]) => {
    const saved = w.hours?.[k] || [];
    const open =
      d[k]?.open !== undefined
        ? d[k].open === true || d[k].open === "true" || d[k].open === "on"
        : saved.length > 0;
    const r = (i, j) => d[k]?.ranges?.[i]?.[j === 0 ? "from" : "to"] ?? saved[i]?.[j] ?? "";
    const time = (i, j, label) =>
      input(`hours[${k}][ranges][${i}][${j === 0 ? "from" : "to"}]`, {
        id: `hr-${k}-${i}-${j}`,
        type: "time",
        step: 1800,
        value: r(i, j),
        cls: "h-control-sm w-28",
        attrs: { "aria-label": `${name} ${label}` },
      });
    return `<div class="flex flex-wrap items-center gap-3 py-2" data-day="${k}"><span class="w-28 font-medium">${name}</span>${toggle(`hours[${k}][open]`, open, { label: `${name} open` })}${
      open
        ? `<span class="flex items-center gap-1.5">${time(0, 0, "opens")}<span class="text-muted-foreground">to</span>${time(0, 1, "closes")}</span><span class="flex items-center gap-1.5"><span class="text-caption text-muted-foreground">and</span>${time(1, 0, "opens again")}<span class="text-muted-foreground">to</span>${time(1, 1, "closes again")}</span>`
        : `<span class="text-caption text-muted-foreground">Closed</span>`
    }</div>`;
  }).join("");
  const none = !Object.values(w.hours || {}).some((x) => x?.length);
  return card(
    `${cardHead("clock", "Opening hours", "Customers can book only inside these hours. Up to two ranges a day, e.g. 09:00 to 13:00 and 16:00 to 20:00 (D99).")}
    ${none ? `<p class="mt-2 hint text-warning flex items-center gap-1.5" data-hours-unset>${I("triangle-alert", "size-icon-sm")}No hours yet: the booking page shows you as closed until you set them (D97).</p>` : ""}
    <form data-do="settings.saveHours" data-draft="hrs" class="mt-3 divide-y divide-border">${rows}
      <div class="pt-3 flex items-center gap-2"><p class="hint">Leave the second range empty for one range. Slots start every 30 minutes and must end before closing.</p><span class="ml-auto">${saveBtn()}</span></div>
    </form>`,
    "p-card-sm @tab:p-card"
  );
}

/* ---------- Numbering, payment approvals, extras ---------- */
const numberOf = (prefix, next, today) =>
  `${prefix}-${fyCode(today)}-${String(next).padStart(4, "0")}`;

function numberingPanel(ctx) {
  const w = ctx.s.workspace;
  const n = w.numbering;
  const d = ctx.ui.num || {};
  const v = (series) => ({
    prefix: String(d[`${series}_prefix`] ?? n[series].prefix)
      .trim()
      .toUpperCase(),
    next: d[`${series}_next`] ?? n[series].next,
  });
  const pi = v("PI"),
    iv = v("INV");
  const errs = (series, x) => {
    const e = [];
    if (!/^[A-Z]{1,6}$/.test(x.prefix)) e.push("A prefix is 1 to 6 letters.");
    if (String(x.next) !== "" && +x.next < n[series].next)
      e.push(
        `The next ${series} number cannot go below ${n[series].next}: numbers are gap-free and never reused.`
      );
    if (series === "INV" && x.prefix === pi.prefix)
      e.push(
        "Proforma and tax invoice prefixes must differ (separate series, D60)."
      );
    return e;
  };
  const block = (series, x, title, sub) => {
    const e = errs(series, x);
    const nx = +x.next || n[series].next;
    return `<div class="rounded-control border border-border p-3 space-y-3" data-series="${series}">
      <div><p class="font-medium">${title}</p><p class="text-caption text-muted-foreground">${sub}</p></div>
      <div class="grid grid-cols-2 gap-3">${field("Prefix", `${series}_prefix`, { value: x.prefix, cls: "font-mono uppercase" })}${field("Next number", `${series}_next`, { value: x.next, type: "number", min: n[series].next, cls: "money" })}</div>
      <div class="flex flex-wrap items-center gap-2 text-caption text-muted-foreground"><span>Next:</span>${C(numberOf(x.prefix, nx, ctx.today))}<span>then</span>${C(numberOf(x.prefix, nx + 1, ctx.today))}${n[series].next > 1 ? `<span>· last used ${C(numberOf(n[series].prefix, n[series].next - 1, ctx.today))}</span>` : ""}</div>
      ${e.map((m) => `<p class="hint text-destructive flex items-center gap-1.5" data-num-error>${I("circle-alert", "size-icon-sm")}${m}</p>`).join("")}
    </div>`;
  };
  const ap = w.approvals || {};
  const mods = w.modules || {};
  const modRow = (k, label, sub) =>
    `<div class="flex items-center gap-3 py-2.5"><div class="min-w-0 flex-1"><p class="font-medium">${label}</p><p class="text-caption text-muted-foreground">${sub}</p></div>${toggle(k, mods[k] !== false, { label })}</div>`;
  return panel(
    "numbering",
    `${card(
      `${cardHead("hash", "Numbering", `Two separate series (D60, D71). Format ${C("PREFIX-FY-0000")}; FY ${C(fyCode(ctx.today))} is the Indian financial year, April to March.`)}
      <form data-draft="num" data-do="settings.saveNumbering" class="mt-4 space-y-3">
        <div class="grid @web:grid-cols-2 gap-3">${block("PI", pi, "Replies (proforma)", "Taken when a reply is shared.")}${block("INV", iv, "Tax invoices", "Taken only when approved payments cover the total (D71).")}</div>
        <p class="hint flex items-start gap-1.5">${I("lock", "size-icon-sm mt-0.5")}Numbers are gap-free and never reused. You may change a prefix or skip ahead, but the next number cannot go down (D71).</p>
        <div class="flex justify-end gap-2">${ctx.ui.num ? `<button type="button" class="btn btn-ghost" data-do="numUndo">Undo changes</button>` : ""}${saveBtn()}</div>
      </form>`,
      "p-card-sm @tab:p-card"
    )}
    <div class="grid @tab:grid-cols-2 gap-4">
    ${card(
      `<form data-do="settings.saveApprovals">
        ${cardHead("shield-check", "Payment approvals", "Managers can approve payments below an amount you choose (D57, D74).", `<span class="ml-auto">${toggle("managerEnabled", ap.managerEnabled, { label: "Manager approvals" })}</span>`)}
        <div class="mt-3 w-40">${field("Below", "managerLimit", { value: ap.managerLimit ?? "", type: "number", min: 1, money: true })}</div>
        <p class="hint">Now: ${ap.managerEnabled ? `Managers approve payments below ${M(ap.managerLimit)}` : "only you approve payments"}. ${APPROVAL_RULE}</p>
        <div class="mt-3 flex justify-end">${saveBtn()}</div>
      </form>`,
      "p-card-sm @tab:p-card"
    )}
    ${card(
      `${cardHead("puzzle", "Extras", "Lite mode (D63): turn off what you do not use. The sidebar updates at once.")}
      <form data-do="settings.saveModules" data-autosubmit class="mt-2 divide-y divide-border">
        ${modRow("board", "Board", "Leads as cards from New to Paid.")}
        ${modRow("customers", "Customers", "A list of everyone you have served.")}
        ${modRow("jobs", "Jobs", "Checklists for work after a booking.")}
        <div class="flex items-center gap-3 py-2.5"><div class="min-w-0 flex-1"><p class="font-medium">Serial numbers and warranty</p><p class="text-caption text-muted-foreground">Model, serial number and warranty or guarantee on invoice rows, a lookup by serial and a warranty card for the customer. On by default for wholesalers and manufacturers (D85).</p></div>${toggle("serials", mods.serials === true, { label: "Serial numbers and warranty" })}</div>
      </form>`,
      "p-card-sm @tab:p-card"
    )}
    </div>`
  );
}
const APPROVAL_RULE =
  "The Owner approves any amount. A Manager approves only strictly below the limit, never their own upload (unless the Owner is the only approver, then it is logged as self-approved), and never above the open balance (D57, D73, D74, D76).";

/* ---------- Team ---------- */
function teamPanel(ctx) {
  const s = ctx.s;
  const roleOpts = ["manager", "staff", "accountant"].map((r) => [r, ROLES[r]]);
  const lastSeen = (m) => {
    if (m.id === ctx.memberId) return "Now";
    const ds = s.devices.filter((x) => x.memberId === m.id);
    const at = ds
      .map((x) => x.lastActive || x.at || "")
      .sort()
      .pop();
    return at ? esc(String(at).slice(0, 16).replace("T", " ")) : "—";
  };
  const rows = s.members.map((m) => ({
    id: m.id,
    f: m.role,
    text: `${m.name} ${m.email} ${ROLES[m.role]} ${m.status}`,
    cells: [
      `<span class="flex items-center gap-2 min-w-0">${av(m.name ? m.initials : "?")}<span class="min-w-0">${m.name ? `<span class="block font-medium">${esc(m.name)}</span>` : ""}<span class="block text-caption text-muted-foreground truncate">${esc(m.email)}</span></span></span>`,
      m.role === "owner"
        ? ROLES.owner
        : `<span class="hidden @tab:inline-flex"><form data-do="settings.setRole" data-a-id="${m.id}" data-autosubmit>${select("role", roleOpts, m.role, { cls: "w-32 h-control-sm", label: `Role of ${m.name || m.email}`, attrs: { "data-need": "settings" } })}</form></span><span class="@tab:hidden">${ROLES[m.role]}</span>`,
      pill(m.status),
      lastSeen(m),
      m.role === "owner" || m.id === ctx.memberId
        ? ""
        : `<span class="inline-flex items-center gap-1">${m.status === "invited" ? `<a ${link("invite", { id: m.id })} class="btn btn-ghost btn-sm btn-icon" aria-label="Open invite for ${esc(m.email)}" title="Open invite">${I("external-link", "size-icon-sm")}</a>` : ""}<button type="button" class="btn btn-ghost btn-sm btn-icon" data-need="settings" data-open="remove-member" data-open-args="${esc(JSON.stringify({ rm: m.id }))}" aria-label="Remove ${esc(m.name || m.email)}" title="Remove">${I("user-minus", "size-icon-sm")}</button></span>`,
    ],
  }));
  const invited = s.members.filter((m) => m.status === "invited");
  return panel(
    "team",
    `${dataTable(ctx, {
      key: "team",
      icon: "users",
      title: "Team",
      ph: "Search members",
      filters: ["owner", "manager", "staff", "accountant"].map((r) => [
        r,
        ROLES[r],
      ]),
      select: false,
      cols: [
        { t: "Member", role: "title" },
        { t: "Role", role: "sub" },
        { t: "Status", role: "status" },
        { t: "Last active", m: 1, web: 1 },
        { t: "", role: "act" },
      ],
      rows,
      actions: `<button type="button" class="btn btn-primary btn-sm" data-open="invite-member" data-need="settings">${I("user-plus", "size-icon-sm")}Invite</button>`,
    })}
    <div class="grid @tab:grid-cols-2 gap-4">
      ${card(
        `${cardHead("mail", "Pending invites", "They join with Google from the invite link.", `<span class="count">${invited.length}</span>`)}
        ${
          invited.length
            ? `<ul class="mt-3 divide-y divide-border" data-invites>${invited
                .map(
                  (m) =>
                    `<li class="flex items-center gap-3 py-2"><div class="min-w-0 flex-1"><p class="truncate">${esc(m.email)}</p><p class="text-caption text-muted-foreground">${ROLES[m.role]}</p></div><a ${link("invite", { id: m.id })} class="btn btn-outline btn-sm">${I("external-link", "size-icon-sm")}Open invite</a></li>`
                )
                .join("")}</ul>`
            : `<p class="mt-3 text-muted-foreground">No pending invites.</p>`
        }`,
        "p-card-sm @tab:p-card"
      )}
      <div class="card p-card-sm @tab:p-card"><h3 class="text-title font-semibold">Transfer ownership</h3><p class="text-muted-foreground">You sign in again with Google first.</p><button type="button" data-need="settings" data-open="transfer" class="mt-3 btn btn-outline">${I("key-round")}Transfer</button></div>
    </div>`
  );
}

function teamDialogs(ctx) {
  const m = ctx.s.members.find((x) => x.id === ctx.ui.rm);
  return `${modal(
    "invite-member",
    "Invite a member",
    `<form data-do="settings.invite" class="mt-3 space-y-3">
      ${field("Email", "email", { type: "email", req: true, placeholder: "name@gmail.com", id: "inv-email" })}
      ${field("Name", "name", { placeholder: "Optional", id: "inv-name" })}
      <div>${flabel("Role", true, "inv-role")}${select(
        "role",
        ["manager", "staff", "accountant"].map((r) => [r, ROLES[r]]),
        "staff",
        { id: "inv-role" }
      )}${hint("See the Roles tab for what each role can do.")}</div>
      <p class="hint">Prototype: nothing is emailed. The invite appears under Pending invites; open it to join as that person.</p>
      ${actionsRow(`<button type="submit" class="btn btn-primary">${I("send")}Send invite</button>`)}
    </form>`
  )}${modal(
    "remove-member",
    "Remove from team",
    m
      ? `<form data-do="settings.removeMember" class="mt-2"><input type="hidden" name="id" value="${esc(m.id)}" />
      <p><span class="font-medium">${esc(m.name || m.email)}</span> (${ROLES[m.role]}) loses access to ${esc(ctx.s.workspace.name)}. Leads assigned to them become unassigned and their devices are signed out.</p>
      ${actionsRow(`<button type="submit" class="btn bg-destructive text-destructive-foreground">${I("user-minus")}Remove</button>`)}</form>`
      : `<p class="mt-2 text-muted-foreground">Pick a member to remove.</p>`
  )}${modal(
    "transfer",
    "Transfer ownership",
    `<p class="mt-2 text-muted-foreground">Ownership moves only after you sign in again with Google (1.3). The prototype has no Google sign-in, so this step is not simulated.</p>${actionsRow("")}`
  )}`;
}

/* ---------- Roles ---------- */
const WHAT = [
  ["write", "Create leads, send replies and invoices"],
  ["assign", "Assign leads and run the calendar"],
  ["catalog", "Edit the catalog and packages"],
  ["record", "Record payments and upload proof"],
  ["approve", "Approve payments"],
  ["export", "Export reports"],
  ["settings", "Settings and team"],
];
const WHO = ["owner", "manager", "staff", "accountant"];
function rolesPanel(ctx) {
  const ap = ctx.s.workspace.approvals || {};
  const cell = (r, w) => {
    if (!can(r, w))
      return `<span class="inline-flex text-muted-foreground" data-can="no" title="No">${I("minus", "size-icon-sm")}<span class="sr-only">No</span></span>`;
    if (w === "approve" && r === "manager")
      return ap.managerEnabled
        ? `<span class="inline-flex items-center gap-1 text-success" data-can="limit">${I("check", "size-icon-sm")}<span class="text-caption">below ${inr(ap.managerLimit)}</span></span>`
        : `<span class="inline-flex items-center gap-1 text-muted-foreground" data-can="off">${I("circle-minus", "size-icon-sm")}<span class="text-caption">off</span></span>`;
    return `<span class="inline-flex text-success" data-can="yes" title="Yes">${I("check", "size-icon-sm")}<span class="sr-only">Yes</span></span>`;
  };
  return panel(
    "roles",
    `<div class="card overflow-hidden">
      <div class="flex items-center gap-2 px-4 @tab:px-card-sm h-header">${I("shield", "size-icon text-muted-foreground")}<h2 class="text-title font-semibold">What each role can do</h2></div>
      <div class="overflow-x-auto border-t border-border"><table class="tbl w-full border-collapse" data-roles><thead class="bg-muted"><tr><th class="th pl-card-sm">Can</th>${WHO.map((r) => `<th class="th text-center">${ROLES[r]}</th>`).join("")}</tr></thead>
      <tbody>${WHAT.map(([w, t]) => `<tr data-what="${w}"><td class="td pl-card-sm">${t}</td>${WHO.map((r) => `<td class="td text-center">${cell(r, w)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    </div>
    <div class="grid @tab:grid-cols-2 gap-4">
      ${card(`${cardHead("shield-check", "Approving payments", APPROVAL_RULE)}<a ${link("settings", { tab: "numbering" })} class="mt-3 btn btn-outline btn-sm">${I("settings", "size-icon-sm")}Change the Manager limit</a>`, "p-card-sm @tab:p-card")}
      ${card(`${cardHead("info", "Good to know", "Staff see and run their own bookings and jobs. Biz4Kit support (Super-admin) sees a read-only view, and every visit is logged.")}`, "p-card-sm @tab:p-card")}
    </div>`
  );
}

/* ---------- Messages ---------- */
const KNOWN = [
  "business",
  "customer",
  "customer_first",
  "link",
  "upi",
  "doc_no",
  "invoice_no",
  "amount",
  "valid_until",
  "due_date",
  "date",
  "time",
  "staff",
  "service",
  "owner",
];
const holes = (t) => [
  ...new Set([...String(t || "").matchAll(/\{(\w+)\}/g)].map((m) => m[1])),
];
const isDraft = (t) => /\[Draft/i.test(`${t.subject || ""} ${t.body || ""}`);

function sampleVars(ctx, t) {
  const s = ctx.s;
  const live = s.invoices.filter((i) => !i.cancelled);
  const reply = t.id >= 4 && t.id <= 9;
  const invoice =
    live.find((i) =>
      reply ? i.kind === "reply" && i.piNumber : i.invNumber
    ) || live.find((i) => i.piNumber || i.invNumber);
  const booking = s.bookings[0];
  const pkg = booking && s.packages.find((p) => p.id === booking.packageId);
  return ctx.biz.messages.varsFor(s, {
    invoice,
    booking,
    member: ctx.me,
    extra: {
      ...(invoice ? { amount: inr(ctx.biz.invoices.total(s, invoice)) } : {}),
      ...(pkg ? { service: pkg.name } : {}),
    },
  });
}

function messagesPanel(ctx) {
  const list = ctx.s.templates;
  const q = String(ctx.ui.msgq || "").toLowerCase();
  const shown = list.filter(
    (t) =>
      !q ||
      `${t.id} ${t.name} ${t.subject || ""} ${t.body} ${t.audience || ""}`
        .toLowerCase()
        .includes(q)
  );
  const cur = list.find((t) => String(t.id) === String(ctx.ui.msg)) || list[0];
  if (!cur)
    return panel(
      "messages",
      card(
        `<p class="text-muted-foreground">No messages in the data.</p>`,
        "p-card"
      )
    );
  const key = `tpl${cur.id}`;
  const d = ctx.ui[key] || {};
  const subject = d.subject ?? cur.subject;
  const body = d.body ?? cur.body;
  const vars = sampleVars(ctx, cur);
  const fill = ctx.biz.messages.fill;
  const used = holes(`${subject || ""} ${body}`);
  const unfilled = used.filter((k) => !(vars[k] || vars[k] === 0));
  const chips = [...new Set([...KNOWN, ...used])];
  const changed =
    d.body !== undefined &&
    (d.body !== cur.body || (d.subject ?? cur.subject) !== cur.subject);
  return panel(
    "messages",
    `<div class="grid @web:grid-cols-[20rem_1fr] gap-4 items-start">
    <div class="card overflow-hidden">
      <div class="flex items-center gap-2 px-4 @tab:px-card-sm h-header">${I("message-square-text", "size-icon text-muted-foreground")}<h2 class="text-title font-semibold">Ready messages</h2><span class="count">${list.length}</span></div>
      <div class="px-4 @tab:px-card-sm pb-2">${search("Search messages", { ui: "msgq", value: ctx.ui.msgq || "" })}</div>
      <ul class="border-t border-border divide-y divide-border max-h-[32rem] overflow-y-auto" data-msg-list>${
        shown.length
          ? shown
              .map(
                (t) =>
                  `<li><button type="button" data-ui="msg" data-v="${t.id}" class="w-full text-left flex items-start gap-2 px-4 @tab:px-card-sm py-2.5 hover:bg-muted ${t.id === cur.id ? "bg-accent" : ""}" ${t.id === cur.id ? 'aria-current="true"' : ""}><span class="code w-6 shrink-0">${t.id}</span><span class="min-w-0 flex-1"><span class="block truncate font-medium">${esc(t.name)}</span><span class="block text-caption text-muted-foreground truncate">${esc(t.audience || "")}${t.trigger ? ` · ${esc(t.trigger)}` : ""}</span></span>${isDraft(t) ? `<span class="pill bg-warning-soft text-warning shrink-0">Draft</span>` : ""}</button></li>`
              )
              .join("")
          : `<li class="px-4 py-6 text-center text-muted-foreground">Nothing matches.</li>`
      }</ul>
    </div>
    <div class="space-y-4">
    ${card(
      `${cardHead("pencil", `${cur.id}. ${esc(cur.name)}`, `${esc(cur.audience || "")}${cur.trigger ? ` · when: ${esc(cur.trigger)}` : ""}`, isDraft(cur) ? `<span class="pill bg-warning-soft text-warning shrink-0" data-draft-mark>${I("triangle-alert", "size-icon-sm")}[Draft, owner to approve]</span>` : "")}
      <form data-draft="${key}" data-do="settings.saveTemplate" data-a-id="${cur.id}" class="mt-4 space-y-3">
        ${cur.subject === null ? hint("Internal message: no subject line.") : field("Subject", "subject", { value: subject ?? "", id: "tpl-subject" })}
        <div>${flabel("Message", true, "tpl-body")}${textarea("body", { id: "tpl-body", rows: 5, value: body })}</div>
        <div class="flex justify-end gap-2">${changed ? `<button type="button" class="btn btn-ghost" data-do="tplUndo" data-a-id="${cur.id}">Undo changes</button>` : ""}${saveBtn()}</div>
      </form>
        <div class="mt-3 flex flex-wrap items-center gap-1.5" data-chips><span class="text-caption text-muted-foreground">Add:</span>${chips.map((k) => `<button type="button" class="chip hover:bg-muted" data-do="tplInsert" data-a-k="${k}" data-a-id="${cur.id}" title="Add {${k}} to the message">${I("braces", "size-icon-sm")}${k}</button>`).join("")}</div>`,
      "p-card-sm @tab:p-card"
    )}
    ${card(
      `${cardHead("eye", "Preview", "Filled with sample values from your data.")}
      ${cur.subject !== null ? `<div class="mt-3"><p class="flabel">Subject</p><div class="field" data-preview-subject>${esc(fill(subject, vars))}</div></div>` : ""}
      <div class="mt-2 rounded-control bg-muted p-3 text-body whitespace-pre-line" data-preview-body>${esc(fill(body, vars))}</div>
      <p class="hint">Sent as ${esc(ctx.s.workspace.name)}, reply-to the Owner (D35). Email is sent by the app; SMS and WhatsApp are copied for you to paste (D67). ${fill(body, vars).length} characters.</p>
      ${unfilled.length ? `<p class="hint text-warning flex items-start gap-1.5" data-unfilled>${I("triangle-alert", "size-icon-sm mt-0.5")}No sample value for ${unfilled.map((k) => C(`{${k}}`)).join(" ")}: it stays as written.</p>` : ""}`,
      "p-card-sm @tab:p-card"
    )}
    </div></div>`
  );
}

/* ---------- Devices ---------- */
function thisBrowser() {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const b = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  const os = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad/.test(ua)
      ? "iOS"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return {
    name: `${b}${os ? ` on ${os}` : ""}`,
    phone: /Android|iPhone/.test(ua),
  };
}

function devicesPanel(ctx) {
  const s = ctx.s;
  const ds = s.devices || [];
  const row = (d, m, current, real = true) =>
    `<li class="flex items-center gap-3 py-2.5" data-device="${esc(d.id || "this")}">
      <span class="size-control rounded-control bg-muted text-muted-foreground flex items-center justify-center shrink-0">${I(d.phone || /phone|android|ios/i.test(d.name || "") ? "smartphone" : "laptop", "size-icon")}</span>
      <div class="min-w-0 flex-1"><p class="font-medium truncate">${esc(d.name || "Device")}${current ? ` <span class="chip ml-1">This device</span>` : ""}</p><p class="text-caption text-muted-foreground truncate">${esc(m?.name || m?.email || "")}${d.where ? ` · ${esc(d.where)}` : ""}${
        d.lastActive || d.at
          ? ` · ${esc(
              String(d.lastActive || d.at)
                .slice(0, 16)
                .replace("T", " ")
            )}`
          : current
            ? " · now"
            : ""
      }</p></div>
      ${real && !current ? `<button type="button" class="btn btn-outline btn-sm" data-do="settings.revokeDevice" data-a-id="${esc(d.id)}" data-need="settings">${I("log-out", "size-icon-sm")}Sign out</button>` : ""}
    </li>`;
  const byMember = s.members
    .map((m) => [m, ds.filter((d) => d.memberId === m.id)])
    .filter(([, list]) => list.length);
  const body = ds.length
    ? byMember
        .map(
          ([m, list]) =>
            `<div class="pt-3"><p class="label">${esc(m.name || m.email)} · ${ROLES[m.role]}</p><ul class="divide-y divide-border">${list.map((d) => row(d, m, d.current)).join("")}</ul></div>`
        )
        .join("")
    : `<ul class="mt-3 divide-y divide-border">${row(thisBrowser(), ctx.me, true, false)}</ul><p class="mt-2 text-muted-foreground" data-devices-empty>No other signed-in devices. When your team signs in on a phone or computer, it shows here and you can sign it out.</p>`;
  return panel(
    "devices",
    card(
      `${cardHead("monitor-smartphone", "Signed-in devices", "Sign out a lost phone or a shared computer. To leave this device, use Sign out in your menu.", `<span class="count">${ds.length || 1}</span>`)}${body}`,
      "p-card-sm @tab:p-card"
    )
  );
}

/* ---------- screen ---------- */
const PANELS = {
  brand: brandPanel,
  business: businessPanel,
  numbering: numberingPanel,
  team: teamPanel,
  roles: rolesPanel,
  messages: messagesPanel,
  devices: devicesPanel,
};
const OWNER = (s) => ({ role: "owner", memberId: s.meta.people.owner });

export default [
  {
    n: 29,
    area: "Settings",
    id: "settings",
    name: "Settings",
    route: "/w/:slug/settings/*",
    action: "Save",
    who: "Owner",
    notes:
      "Tabs: Brand, Business, Numbering, Team, Roles, Messages, Devices (D81). Re-auth before billing and deletion (1.3).",
    render: (ctx) => {
      const tab = tabOf(ctx);
      return app(
        ctx,
        "settings",
        {
          icon: "settings",
          title: "Settings",
          crumb: TABS.find(([v]) => v === tab)[1],
          dialogs: tab === "team" ? teamDialogs(ctx) : "",
        },
        page(`
    <div class="overflow-x-auto noscroll">${seg(ctx, "tab", TABS, tab)}</div>
    ${PANELS[tab](ctx)}`)
      );
    },
    actions: {
      brandSave: (ctx, args) => {
        const prev = ctx.ui.brandEff || ctx.s.workspace.brand;
        const { raw } = brandColours(prev, args);
        delete ctx.ui.brandEff;
        return call(
          "Settings: brand",
          (s, c) =>
            ctx.biz.settings.saveBrand(
              s,
              { primary: raw.primary, accent: raw.accent },
              c
            ),
          ctx
        );
      },
      brandUndo: (ctx) => {
        delete ctx.ui.brand;
        delete ctx.ui.brandEff;
        return { text: "Colours put back" };
      },
      logoSave: (ctx, { logo }) => {
        if (!logo) fail("Choose an image first.");
        if (logo.type && !/^image\//.test(logo.type))
          fail("Pick an image file (PNG, JPG or SVG).");
        if (logo.size > LOGO_MAX)
          fail(
            "This prototype keeps files in the browser tab: pick an image under 1 MB."
          );
        if (!logo.url)
          fail("The image is still loading. Try again in a moment.");
        return call(
          "Settings: logo",
          (s, c) => ({
            ...ctx.biz.settings.saveBrand(s, { logo: logo.url }, c),
            text: "Logo saved",
          }),
          ctx
        );
      },
      numUndo: (ctx) => {
        delete ctx.ui.num;
        return { text: "Numbering put back" };
      },
      tplInsert: (ctx, { k, id }) => {
        const t = ctx.s.templates.find((x) => String(x.id) === String(id));
        if (!t) fail("Message not found.");
        const key = `tpl${t.id}`;
        const d = ctx.ui[key] || {};
        const body = d.body ?? t.body;
        ctx.ui[key] = {
          ...(t.subject !== null ? { subject: d.subject ?? t.subject } : {}),
          body: `${body}${!body || /\s$/.test(body) ? "" : " "}{${k}}`,
        };
        return { text: `Added {${k}} to the message. Save to keep it.` };
      },
      tplUndo: (ctx, { id }) => {
        delete ctx.ui[`tpl${id}`];
        return { text: "Message put back" };
      },
    },
    checks: [
      (t, h) => {
        for (const [v, label] of TABS) {
          const f = h.at("settings", { tab: v });
          t(
            f.querySelector(`[data-panel="${v}"]`),
            `${label} tab renders its panel`
          );
          t(
            f.querySelector(
              `[role=tablist] [data-v="${v}"][aria-selected="true"]`
            ),
            `${label} tab is selected`
          );
          const p = f.querySelector("main");
          for (const el of p.querySelectorAll("i[data-lucide]"))
            t(false, `${label}: unknown icon "${el.dataset.lucide}"`);
          const ids = [...f.querySelectorAll("[id]")].map((e) => e.id);
          t(new Set(ids).size === ids.length, `${label}: duplicate ids`);
          for (const el of p.querySelectorAll("button, a"))
            t(
              el.textContent.trim() ||
                el.getAttribute("aria-label") ||
                el.title,
              `${label}: ${el.tagName} without a name`
            );
          for (const el of p.querySelectorAll(
            "input:not([type=hidden]):not(.sr-only), select, textarea"
          ))
            t(
              el.name ||
                el.dataset.ui ||
                el.getAttribute("aria-label") ||
                el.id,
              `${label}: control without a name`
            );
          for (const el of p.querySelectorAll("[data-open]"))
            t(
              f.querySelector(`[data-dialog="${el.dataset.open}"]`),
              `${label}: missing dialog ${el.dataset.open}`
            );
          for (const el of p.querySelectorAll("[data-do]"))
            t(
              h.makeCtx().screen?.actions?.[el.dataset.do] ||
                /^settings\./.test(el.dataset.do),
              `${label}: unknown action ${el.dataset.do}`
            );
        }
        const f = h.at("settings", { tab: "brand" }, "staff");
        t(
          !f.querySelector("[data-panel]") &&
            /Not available/.test(f.textContent),
          "Staff sees the denied page"
        );
      },
      (t, h) => {
        const o = OWNER(h.s);
        const r = run(
          "settings.saveBusiness",
          { name: "Glow Studio & Spa", city: "Pune", bank_ifsc: "HDFC0009999" },
          o
        );
        const w = h.makeCtx().s.workspace;
        t(
          r.ok &&
            w.name === "Glow Studio & Spa" &&
            w.city === "Pune" &&
            w.bank.ifsc === "HDFC0009999",
          "saving business details changes the workspace"
        );
        const f = h.at("settings", { tab: "business" });
        t(
          f.querySelector('[name="name"]')?.value === "Glow Studio & Spa",
          "the form shows the saved name"
        );
        const bad = run("settings.saveBusiness", { gstin: "12345" }, o);
        t(
          !bad.ok &&
            /GSTIN/.test(bad.error) &&
            h.makeCtx().s.workspace.gstin === w.gstin,
          "a wrong GSTIN is refused and nothing changes"
        );
      },
      (t, h) => {
        const o = OWNER(h.s);
        const before = h.s.members.length;
        const r = run(
          "settings.invite",
          { email: "new.staff@gmail.com", name: "Neha Patil", role: "staff" },
          o
        );
        const s = h.makeCtx().s;
        const m = s.members.find((x) => x.email === "new.staff@gmail.com");
        t(
          r.ok && s.members.length === before + 1 && m?.status === "invited",
          "invite adds a member"
        );
        const f = h.at("settings", { tab: "team" });
        t(
          f.querySelector(
            `[data-invites] [data-go="invite"][data-p-id="${m?.id}"]`
          ),
          "the pending invite links to Accept invite"
        );
        t(
          f.textContent.includes("new.staff@gmail.com"),
          "the new member is in the team table"
        );
        const again = run(
          "settings.invite",
          { email: "new.staff@gmail.com", role: "staff" },
          o
        );
        t(!again.ok, "the same email cannot be invited twice");
        const rr = run("settings.setRole", { id: m.id, role: "manager" }, o);
        t(
          rr.ok &&
            h.makeCtx().s.members.find((x) => x.id === m.id).role === "manager",
          "changing the role select changes the member"
        );
      },
      (t, h) => {
        const n = h.s.workspace.numbering.INV.next;
        const ui = h.makeCtx(undefined, "settings", "owner", {}).ui;
        ui.num = { INV_next: String(n - 1) };
        const f = h.at("settings", { tab: "numbering" });
        t(
          /cannot go below/.test(
            f.querySelector('[data-series="INV"] [data-num-error]')
              ?.textContent || ""
          ),
          "numbering cannot go down shows the error"
        );
        delete ui.num;
        const r = run(
          "settings.saveNumbering",
          { INV_next: String(n - 1) },
          OWNER(h.s)
        );
        t(
          !r.ok && /cannot go below/.test(r.error),
          "saving a lower number is refused"
        );
        const up = run(
          "settings.saveNumbering",
          { PI_prefix: "pr", PI_next: "60" },
          OWNER(h.s)
        );
        const g = h.at("settings", { tab: "numbering" });
        t(
          up.ok &&
            g
              .querySelector('[data-series="PI"]')
              .textContent.includes(`PR-${fyCode(h.s.meta.today)}-0060`),
          "the preview shows the next number"
        );
      },
      (t, h) => {
        const o = OWNER(h.s);
        t(
          run(
            "settings.saveModules",
            { board: false, customers: true, jobs: true },
            o
          ).ok,
          "extras save"
        );
        const f = h.at("settings", { tab: "numbering" });
        t(
          !f.querySelector('aside [data-page][data-go="board"]'),
          "turning Board off removes it from the sidebar"
        );
        const a = run(
          "settings.saveApprovals",
          { managerEnabled: false, managerLimit: "8000" },
          o
        );
        t(
          a.ok && h.makeCtx().s.workspace.approvals.managerLimit === 8000,
          "approvals save"
        );
        const g = h.at("settings", { tab: "roles" });
        t(
          g.querySelectorAll("[data-roles] tbody tr").length === WHAT.length &&
            g.querySelector('[data-what="approve"] [data-can="off"]'),
          "roles matrix follows the approval setting"
        );
      },
      (t, h) => {
        const o = OWNER(h.s);
        const b = run(
          "settings.saveBrand",
          { primary: "#0f766e", accent: "#0ea5e9" },
          o
        );
        t(
          b.ok && h.makeCtx().s.workspace.brand.primary === "#0f766e",
          "brand colours save"
        );
        t(
          !run("settings.saveBrand", { primary: "teal" }, o).ok,
          "a colour that is not hex is refused"
        );
        const f = h.at("settings", { tab: "messages" });
        t(
          f.querySelectorAll("[data-msg-list] li").length ===
            h.s.templates.length,
          "all ready messages are listed"
        );
        t(
          (f.querySelector("[data-preview-body]")?.textContent || "").includes(
            h.makeCtx().s.workspace.name
          ),
          "the preview fills in the business name"
        );
        const ui = h.makeCtx(undefined, "settings", "owner", {}).ui;
        ui.msg = "18";
        const g = h.at("settings", { tab: "messages" });
        t(
          !g.querySelector("[data-draft-mark]") &&
            g.textContent.includes("About your request to"),
          "message 18 has its approved wording (D95)"
        );
        delete ui.msg;
        const sv = run(
          "settings.saveTemplate",
          { id: "2", subject: "Got it", body: "Thanks {customer_first}." },
          o
        );
        t(
          sv.ok &&
            h.makeCtx().s.templates.find((x) => x.id === 2).body ===
              "Thanks {customer_first}.",
          "saving a message changes it"
        );
      },
      (t, h) => {
        const f = h.at("settings", { tab: "devices" });
        t(
          h.s.devices.length || f.querySelector("[data-devices-empty]"),
          "devices show the current browser and an empty-state line when none are stored"
        );
        const s = h.makeCtx().s;
        s.devices.push(
          { id: "D90", memberId: "M3", name: "Android phone" },
          { id: "D91", memberId: "M1", name: "This laptop", current: true }
        );
        const g = h.at("settings", { tab: "devices" });
        t(
          g.querySelector(
            '[data-device="D90"] [data-do="settings.revokeDevice"]'
          ),
          "another device can be signed out"
        );
        t(
          run("settings.revokeDevice", { id: "D90" }, OWNER(s)).ok &&
            !h.makeCtx().s.devices.some((d) => d.id === "D90"),
          "sign out removes the device"
        );
        t(
          !run("settings.revokeDevice", { id: "D91" }, OWNER(s)).ok,
          "the current device is refused"
        );
      },
    ],
  },
];
