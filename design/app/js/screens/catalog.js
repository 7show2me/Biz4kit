/* CATALOG: Items list (13), Item editor (14), Packages (15) and the Quick Catalog share sheet (D77).
   Order in the lists is the public page order (drag the grip). Everything reads ctx.s through the business
   layer; every control acts. Message wording is ready message 1 from the data (templates). */
import * as store from "../core/store.js";
import { byId, esc, fail } from "../core/util.js";
import { call } from "../ui/actions.js";
import {
  I,
  C,
  M,
  actionsRow,
  chip,
  dataTable,
  field,
  flabel,
  hint,
  input,
  inr,
  link,
  modal,
  page,
  qr,
  radios,
  seg,
  select,
  shareBody,
  textarea,
  toggle,
  toolbar,
} from "../ui/kit.js";
import { app } from "../ui/shell.js";

const bySort = (a, b) => (a.sort ?? 0) - (b.sort ?? 0);
/* Item photos (D87): the first is the picture on your catalog page. Inside the item form: a chosen photo is
   added when the item is saved; remove is a button of its own. */
const itemPhotos = (ctx, it) => {
  const list = it.photos || [];
  const max = ctx.biz.catalog.MAX_ITEM_PHOTOS;
  return `<div class="card p-card-sm" data-item-photos><p class="flabel">Photos · ${list.length} of ${max}</p>
    ${list.length ? `<div class="grid grid-cols-2 gap-2">${list.map((p, i) => `<div class="relative aspect-square rounded-control bg-muted overflow-hidden" data-photo="${esc(p.id)}">${p.url ? `<img src="${esc(p.url)}" alt="${esc(p.name)}" class="size-full object-cover">` : `<span class="absolute inset-0 flex items-center justify-center p-1 text-caption text-muted-foreground text-center break-all">${esc(p.name)}</span>`}${i === 0 ? `<span class="absolute bottom-1 left-1 chip bg-card">Cover</span>` : ""}<button type="button" data-need="catalog" data-do="catalog.removeItemPhoto" data-a-id="${it.id}" data-a-photo-id="${esc(p.id)}" class="absolute top-1 right-1 btn btn-ghost btn-sm btn-icon bg-card/80" aria-label="Remove photo ${esc(p.name)}">${I("x", "size-icon-sm")}</button></div>`).join("")}</div>` : ""}
    ${list.length < max ? `<label class="mt-2 field cursor-pointer">${I("image-plus", "size-icon text-muted-foreground")}<span class="min-w-0 flex-1 truncate text-muted-foreground" id="it-photo-name">Choose a photo</span><input type="file" name="photo" accept="image/*" class="sr-only" data-preview="#it-photo-name" aria-label="Add a photo" /></label>${hint("Added when you save. The first photo shows on your catalog page.")}` : hint(`Up to ${max} photos. Remove one to add another.`)}</div>`;
};
/* Serial and warranty block of the item editor (D85): shown only when the feature is on in Settings, Extras. */
const serialFields = (it) =>
  `<fieldset class="rounded-control border border-border p-3 space-y-3" data-serial-fields>
    <legend class="px-1 flabel mb-0">Serial number and warranty</legend>
    <label class="flex items-center gap-3"><span class="flex-1"><span class="block font-medium">Serial number for each unit</span><span class="block text-caption text-muted-foreground">Each unit sold gets its own invoice row and serial (D85). Off for services.</span></span>${toggle("serials", it.serials, { label: "Serial number for each unit" })}</label>
    <div class="grid grid-cols-2 gap-3">
      ${field("Model name", "model", { value: it.model || "", id: "it-model", placeholder: "Optional" })}
      ${field("Model number", "modelNo", { value: it.modelNo || "", id: "it-modelno", placeholder: "Optional", cls: "code" })}
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>${flabel("Cover", false, "it-cover")}${select(
        "cover",
        [
          ["", "None"],
          ["warranty", "Warranty"],
          ["guarantee", "Guarantee"],
        ],
        it.cover || "",
        { id: "it-cover" }
      )}</div>
      ${field("Months", "coverMonths", { value: it.coverMonths || "", id: "it-months", type: "number", min: 0, money: true, placeholder: "12" })}
    </div>
    <label class="flex items-center gap-3"><span class="flex-1"><span class="block font-medium">Batch / lot number</span><span class="block text-caption text-muted-foreground">Asks for the plant's batch or lot on each row.</span></span>${toggle("trackBatch", it.trackBatch, { label: "Batch / lot number" })}</label>
    ${hint("Model and cover show on the proforma and tax invoice; the serial only on the tax invoice (D86). Cover runs from the invoice date. Each row can change it.")}
  </fieldset>`;
const slugify = (t) =>
  String(t || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const hours = (min) => {
  const h = Math.floor(min / 60),
    m = min % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
};
const BILLING = [
  ["one_time", "One time"],
  ["monthly", "Monthly"],
];
const billingName = (b) => (BILLING.find((x) => x[0] === b) || [b, b])[1];
const TIERS = ["Basic", "Standard", "Premium"];
const tiered = (p) => p.tier && p.tier !== "none";
const grip = `<span data-handle class="hidden @tab:inline-flex cursor-grab text-muted-foreground" title="Drag to reorder" aria-label="Drag to reorder">${I("grip-vertical", "size-icon-sm")}</span>`;
/* Make a dataTable's rows draggable: tbody gets data-sortable, each row data-id. */
const sortableRows = (html, kind) =>
  html
    .replace(
      "<tbody>",
      `<tbody data-sortable="catalog.reorder" data-a-kind="${kind}">`
    )
    .replace(/data-row="([^"]*)"/g, 'data-id="$1" data-row="$1"');

/* ---------- Quick Catalog share sheet (also opened from Today) ---------- */
/* Item to share: itemId, else ctx.ui["share:item"] (set by data-open-args), else the whole price list. */
export function shareCatalogDialog(ctx, itemId = null) {
  const s = ctx.s;
  const ws = s.workspace;
  const m = ctx.biz.messages;
  const id = itemId ?? ctx.ui["share:item"] ?? "";
  const item = id ? byId(s.items, id) : null;
  const base = `${ws.slug}.biz4kit.com`;
  const url = item ? `${base}/${slugify(item.name)}` : base;
  const custId =
    ctx.ui["share:to"] ||
    ctx.params.customer ||
    ctx.biz.leads.toAnswer(s)[0]?.customerId ||
    s.customers[0]?.id;
  const c = byId(s.customers, custId);
  const owner = s.members.find((x) => x.role === "owner");
  const channels = ["whatsapp", "sms", "email"];
  const cur = channels.includes(ctx.ui["share:ch"])
    ? ctx.ui["share:ch"]
    : channels[0];
  const t = m.template(s, m.T.priceList);
  const vars = m.varsFor(s, {
    customerId: c?.id,
    member: ctx.me,
    extra: { link: url, sender: ctx.me?.name || owner?.name || "" },
  });
  const msg = {
    to: m.addressOf(c, cur),
    subject: t.subject ? m.fill(t.subject, vars) : `${t.name} · ${ws.name}`,
    body: m.fill(t.body, vars),
    from: ws.name,
    replyTo: owner?.email || "",
  };
  const noEmail = cur === "email" && !msg.to;
  const buttons =
    cur === "email"
      ? `<button type="submit" data-need="write" class="btn btn-primary" ${noEmail ? "disabled" : ""}>${I("send")}Send email</button><button type="button" class="btn btn-outline" data-copy>${I("copy")}Copy email</button>`
      : `<button type="submit" data-need="write" class="btn btn-primary">${I(cur === "sms" ? "message-square" : "message-circle")}Copy for ${cur === "sms" ? "SMS" : "WhatsApp"}</button><button type="button" class="btn btn-outline" data-copy-text="${esc(url)}">${I("link")}Copy link</button>`;
  return modal(
    "share-catalog",
    item ? "Share one item" : "Share your price list",
    `<form data-do="messages.send" data-a-template-id="${m.T.priceList}">
      <input type="hidden" name="to" value="${esc(msg.to)}" /><input type="hidden" name="subject" value="${esc(msg.subject)}" /><input type="hidden" name="body" value="${esc(msg.body)}" /><input type="hidden" name="recordId" value="${esc(item?.id || "")}" />
      <p class="text-muted-foreground">${item ? `${esc(item.name)} · from your catalog` : `Your price list · ${esc(base)}`}</p>
      <div class="mt-2 flex items-center gap-2"><span class="text-muted-foreground shrink-0">To</span>${select(
        "",
        s.customers.map((x) => [
          x.id,
          `${x.name}${x.phone ? ` · ${x.phone}` : ""}`,
        ]),
        c?.id,
        { label: "Send to customer", attrs: { "data-ui": "share:to" } }
      )}</div>
      ${shareBody(ctx, "share:ch", msg, channels)}
      ${noEmail ? `<p class="hint text-warning">${esc(c?.name || "This customer")} has no email on file. Use WhatsApp or SMS, or add an email on the customer.</p>` : ""}
      <div class="mt-3 grid grid-cols-2 gap-2">${buttons}</div>
    </form>
    <div class="mt-4 pt-3 border-t border-border flex items-center gap-3"><div class="w-20 shrink-0">${qr(80)}</div><div class="min-w-0"><p class="font-medium">QR for your counter</p><p class="text-caption text-muted-foreground">Opens ${C(url)}</p><div class="mt-1 flex gap-2"><button type="button" class="btn btn-outline btn-sm" data-copy-text="${esc(url)}">${I("copy", "size-icon-sm")}Copy link</button><a ${link("p-catalog")} class="btn btn-outline btn-sm">${I("external-link", "size-icon-sm")}Open page</a></div></div></div>`
  );
}

/* ---------- CSV import ---------- */
/* Rows of a CSV text: [{ line, cells }]; a header row starting with "name" is skipped. */
export function parseCsv(text) {
  const rows = [];
  const lines = String(text || "")
    .replace(/^﻿/, "")
    .split(/\r?\n/);
  lines.forEach((raw, i) => {
    if (!raw.trim()) return;
    const cells = [];
    let cur = "",
      q = false;
    for (let k = 0; k < raw.length; k++) {
      const ch = raw[k];
      if (q) {
        if (ch === '"' && raw[k + 1] === '"') {
          cur += '"';
          k++;
        } else if (ch === '"') q = false;
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ",") {
        cells.push(cur);
        cur = "";
      } else cur += ch;
    }
    cells.push(cur);
    rows.push({ line: i + 1, cells: cells.map((x) => x.trim()) });
  });
  if (rows[0] && rows[0].cells[0].toLowerCase() === "name") rows.shift();
  return rows;
}
const dataUrlText = (url) => {
  const bin = atob(String(url).split(",")[1] || "");
  return new TextDecoder().decode(
    Uint8Array.from(bin, (ch) => ch.charCodeAt(0))
  );
};

/* ---------- shared screen actions ---------- */
/* Drag sends only the rows on screen (one category, one page); keep everything else where it was. */
const reorderAction = (ctx, { kind = "items", ids = [] }) => {
  const list = [...ctx.s[kind]].sort(bySort);
  const moved = new Set(ids);
  const full = list.map((r) => r.id);
  list
    .map((r, i) => (moved.has(r.id) ? i : -1))
    .filter((i) => i >= 0)
    .forEach((slot, k) => (full[slot] = ids[k]));
  return call(
    `Catalog: reorder ${kind}`,
    (s, c) => ctx.biz.catalog.reorder(s, { kind, ids: full }, c),
    ctx
  );
};

const unitsOf = (s, cur) => [
  ...new Set(
    [...s.items.map((i) => i.unit).filter(Boolean), cur].filter(Boolean)
  ),
];
const gstRates = (s, cur) =>
  [
    ...new Set(
      [...s.items.map((i) => i.gst), cur].filter(
        (g) => g !== null && g !== undefined && g !== ""
      )
    ),
  ].sort((a, b) => a - b);

/* ---------- dialogs on the Items list ---------- */
const quickItem = (ctx) => {
  const s = ctx.s;
  const cat =
    ctx.ui.cat && ctx.ui.cat !== "all" ? ctx.ui.cat : s.categories[0] || "";
  return `<form data-do="quickAdd"><div class="space-y-3">${field("Name", "name", { req: true, placeholder: "Item name" })}
    <div class="grid grid-cols-2 gap-3">${field("Price", "price", { req: true, money: true, placeholder: "₹" })}<div>${flabel("Category", false, "qa-cat")}${select("category", s.categories, cat, { id: "qa-cat" })}</div></div>
    <label class="flex items-center">Show price on catalog<span class="ml-auto">${toggle("showPrice", true, { label: "Show price on catalog" })}</span></label>
    <button type="submit" name="then" value="edit" data-need="catalog" class="inline-flex items-center gap-1 text-caption underline">${I("sliders-horizontal", "size-icon-sm")}Add, then edit more details: unit, GST, HSN, description</button></div>
    ${hint("Unit and GST are copied from the other items in that category; change them in the item editor.")}
    ${actionsRow(`<button type="submit" data-need="catalog" class="btn btn-primary">${I("plus")}Add item</button>`)}</form>`;
};

const importDialog = (ctx) => {
  const log = ctx.ui["csv:log"];
  return `<form data-do="importCsv" data-keep-open>
    <p class="text-muted-foreground">One item per line: ${C("name,category,price")}. A first line that starts with "name" is skipped. A new category is added.</p>
    <div class="mt-3">${flabel("CSV file", false, "csv-file")}<input class="field" type="file" id="csv-file" name="file" accept=".csv,text/csv,text/plain" data-preview="#csv-file-name" /><p class="hint" id="csv-file-name">No file chosen</p></div>
    <div class="mt-2">${flabel("Or paste lines", false, "csv-text")}${textarea("csvText", { id: "csv-text", rows: 4, placeholder: "Beard trim,Hair,300" })}</div>
    ${
      log
        ? `<div class="mt-3 rounded-control border border-border p-3 space-y-1" data-csv-log><p class="font-medium">${log.added} added${log.errors.length ? `, ${log.errors.length} not added` : ""}</p>${log.errors.map((e) => `<p class="text-caption text-destructive">Line ${e.line}: ${esc(e.msg)}</p>`).join("")}</div>`
        : ""
    }
    ${actionsRow(`<button type="submit" data-need="catalog" class="btn btn-primary">${I("file-spreadsheet")}Import</button>`)}</form>`;
};

/* ---------- Packages dialog ---------- */
const packageDialog = (ctx) => {
  const s = ctx.s;
  const p = ctx.ui["pkg:id"] ? byId(s.packages, ctx.ui["pkg:id"]) : null;
  const name = p?.name ?? ctx.ui["pkg:name"] ?? "";
  const tier = p ? (tiered(p) ? p.tier : "") : (ctx.ui["pkg:tier"] ?? "");
  const qtyOf = (itemId) => p?.items.find((x) => x.itemId === itemId)?.qty ?? 0;
  const items = [...s.items].sort(bySort);
  const named = (p?.items || []).filter((x) => !x.itemId);
  let k = 0;
  const catRows = items
    .map((it) => {
      const i = k++;
      return `<div class="flex items-center gap-2 px-3 h-row"><input type="hidden" name="items[${i}][itemId]" value="${esc(it.id)}" /><span class="flex-1 min-w-0 truncate">${esc(it.name)}${it.active ? "" : ' <span class="text-caption text-muted-foreground">(hidden)</span>'}</span><span class="text-caption text-muted-foreground">${M(it.price)}</span>${input(`items[${i}][qty]`, { type: "number", min: 0, value: qtyOf(it.id), cls: "w-16 h-control-sm text-right money", attrs: { "aria-label": `Quantity of ${it.name}` } })}</div>`;
    })
    .join("");
  const namedRow = (x) => {
    const i = k++;
    return `<div class="flex items-center gap-2 px-3 h-row"><input type="hidden" name="items[${i}][itemId]" value="" />${input(`items[${i}][name]`, { value: x.name || "", placeholder: "Other line, not in the catalog", cls: "flex-1 h-control-sm" })}${input(`items[${i}][qty]`, { type: "number", min: 0, value: x.qty ?? 1, cls: "w-16 h-control-sm text-right money", attrs: { "aria-label": "Quantity" } })}</div>`;
  };
  return `<form data-do="catalog.savePackage" ${p ? `data-a-id="${esc(p.id)}"` : ""}><div class="space-y-3">
    <div class="grid grid-cols-2 gap-3">${field("Name", "name", { req: true, value: name, placeholder: "Package name" })}<div>${flabel("Tier", false, "pk-tier")}${select("tier", [["", "No tier"], ...TIERS], tier, { id: "pk-tier" })}</div></div>
    <div><p class="flabel">Items</p><div class="rounded-control border border-border divide-y divide-border max-h-64 overflow-y-auto">${catRows}${named.map(namedRow).join("")}${namedRow({ name: "", qty: 1 })}</div>${hint("Quantity 0 leaves an item out. These become the invoice lines.")}</div>
    <div class="grid grid-cols-2 gap-3">${field("Price", "price", { req: true, money: true, value: p?.price ?? "" })}<div><p class="flabel">Billing</p>${radios("billing", BILLING, p?.billing || "one_time", { label: "Billing" })}</div></div>
    <div class="grid grid-cols-2 gap-3 items-end"><label class="flex items-center h-control">Bookable<span class="ml-auto">${toggle("bookable", p?.bookable ?? false, { label: "Bookable" })}</span></label>${field("Duration (minutes)", "durationMin", { type: "number", min: 15, step: 15, value: p?.durationMin ?? "" })}</div>
    ${field("Advance %", "advancePct", { type: "number", min: 1, max: 100, value: p?.advancePct ?? "", placeholder: "Not set", hint: "No default (D66): set the share this package asks up front, or leave empty and choose on each reply." })}
    <div>${flabel("Description", false, "pk-desc")}${textarea("desc", { id: "pk-desc", rows: 2, value: p?.desc || "" })}</div>
    <label class="flex items-center">Active on the catalog<span class="ml-auto">${toggle("active", p?.active ?? true, { label: "Active" })}</span></label></div>
    ${actionsRow(`<button type="submit" data-need="catalog" class="btn btn-primary">${I("check")}${p ? "Save package" : "Add package"}</button>`)}</form>`;
};
const pkgLines = (s, p) =>
  p.items
    .map((x) => {
      const n = x.itemId ? byId(s.items, x.itemId)?.name : x.name;
      return n ? `${n}${x.qty > 1 ? ` ×${x.qty}` : ""}` : "";
    })
    .filter(Boolean);
const openPkg = (o) =>
  `data-open="pkg-edit" data-open-args="${esc(JSON.stringify({ "pkg:id": "", "pkg:name": "", "pkg:tier": "", ...o }))}"`;

const SCREENS_SELF = [
  {
    n: 13,
    area: "Catalog",
    id: "catalog",
    name: "Items list",
    route: "/w/:slug/catalog",
    action: "Add item, reorder, import CSV",
    who: "Owner, Manager",
    notes:
      'V2 Quick Catalog: "Your page" card on top; Share price list opens the share sheet (WhatsApp first, link, QR, ready message 1); each row shares one item; Add item asks only name and price. Drag order = public page order; "Request a quote" hides a price.',
    render: (ctx) => {
      const s = ctx.s;
      const base = `${s.workspace.slug}.biz4kit.com`;
      const cat = ctx.ui.cat || "all";
      const items = [...s.items]
        .sort(bySort)
        .filter((i) => cat === "all" || i.category === cat);
      const vis = (i) =>
        !i.active ? "hidden" : i.showPrice ? "shown" : "quote";
      const table = dataTable(ctx, {
        key: "items",
        icon: "book-open",
        title: "Items",
        go: "item",
        ph: "Search items",
        filters: [
          ["shown", "Price shown"],
          ["quote", "Request a quote"],
          ["hidden", "Hidden"],
        ],
        cols: [
          { t: "Item", role: "title" },
          { t: "Category", m: 1, role: "sub" },
          { t: "Unit", m: 1, web: 1 },
          { t: "GST", web: 1 },
          { t: "On catalog", role: "status" },
          { t: "Price", r: 1, role: "end" },
          { t: "", role: "act" },
        ],
        rows: items.map((r) => ({
          id: r.id,
          text: `${r.name} ${r.category} ${r.desc || ""}`,
          f: vis(r),
          cells: [
            `<span class="flex items-center gap-2">${grip}${r.photos?.[0]?.url ? `<img src="${esc(r.photos[0].url)}" alt="" class="size-control-sm rounded-xs object-cover shrink-0" data-thumb>` : `<span class="size-control-sm rounded-xs bg-muted flex items-center justify-center shrink-0">${I("image", "size-icon-sm text-muted-foreground")}</span>`}<span class="font-medium ${r.active ? "" : "text-muted-foreground line-through"}">${esc(r.name)}</span></span>`,
            esc(r.category),
            `per ${esc(r.unit)}`,
            r.gst === null || r.gst === undefined ? "—" : C(`${r.gst}%`),
            r.active
              ? `<button type="button" class="chip hover:bg-muted" data-need="catalog" data-do="catalog.toggleItem" data-a-id="${r.id}" data-a-field="showPrice" title="${r.showPrice ? "Switch to Request a quote" : "Show the price"}">${I(r.showPrice ? "eye" : "eye-off", "size-icon-sm")}${r.showPrice ? "Price shown" : "Request a quote"}</button>`
              : chip("Hidden", "archive"),
            M(r.price),
            `<span class="flex justify-end gap-1"><button type="button" class="btn btn-ghost btn-sm btn-icon" data-open="share-catalog" data-open-args="${esc(JSON.stringify({ "share:item": r.id }))}" aria-label="Share this item" title="Share this item">${I("share-2", "size-icon-sm")}</button><button type="button" class="btn btn-ghost btn-sm btn-icon" data-need="catalog" data-do="catalog.toggleItem" data-a-id="${r.id}" data-a-field="active" aria-label="${r.active ? "Hide from catalog" : "Show on catalog"}" title="${r.active ? "Hide from catalog" : "Show on catalog"}">${I(r.active ? "archive" : "archive-restore", "size-icon-sm")}</button></span>`,
          ],
        })),
      });
      return app(
        ctx,
        "catalog",
        {
          icon: "book-open",
          title: "Catalog",
          fab: `${I("plus")}Add item`,
          fabOpen: "quick-item",
          dialogs:
            shareCatalogDialog(ctx) +
            modal("quick-item", "Add item", quickItem(ctx)) +
            modal("import-csv", "Import items from CSV", importDialog(ctx)),
        },
        page(`
    <div class="card p-card-sm flex flex-wrap items-center gap-3"><span class="size-control-lg rounded-control bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">${I("store")}</span><div class="min-w-0"><p class="font-medium">Your page</p><p class="code text-muted-foreground">${esc(base)}</p></div><div class="ml-auto flex flex-wrap gap-2"><button type="button" class="btn btn-outline btn-sm" data-copy-text="${esc(base)}">${I("copy", "size-icon-sm")}Copy link</button><button type="button" data-need="catalog" class="btn btn-primary btn-sm" data-open="share-catalog" data-open-args="${esc(JSON.stringify({ "share:item": "" }))}">${I("share-2", "size-icon-sm")}Share price list</button></div></div>
    ${toolbar(seg(ctx, "cat", [["all", "All"], ...s.categories.map((c) => [c, esc(c)])], "all"), `<button type="button" data-need="catalog" class="btn btn-outline" data-open="import-csv">${I("file-spreadsheet")}Import CSV</button><button type="button" data-need="catalog" class="btn btn-primary" data-open="quick-item">${I("plus")}Add item</button>`)}
    ${sortableRows(table, "items")}
    <p class="hint">Drag ${I("grip-vertical", "size-icon-sm inline")} to change the order on your public page. Click a row to edit the item.</p>`)
      );
    },
    actions: {
      "catalog.reorder": reorderAction,
      /* Quick add: unit and GST follow an item in the same category (from the data, nothing assumed). */
      quickAdd: (ctx, a) => {
        const like =
          ctx.s.items.find((i) => i.category === a.category) || ctx.s.items[0];
        const out = call(
          "Catalog: add item",
          (s, c) =>
            ctx.biz.catalog.saveItem(
              s,
              {
                name: a.name,
                price: a.price,
                category: a.category,
                showPrice: a.showPrice,
                unit: like?.unit,
                gst: like?.gst ?? "",
              },
              c
            ),
          ctx
        );
        return a.then === "edit"
          ? { ...out, go: ["item", { id: out.recordId }] }
          : out;
      },
      importCsv: (ctx, a) => {
        let text = a.csvText || "";
        if (a.file?.url) text = dataUrlText(a.file.url);
        else if (a.file) fail("The file is still loading. Try again.");
        const rows = parseCsv(text);
        const errors = [];
        let added = 0;
        if (!rows.length) {
          ctx.ui["csv:log"] = {
            added: 0,
            errors: [{ line: 1, msg: "No item lines found." }],
          };
          return { text: "Nothing to import" };
        }
        call(
          "Catalog: import CSV",
          (s, c) => {
            ctx.biz.perms.need(c, "catalog");
            const names = new Set(s.items.map((i) => i.name.toLowerCase()));
            for (const r of rows) {
              const [name = "", category = "", price = ""] = r.cells;
              const like = s.items.find((i) => i.category === category);
              const why = !name
                ? "name is missing"
                : !category
                  ? "category is missing"
                  : !/^₹?\s*[\d,]+(\.\d+)?$/.test(price)
                    ? `price "${price}" is not a number in rupees`
                    : names.has(name.toLowerCase())
                      ? `${name} is already in your catalog`
                      : r.cells.length > 3
                        ? "more than 3 columns (put quotes around a name with a comma)"
                        : "";
              if (why) {
                errors.push({ line: r.line, msg: why });
                continue;
              }
              try {
                ctx.biz.catalog.saveItem(
                  s,
                  {
                    name,
                    category,
                    price,
                    unit: like?.unit || s.items[0]?.unit,
                    gst: (like || s.items[0])?.gst ?? "",
                  },
                  c
                );
                names.add(name.toLowerCase());
                added++;
              } catch (e) {
                errors.push({ line: r.line, msg: e.message });
              }
            }
            return { text: `Imported ${added} item${added === 1 ? "" : "s"}` };
          },
          ctx
        );
        ctx.ui["csv:log"] = { added, errors };
        return {
          text: `${added} item${added === 1 ? "" : "s"} added${errors.length ? `, ${errors.length} line${errors.length === 1 ? "" : "s"} not added` : ""}`,
        };
      },
    },
    checks: [
      (t, h) => {
        const f = h.at("catalog");
        const rows = f.querySelectorAll(
          'tbody[data-sortable="catalog.reorder"][data-a-kind="items"] > tr[data-id]'
        );
        t(
          rows.length === Math.min(10, h.s.items.length),
          "every item is a draggable row"
        );
        t(
          rows[0]?.querySelector("[data-handle]") !== null,
          "rows have a drag grip"
        );
        t(
          f.textContent.includes(`${h.s.workspace.slug}.biz4kit.com`),
          "Your page card shows the real slug"
        );
        t(
          Boolean(f.querySelector('[data-dialog="share-catalog"]')),
          "share-catalog dialog is on the page"
        );
      },
      (t, h) => {
        const ui = h.makeCtx(undefined, "catalog", "owner", {}).ui;
        const cat = h.s.categories[1];
        ui.cat = cat;
        const f = h.at("catalog");
        const n = f.querySelectorAll("tbody > tr[data-id]").length;
        delete ui.cat;
        t(
          n === h.s.items.filter((i) => i.category === cat).length && n > 0,
          `category tab ${cat} shows only its items (${n})`
        );
      },
      (t, h) => {
        const sc = SCREENS_SELF[0];
        const ctx = h.makeCtx(undefined, "catalog", "owner", {});
        const before = store.get().items.length;
        const out = sc.actions.quickAdd(ctx, {
          name: "Check item",
          price: "300",
          category: h.s.categories[0],
          showPrice: true,
        });
        const it = byId(store.get().items, out.recordId);
        t(
          store.get().items.length === before + 1 && it?.price === 300,
          "quick add creates an item"
        );
        t(
          it?.gst ===
            h.s.items.find((i) => i.category === h.s.categories[0]).gst,
          "quick add copies GST from the category"
        );
        t(
          h.at("catalog").textContent.includes("Check item"),
          "new item shows in the list"
        );
      },
      (t, h) => {
        const sc = SCREENS_SELF[0];
        const cat = h.s.categories[1];
        const sub = [...store.get().items]
          .sort(bySort)
          .filter((i) => i.category === cat)
          .map((i) => i.id);
        const others = [...store.get().items]
          .sort(bySort)
          .filter((i) => i.category !== cat)
          .map((i) => i.id);
        sc.actions["catalog.reorder"](
          h.makeCtx(undefined, "catalog", "owner", {}),
          { kind: "items", ids: [...sub].reverse() }
        );
        const order = [...store.get().items].sort(bySort).map((i) => i.id);
        t(
          order.filter((id) => sub.includes(id)).join() ===
            [...sub].reverse().join(),
          "reorder changes the order"
        );
        t(
          order.filter((id) => !sub.includes(id)).join() === others.join(),
          "reorder keeps the other items in place"
        );
        const first = h.at("catalog").querySelector("tbody > tr[data-id]");
        t(first?.dataset.id === order[0], "list follows the saved order");
      },
      (t, h) => {
        const sc = SCREENS_SELF[0];
        const ctx = h.makeCtx(undefined, "catalog", "owner", {});
        sc.actions.importCsv(ctx, {
          csvText:
            "name,category,price\nThreading,Hands and feet,150\n,Hair,100\nWax,Hair,abc",
        });
        const log = ctx.ui["csv:log"];
        delete ctx.ui["csv:log"];
        t(
          log.added === 1 &&
            log.errors.length === 2 &&
            log.errors[0].line === 3,
          "CSV import adds good lines and reports bad lines by number"
        );
        t(
          store.get().items.some((i) => i.name === "Threading"),
          "CSV item is in the catalog"
        );
      },
      (t, h) => {
        const ctx = h.makeCtx(undefined, "catalog", "owner", {});
        ctx.ui["share:item"] = h.s.items[1].id;
        ctx.ui["share:ch"] = "email";
        const f = h.at("catalog");
        const d = f.querySelector('[data-dialog="share-catalog"]');
        const body = d.querySelector('[name="body"]').value;
        t(
          body.includes(
            `${h.s.workspace.slug}.biz4kit.com/${slugify(h.s.items[1].name)}`
          ) && !body.includes("{business}"),
          "share message is ready message 1 filled, with the item link"
        );
        delete ctx.ui["share:item"];
        delete ctx.ui["share:ch"];
        const n = store.get().outbox.length;
        const r = h.biz.messages.send(
          store.get(),
          { channel: "email", templateId: 1, to: "x@y.in", body },
          {}
        );
        t(
          store.get().outbox.length === n + 1 && r.status === "sent",
          "Send email puts the message in the outbox"
        );
      },
    ],
  },
  {
    n: 14,
    area: "Catalog",
    id: "item",
    name: "Item editor",
    route: "/w/:slug/catalog/:id",
    action: "Save",
    who: "Owner, Manager",
    notes:
      "Every field of the item. A price change never alters a shared reply or invoice (lines are copied). An item in a package cannot be deleted; hide it instead.",
    sample: { id: "T2" },
    render: (ctx) => {
      const s = ctx.s;
      const it =
        (ctx.params.id && byId(s.items, ctx.params.id)) ||
        [...s.items].sort(bySort)[0];
      if (!it)
        return app(
          ctx,
          "catalog",
          { icon: "book-open", title: "Item", back: "catalog" },
          page(
            `<div class="card p-card text-center"><p class="font-medium">No items yet</p><a ${link("catalog")} class="mt-2 btn btn-outline">Back to catalog</a></div>`
          )
        );
      const inPkg = s.packages.filter((p) =>
        p.items.some((x) => x.itemId === it.id)
      );
      return app(
        ctx,
        "catalog",
        {
          icon: "book-open",
          title: esc(it.name),
          crumb: "Item",
          back: "catalog",
          dialogs: modal(
            "delete-item",
            "Delete item",
            `<p class="text-muted-foreground">${inPkg.length ? `${esc(it.name)} is in ${inPkg.map((p) => esc(`${p.name}${tiered(p) ? ` ${p.tier}` : ""}`)).join(", ")}. Take it out of the package first, or hide it instead.` : `Delete ${esc(it.name)} from the catalog? Replies and invoices already written keep their lines.`}</p>
            ${actionsRow(`<button type="button" data-need="catalog" class="btn bg-destructive text-destructive-foreground" data-do="deleteItem" data-a-id="${it.id}" ${inPkg.length ? "disabled" : ""}>${I("trash-2")}Delete</button>`)}`
          ),
        },
        page(`<form data-do="catalog.saveItem" data-a-id="${it.id}" class="grid @web:grid-cols-[1fr_var(--size-aside)] gap-4">
    <div class="card p-card-sm @tab:p-card space-y-4 min-w-0">
      ${field("Name", "name", { req: true, value: it.name })}
      <div>${flabel("Description", false, "it-desc")}${textarea("desc", { id: "it-desc", rows: 3, value: it.desc || "" })}</div>
      <div class="grid grid-cols-2 @web:grid-cols-4 gap-3">
        ${field("Category", "category", { value: it.category, list: "cat-list", id: "it-cat" })}<datalist id="cat-list">${s.categories.map((c) => `<option value="${esc(c)}"></option>`).join("")}</datalist>
        ${field("Unit (per)", "unit", { value: it.unit, list: "unit-list", id: "it-unit" })}<datalist id="unit-list">${unitsOf(
          s,
          it.unit
        )
          .map((u) => `<option value="${esc(u)}"></option>`)
          .join("")}</datalist>
        ${field("Price", "price", { req: true, money: true, value: it.price, id: "it-price" })}
        <div>${flabel("GST rate", false, "it-gst")}${select("gst", [["", "Not set"], ...gstRates(s, it.gst).map((g) => [g, `${g}%`])], it.gst ?? "", { id: "it-gst" })}</div>
      </div>
      ${field("HSN / SAC code", "hsn", { value: it.hsn || "", id: "it-hsn", placeholder: "Optional", hint: "Printed on the tax invoice when set. [Codes: CA to confirm]" })}
      ${field("Minimum order (MOQ)", "moq", { value: it.moq ?? "", id: "it-moq", type: "number", min: 1, money: true, placeholder: "None", hint: `Customers cannot ask for fewer than this, in ${esc(it.unit || "units")}. Leave empty for none.` })}
      ${ctx.biz.serials.on(s) ? serialFields(it) : ""}
      <div class="flex flex-wrap justify-end gap-2 pt-3 border-t border-border"><button type="button" data-need="catalog" class="btn btn-ghost text-destructive mr-auto" data-open="delete-item">${I("trash-2")}Delete</button><a ${link("catalog")} class="btn btn-ghost">Cancel</a><button type="submit" data-need="catalog" class="btn btn-primary">${I("check")}Save</button></div>
    </div>
    <div class="space-y-4">
      <div class="card p-card-sm space-y-3">
        <label class="flex items-center">Show price on catalog<span class="ml-auto">${toggle("showPrice", it.showPrice, { label: "Show price on catalog" })}</span></label>
        <label class="flex items-center">Active<span class="ml-auto">${toggle("active", it.active, { label: "Active" })}</span></label>
        ${hint('Price off shows "Request a quote" instead. Inactive items are hidden from your page.')}</div>
      ${itemPhotos(ctx, it)}
      ${inPkg.length ? `<div class="card p-card-sm"><p class="flabel">In packages</p><ul class="space-y-1">${inPkg.map((p) => `<li><a ${link("packages")} class="flex items-center gap-1.5 hover:underline">${I("package", "size-icon-sm text-muted-foreground")}${esc(p.name)}${tiered(p) ? ` · ${esc(p.tier)}` : ""}</a></li>`).join("")}</ul></div>` : ""}
    </div>
  </form>`)
      );
    },
    actions: {
      deleteItem: (ctx, { id }) => ({
        ...call(
          "Catalog: delete item",
          (s, c) => ctx.biz.catalog.removeItem(s, { id }, c),
          ctx
        ),
        go: ["catalog"],
      }),
    },
    checks: [
      (t, h) => {
        const f = h.at("item", { id: "T2" });
        const form = f.querySelector('form[data-do="catalog.saveItem"]');
        t(
          [
            "name",
            "category",
            "unit",
            "price",
            "gst",
            "hsn",
            "desc",
            "showPrice",
            "active",
          ].every((n) => form?.querySelector(`[name="${n}"]`)),
          "editor has every item field"
        );
        t(
          form?.querySelector('[name="name"]').value ===
            byId(h.s.items, "T2").name,
          "editor opens the item from params.id"
        );
        const own = { role: "owner", memberId: h.s.meta.people.owner };
        h.biz.catalog.saveItem(
          store.get(),
          {
            id: "T2",
            name: "Hair spa deluxe",
            price: "1700",
            hsn: "999721",
            showPrice: false,
          },
          own
        );
        const it = byId(store.get().items, "T2");
        t(
          it.name === "Hair spa deluxe" &&
            it.price === 1700 &&
            it.hsn === "999721" &&
            it.showPrice === false,
          "Save writes the fields"
        );
        const inPkg = store
          .get()
          .items.find((i) =>
            store
              .get()
              .packages.some((p) => p.items.some((x) => x.itemId === i.id))
          );
        let blocked = false;
        try {
          h.biz.catalog.removeItem(store.get(), { id: inPkg.id }, own);
        } catch {
          blocked = true;
        }
        t(blocked, "an item in a package cannot be deleted");
        t(
          h.at("item", { id: inPkg.id }).querySelector('[data-do="deleteItem"]')
            .disabled,
          "Delete is disabled for an item in a package"
        );
      },
      (t, h) => {
        /* photos and MOQ (D87) */
        const own = { role: "owner", memberId: h.s.meta.people.owner };
        const s = store.get();
        h.biz.catalog.saveItem(
          s,
          { id: "T2", name: "Hair spa", photo: { name: "spa.jpg", url: null }, moq: "3" },
          own
        );
        let it = byId(store.get().items, "T2");
        t(it.photos.length === 1 && it.moq === 3, "Save adds the chosen photo and the MOQ");
        let f = h.at("item", { id: "T2" });
        t(
          f.querySelectorAll("[data-item-photos] [data-photo]").length === 1 &&
            f.querySelector('[name="moq"]')?.value === "3",
          "the editor shows the photo and the MOQ"
        );
        let bad = false;
        try {
          h.biz.catalog.saveItem(store.get(), { id: "T2", name: "Hair spa", moq: "0" }, own);
        } catch {
          bad = true;
        }
        t(bad, "an MOQ below 1 is refused");
        f.querySelector('[data-do="catalog.removeItemPhoto"]').click();
        it = byId(store.get().items, "T2");
        t(it.photos.length === 0 && it.moq === 3, "a photo can be removed; the MOQ stays");
        t(
          Boolean(h.at("p-catalog").querySelector('[data-item="T2"] [data-moq]')),
          "the customer catalog shows Min. order"
        );
      },
    ],
  },
  {
    n: 15,
    area: "Catalog",
    id: "packages",
    name: "Packages",
    route: "/w/:slug/packages",
    action: "Add tier",
    who: "Owner, Manager",
    notes:
      "Tiers Basic / Standard / Premium or none; bookable flag + duration feed the booking picker; a bookable package creates a booked lead; its items become the invoice lines. Advance % has no default (D66).",
    render: (ctx) => {
      const s = ctx.s;
      const f = ctx.ui.pk || "all";
      const all = [...s.packages].sort(bySort);
      const shown = all.filter(
        (p) =>
          f === "all" ||
          (f === "bookable" && p.bookable) ||
          (f === "monthly" && p.billing === "monthly")
      );
      const groups = [];
      for (const p of shown.filter(tiered)) {
        const g = groups.find((x) => x.name === p.name);
        g ? g.list.push(p) : groups.push({ name: p.name, list: [p] });
      }
      const others = shown.filter((p) => !tiered(p));
      const groupCard = (g) => {
        const a = g.list[0];
        const nextTier =
          TIERS.find((x) => !g.list.some((p) => p.tier === x)) || "";
        return `<div class="card p-card-sm @tab:p-card"><div class="flex flex-wrap items-center gap-2"><h2 class="text-title font-semibold">${esc(g.name)}</h2>${a.bookable ? chip(`Bookable · ${hours(a.durationMin)}`, "calendar-check") : ""}${chip(billingName(a.billing))}<button type="button" data-need="catalog" class="ml-auto btn btn-outline" ${openPkg({ "pkg:name": g.name, "pkg:tier": nextTier })}>${I("plus")}Add tier</button></div>
      <div class="mt-4 grid @tab:grid-cols-3 gap-3" data-sortable="catalog.reorder" data-a-kind="packages">${g.list
        .map(
          (
            p
          ) => `<div data-id="${p.id}" class="rounded-control border border-border p-card-sm ${p.active ? "" : "opacity-60"}">
        <div class="flex items-center gap-1.5">${grip}<span class="label">${esc(p.tier)}</span>${p.active ? "" : `<span class="ml-auto">${chip("Hidden", "archive")}</span>`}</div>
        <div class="mt-1 font-mono text-money-lg">${inr(p.price)}</div>
        <ul class="mt-3 space-y-1">${pkgLines(s, p)
          .map(
            (i) =>
              `<li class="flex items-center gap-1.5">${I("check", "size-icon-sm text-success")}${esc(i)}</li>`
          )
          .join("")}</ul>
        ${p.advancePct ? `<p class="mt-2 text-caption text-muted-foreground">Advance ${p.advancePct}%</p>` : ""}
        <button type="button" data-need="catalog" class="mt-3 btn btn-outline btn-sm w-full" ${openPkg({ "pkg:id": p.id })}>${I("pencil", "size-icon-sm")}Edit tier</button></div>`
        )
        .join("")}</div>
    </div>`;
      };
      const table = `<div class="card overflow-hidden"><div class="flex items-center gap-2 px-4 @tab:px-card-sm h-header">${I("package", "size-icon text-muted-foreground")}<h2 class="text-title font-semibold truncate">${groups.length ? "Other packages" : "Packages"}</h2><span class="count">${others.length}</span></div>
      <div class="overflow-x-auto border-t border-border"><table class="tbl w-full border-collapse"><thead class="bg-muted"><tr><th class="th pl-card-sm">Package</th><th class="th hidden @tab:table-cell">Contains</th><th class="th hidden @web:table-cell">Billing</th><th class="th">Bookable</th><th class="th text-right">Price</th><th class="th pr-card-sm"><span class="sr-only">Edit</span></th></tr></thead>
      <tbody data-sortable="catalog.reorder" data-a-kind="packages">${
        others.length
          ? others
              .map(
                (p) =>
                  `<tr data-id="${p.id}" class="hover:bg-muted ${p.active ? "" : "text-muted-foreground"}"><td class="td pl-card-sm"><span class="flex items-center gap-2">${grip}<span class="font-medium">${esc(p.name)}</span>${p.active ? "" : chip("Hidden", "archive")}</span><span class="@tab:hidden block text-caption text-muted-foreground">${esc(pkgLines(s, p).join(", "))}</span></td><td class="td text-muted-foreground hidden @tab:table-cell">${esc(pkgLines(s, p).join(", "))}</td><td class="td hidden @web:table-cell">${chip(billingName(p.billing))}</td><td class="td">${p.bookable ? chip(hours(p.durationMin), "calendar-check") : chip("No", "calendar-x")}</td><td class="td text-right">${M(p.price)}</td><td class="td pr-card-sm text-right"><button type="button" data-need="catalog" class="btn btn-ghost btn-sm btn-icon" ${openPkg({ "pkg:id": p.id })} aria-label="Edit ${esc(p.name)}" title="Edit">${I("pencil", "size-icon-sm")}</button></td></tr>`
              )
              .join("")
          : `<tr><td class="td text-center text-muted-foreground" colspan="6">Nothing matches.</td></tr>`
      }</tbody></table></div></div>`;
      const editing = ctx.ui["pkg:id"]
        ? byId(s.packages, ctx.ui["pkg:id"])
        : null;
      return app(
        ctx,
        "packages",
        {
          icon: "package",
          title: "Packages",
          fab: `${I("plus")}New package`,
          fabOpen: "pkg-edit",
          dialogs: modal(
            "pkg-edit",
            editing
              ? `Edit ${esc(editing.name)}${tiered(editing) ? ` · ${esc(editing.tier)}` : ""}`
              : ctx.ui["pkg:name"]
                ? `Add tier to ${esc(ctx.ui["pkg:name"])}`
                : "New package",
            packageDialog(ctx)
          ),
        },
        page(`
    ${toolbar(
      seg(
        ctx,
        "pk",
        [
          ["all", "All"],
          ["bookable", "Bookable"],
          ["monthly", "Monthly"],
        ],
        "all"
      ),
      `<button type="button" data-need="catalog" class="btn btn-primary" ${openPkg({})}>${I("plus")}New package</button>`
    )}
    ${groups.map(groupCard).join("")}
    ${table}
    <p class="hint">Drag ${I("grip-vertical", "size-icon-sm inline")} to change the order on your public page.</p>`)
      );
    },
    actions: { "catalog.reorder": reorderAction },
    checks: [
      (t, h) => {
        const own = { role: "owner", memberId: h.s.meta.people.owner };
        const it = [...h.s.items].sort(bySort);
        const r = h.biz.catalog.savePackage(
          store.get(),
          {
            name: "Check pack",
            price: "2500",
            billing: "monthly",
            bookable: true,
            durationMin: "90",
            advancePct: "",
            items: [
              { itemId: it[0].id, qty: "2" },
              { itemId: it[1].id, qty: "0" },
              { itemId: "", name: "Extra line", qty: "1" },
            ],
          },
          own
        );
        const p = byId(store.get().packages, r.recordId);
        t(
          p?.items.length === 2 &&
            p.items[0].qty === 2 &&
            p.items[1].name === "Extra line" &&
            p.advancePct === null,
          "a package saves with items, no advance default"
        );
        const f = h.at("packages");
        t(f.textContent.includes("Check pack"), "new package is listed");
        const ui = h.makeCtx(undefined, "packages", "owner", {}).ui;
        ui.pk = "monthly";
        const g = h.at("packages");
        const n = g.querySelectorAll("[data-sortable] [data-id]").length;
        delete ui.pk;
        t(
          n ===
            store.get().packages.filter((x) => x.billing === "monthly").length,
          "Monthly tab filters packages"
        );
      },
      (t, h) => {
        const tieredPkg = h.s.packages.find(
          (p) => tiered(p) && p.items.some((x) => !x.itemId)
        );
        if (!tieredPkg) return t(true, "no tier with free lines");
        const ui = h.makeCtx(undefined, "packages", "owner", {}).ui;
        ui["pkg:id"] = tieredPkg.id;
        const f = h.at("packages");
        const form = f.querySelector('[data-dialog="pkg-edit"] form');
        delete ui["pkg:id"];
        t(
          form?.querySelector('[name="name"]').value === tieredPkg.name,
          "Edit tier opens that package"
        );
        const own = { role: "owner", memberId: h.s.meta.people.owner };
        h.biz.catalog.savePackage(
          store.get(),
          { ...structuredClone(tieredPkg) },
          own
        );
        t(
          byId(store.get().packages, tieredPkg.id).items.length ===
            tieredPkg.items.length,
          "editing keeps lines that are not in the catalog"
        );
      },
      (t, h) => {
        const ids = [...h.s.packages].sort(bySort).map((p) => p.id);
        SCREENS_SELF[2].actions["catalog.reorder"](
          h.makeCtx(undefined, "packages", "owner", {}),
          { kind: "packages", ids: [ids[1], ids[0]] }
        );
        const now = [...store.get().packages].sort(bySort).map((p) => p.id);
        t(
          now[0] === ids[1] &&
            now[1] === ids[0] &&
            now.slice(2).join() === ids.slice(2).join(),
          "dragging packages reorders them"
        );
      },
    ],
  },
];
export default SCREENS_SELF;
