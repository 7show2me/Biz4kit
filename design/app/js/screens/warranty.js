/* WARRANTY: Serial lookup (workspace) and the Warranty card (customer page), D85 and D86.
   Both read the invoice rows through biz.serials. The feature is optional: Settings, Extras, "Serial numbers
   and warranty" (on by default for the Wholesaler and Manufacturer kits). The card is a private link like
   the invoice link, open to anyone who has it, with the customer's phone masked (D86). */
import * as store from "../core/store.js";
import { byId, esc, fmtLong } from "../core/util.js";
import { I, C, dataTable, empty, link, page, pill } from "../ui/kit.js";
import { app, cHeader, cust } from "../ui/shell.js";

const noOf = (inv) => inv.invNumber || inv.piNumber || "Draft";
/* +91 98••••4210: only the last four digits show. */
export const maskPhone = (p) => {
  const d = String(p || "");
  const keepPrefix = d.startsWith("+91") ? 3 : 0;
  let left = (d.slice(keepPrefix).match(/\d/g) || []).length - 4;
  return d
    .split("")
    .map((ch, i) => {
      if (i < keepPrefix || !/\d/.test(ch)) return ch;
      return left-- > 0 ? "•" : ch;
    })
    .join("");
};
const statusOf = (r) =>
  !r.line.serial
    ? "no_serial"
    : r.cover.status === "active"
      ? "covered"
      : r.cover.status === "ended"
        ? "ended"
        : "";

/* ---------- Serial lookup ---------- */
function lookup(ctx) {
  const s = ctx.s;
  const SR = ctx.biz.serials;
  if (!SR.on(s))
    return page(
      `<div class="card">${empty("scan-barcode", "Serial numbers are off", "Turn on Serial numbers and warranty in Settings, Extras. It adds model, serial number and warranty or guarantee to invoice rows (D85).", `<a ${link("settings", { tab: "numbering" })} class="btn btn-outline">${I("settings")}Open Settings</a>`)}</div>`
    );
  const rows = SR.rows(s);
  const missing = rows.filter((r) => !r.line.serial).length;
  return page(`<p class="text-muted-foreground">Scan or type a serial in the search box to find who bought it, the invoice and whether it is still in cover. Cover runs from the invoice date (D85).</p>
    ${dataTable(ctx, {
      key: "sr",
      icon: "scan-barcode",
      title: "Serial numbers",
      ph: "Serial, model or customer",
      go: "invoice",
      select: false,
      filters: [
        ["covered", "In cover"],
        ["ended", "Cover ended"],
        ["no_serial", `Serials missing${missing ? ` (${missing})` : ""}`],
      ],
      cols: [
        { t: "Serial", role: "title" },
        { t: "Item", role: "sub" },
        { t: "Customer", m: 1 },
        { t: "Invoice", m: 1, web: 1 },
        { t: "Cover ends", m: 1, web: 1 },
        { t: "Status", role: "end" },
        { t: "", role: "act" },
      ],
      rows: rows.map((r) => {
        const st = statusOf(r);
        return {
          id: r.inv.id,
          f: st,
          text: `${r.line.serial} ${r.line.name} ${r.line.model} ${r.line.modelNo} ${r.line.batch} ${r.customer?.name || ""} ${noOf(r.inv)}`,
          cells: [
            r.line.serial
              ? C(r.line.serial)
              : '<span class="text-caption text-muted-foreground">Not entered</span>',
            `<span class="font-medium">${esc(r.line.name)}</span>${r.line.model ? `<span class="block text-caption text-muted-foreground">${esc([r.line.model, r.line.modelNo].filter(Boolean).join(" · "))}</span>` : ""}`,
            esc(r.customer?.name || ""),
            C(noOf(r.inv)),
            r.cover.end ? fmtLong(r.cover.end) : "—",
            st
              ? pill(st)
              : '<span class="text-caption text-muted-foreground">No cover</span>',
            r.line.card
              ? `<a ${link("p-warranty", { id: r.line.card })} class="btn btn-ghost btn-sm" data-stop>${I("shield-check", "size-icon-sm")}Card</a>`
              : "",
          ],
        };
      }),
    })}`);
}

/* ---------- Warranty card ---------- */
function cardPage(ctx) {
  const s = ctx.s;
  const SR = ctx.biz.serials;
  const r =
    SR.byCard(s, ctx.params.id) ||
    (!ctx.params.id && SR.rows(s).find((x) => x.line.card)) ||
    null;
  if (!r)
    return cust(
      `${cHeader(ctx)}<div class="mx-auto max-w-md px-6 pt-12 text-center"><span class="mx-auto size-16 rounded-pill bg-biz-soft text-biz flex items-center justify-center">${I("shield-check")}</span><h1 class="mt-4 text-heading font-bold">No warranty card here</h1><p class="mt-1 text-body text-customer-muted">This link has no card. A card is made once the serial number is on the invoice. Call ${esc(s.workspace.name)} if you need help.</p></div>`
    );
  const { inv, line: l, customer: c, cover } = r;
  const ws = s.workspace;
  const kind = l.cover ? SR.COVER[l.cover] : "Warranty";
  const row = (k, v) =>
    `<div class="flex gap-3 px-4 min-h-row items-center border-b border-customer-border last:border-0"><span class="w-32 shrink-0 text-customer-muted">${k}</span><span class="ml-auto text-right font-medium">${v}</span></div>`;
  const state =
    cover.status === "active"
      ? `<div class="p-4 rounded-sm bg-success-soft text-success flex items-center gap-2" data-cover="active">${I("shield-check")}<span class="font-semibold">In ${kind.toLowerCase()} until ${fmtLong(cover.end)}</span></div>`
      : cover.status === "ended"
        ? `<div class="p-4 rounded-sm bg-muted text-muted-foreground flex items-center gap-2" data-cover="ended">${I("shield-off")}<span class="font-semibold">${kind} ended on ${fmtLong(cover.end)}</span></div>`
        : `<div class="p-4 rounded-sm border border-customer-border flex items-center gap-2" data-cover="none">${I("info")}<span>No warranty or guarantee on this item.</span></div>`;
  return cust(`${cHeader(ctx)}<div class="mx-auto max-w-xl px-4 py-5 space-y-3" data-card="${esc(l.card)}">
    <div class="ccard overflow-hidden">
      <div class="bg-biz text-biz-foreground px-4 py-4 flex items-center gap-3">${I("shield-check")}<div><p class="text-label uppercase tracking-wider">${esc(kind)} card</p><p class="font-semibold">${esc(ws.name)}</p></div></div>
      <div class="px-4 py-4"><p class="text-heading font-bold">${esc(l.name)}</p><p class="text-customer-muted">${esc([l.model ? `Model ${l.model}` : "", l.modelNo ? `No. ${l.modelNo}` : ""].filter(Boolean).join(" · "))}</p></div>
      <div class="border-t border-customer-border">
        ${row("Serial number", `<span class="code" data-serial>${esc(l.serial)}</span>`)}
        ${l.batch ? row("Batch / lot", `<span class="code">${esc(l.batch)}</span>`) : ""}
        ${row(inv.invNumber ? "Tax invoice" : "Proforma", `<span class="code">${esc(noOf(inv))}</span>`)}
        ${row("Invoice date", fmtLong(SR.invoiceDate(s, inv)))}
        ${cover.end ? row(`${kind} period`, `${l.coverMonths} months, to ${fmtLong(cover.end)}`) : ""}
        ${row("Bought by", `${esc(c?.name || "")}${c?.phone ? ` · <span class="money" data-masked>${esc(maskPhone(c.phone))}</span>` : ""}`)}
      </div>
    </div>
    ${state}
    <div class="grid grid-cols-2 gap-2 print:hidden"><a href="tel:${esc(ws.phone)}" class="cbtn cbtn-biz">${I("phone")}Call for service</a><button type="button" class="cbtn cbtn-line" data-do="print">${I("printer")}Print or save PDF</button></div>
    <p class="text-caption text-customer-muted">Show this card, or quote the serial number, when you ask ${esc(ws.name)} for service. <span class="italic">[Warranty terms: business to supply]</span></p>
  </div>`);
}

/* ---------- check helpers: a tracked item, a 3-unit bill, serials saved ---------- */
const OWNER = (s) => ({ role: "owner", memberId: s.meta.people.owner });
function sample(h) {
  const s = store.get();
  s.workspace.modules.serials = true;
  const it = h.biz.catalog.saveItem(
    s,
    {
      name: "Ceiling fan",
      price: "2400",
      gst: "18",
      unit: "pc",
      serials: true,
      model: "Breeze 1200",
      modelNo: "BZ-1200-W",
      cover: "warranty",
      coverMonths: "24",
      trackBatch: true,
    },
    OWNER(s)
  ).item;
  const inv = h.biz.invoices.create(
    s,
    {
      kind: "bill",
      customerId: s.customers[0].id,
      lines: [h.biz.invoices.lineFromItem(it, 3)],
    },
    OWNER(s)
  );
  h.biz.invoices.share(s, { id: inv.id }, OWNER(s));
  return { s, it, inv };
}

export default [
  {
    n: 35,
    area: "Sales",
    id: "serials",
    name: "Serial lookup",
    route: "/w/:slug/serials",
    action: "Find by serial, open the warranty card",
    who: "All",
    notes:
      "Optional feature (D85): every tracked invoice row, searchable by serial, model, batch or customer. Status: In cover, Cover ended, Serials missing. Cover runs from the invoice date.",
    render: (ctx) =>
      app(
        ctx,
        "serials",
        { icon: "scan-barcode", title: "Serial numbers" },
        lookup(ctx)
      ),
    checks: [
      (t, h) => {
        t(
          Boolean(
            h.at("serials").textContent.includes("Serial numbers are off")
          ),
          "off by default for the salon sample (D85)"
        );
        const { s, inv } = sample(h);
        const f = h.at("serials");
        t(
          f.querySelectorAll("[data-row]").length >= 1 &&
            f.textContent.includes("Breeze 1200"),
          "lists the tracked rows"
        );
        h.biz.serials.save(
          s,
          {
            id: inv.id,
            units: [
              { line: 0, serial: "BZ-0001", batch: "L-07" },
              { line: 0, serial: "BZ-0002", batch: "L-07" },
            ],
          },
          OWNER(s)
        );
        const after = byId(s.invoices, inv.id);
        t(
          after.lines.length === 3 && after.lines.every((l) => l.qty === 1),
          "entering serials splits qty 3 into 3 rows of 1 (D86)"
        );
        t(
          h.biz.invoices.total(s, after) === h.biz.invoices.total(s, inv) &&
            h.biz.serials.missing(after) === 1,
          "amounts unchanged; one serial still missing"
        );
        t(
          h.biz.serials.find(s, "bz-0002").length === 1,
          "search by serial finds the row (any case)"
        );
        let dup = "";
        try {
          h.biz.serials.save(
            s,
            { id: inv.id, units: [{ line: 2, serial: "bz-0001" }] },
            OWNER(s)
          );
        } catch (e) {
          dup = e.message;
        }
        t(
          dup.includes("BZ-0001") || dup.includes("bz-0001"),
          "a serial cannot be used twice (D85)"
        );
        const c = h.biz.serials.coverOf(s, after, after.lines[0]);
        t(
          c.start === String(after.sharedAt).slice(0, 10) &&
            c.end === "2028-10-19" &&
            c.status === "active",
          "24-month cover runs from the invoice date"
        );
        /* the editor round-trip keeps the serial fields (form values are strings) */
        h.biz.invoices.revise(
          s,
          {
            id: inv.id,
            lines: after.lines.map((l) => ({
              ...l,
              qty: String(l.qty),
              tracked: "true",
              trackBatch: String(l.trackBatch),
              coverMonths: String(l.coverMonths),
            })),
          },
          OWNER(s)
        );
        const rev = byId(s.invoices, inv.id);
        t(
          rev.lines[0].serial === "BZ-0001" &&
            rev.lines[0].tracked === true &&
            rev.lines[0].coverMonths === 24,
          "editing lines keeps serials and cover"
        );
        let one = "";
        try {
          h.biz.invoices.revise(
            s,
            {
              id: inv.id,
              lines: rev.lines.map((l, i) => (i ? l : { ...l, qty: 2 })),
            },
            OWNER(s)
          );
        } catch (e) {
          one = e.message;
        }
        t(one.includes("one unit"), "a row with a serial stays one unit");
      },
      (t, h) => {
        const { s, inv } = sample(h);
        const ctx = h.makeCtx(s, "invoice", "owner", { id: inv.id });
        ctx.ui.serials = "1";
        const f = h.at("invoice", { id: inv.id });
        t(
          f.querySelectorAll("[data-serial-panel] [data-unit]").length === 3,
          "the serial panel has one row per unit"
        );
        t(
          Boolean(f.querySelector('[data-serials] [data-status="no_serial"]')),
          "the aside says serials are missing"
        );
        const meta = f.querySelector("[data-doc] [data-serial-meta]");
        t(
          meta?.textContent.includes("Breeze 1200") &&
            meta.textContent.includes("24-month warranty"),
          "the proforma shows model and cover"
        );
        ctx.ui.serials = "";
        h.biz.serials.save(
          s,
          { id: inv.id, units: [{ line: 0, serial: "BZ-0201" }] },
          OWNER(s)
        );
        t(
          !h.at("invoice-pdf", { id: inv.id }).textContent.includes("BZ-0201"),
          "the proforma PDF has no serial (D86)"
        );
        const x = byId(s.invoices, inv.id);
        x.invNumber = "INV-TEST-1";
        t(
          h.at("invoice-pdf", { id: inv.id }).textContent.includes("BZ-0201"),
          "the tax invoice PDF shows the serial"
        );
        t(
          Boolean(h.at("invoices").querySelector('[data-status="no_serial"]')),
          "the invoice list flags serials missing"
        );
      },
    ],
  },
  {
    n: 36,
    area: "Portal",
    id: "p-warranty",
    name: "Warranty card",
    route: "/wc/:token",
    action: "Show, print, call for service",
    who: "Customer",
    notes:
      "One card per row with a serial (D86). Private link, open to anyone who has it, customer phone masked. Business brand only (D78).",
    render: cardPage,
    actions: {
      print: () => {
        window.print();
        return { text: "Print dialog opened. Choose Save as PDF to download." };
      },
    },
    checks: [
      (t, h) => {
        t(
          h
            .at("p-warranty", { id: "w-none" })
            .textContent.includes("No warranty card here"),
          "an unknown link shows no card"
        );
        const { s, inv } = sample(h);
        h.biz.serials.save(
          s,
          { id: inv.id, units: [{ line: 0, serial: "BZ-0101" }] },
          OWNER(s)
        );
        const row = byId(s.invoices, inv.id).lines.find(
          (l) => l.serial === "BZ-0101"
        );
        t(Boolean(row?.card), "a row with a serial gets a card link");
        t(
          !byId(s.invoices, inv.id).lines.some((l) => !l.serial && l.card),
          "no card for a row without a serial (D86)"
        );
        const f = h.at("p-warranty", { id: row.card });
        const phone = s.customers[0].phone;
        t(
          f.querySelector("[data-serial]")?.textContent === "BZ-0101" &&
            f.querySelector('[data-cover="active"]') &&
            f.textContent.includes("Breeze 1200"),
          "the card shows serial, model and cover"
        );
        t(
          !phone || !f.textContent.includes(phone),
          "the customer's phone is masked"
        );
        t(
          maskPhone("+91 98200 14210") === "+91 ••••• •4210",
          "mask keeps the last four digits"
        );
      },
    ],
  },
];
