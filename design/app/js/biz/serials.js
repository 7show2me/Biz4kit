/* Serial numbers, model and warranty / guarantee (D85, D86). An optional feature: workspace.modules.serials,
   on by default for the Wholesaler and Manufacturer kits, off for the rest.
   - The catalog item says whether it is tracked (serials), its model name and number, cover type and months,
     and whether rows take a batch / lot number. Those copy into the line (a snapshot, like the price).
   - A line keeps its qty until serials are entered; entering them splits it into one row per unit (D86).
   - The proforma shows model and cover, not serial; the tax invoice shows all (D86).
   - Serial can be added later, even after payment (it changes no money). Unique within the workspace (D85).
   - Cover starts on the invoice date and ends that date + months (D85). A row has a warranty card only once
     it has a serial (D86); the card opens for anyone with its private link. */
import { addMonths, byId, fail, sum, today, token } from "../core/util.js";
import { need } from "./perms.js";

export const COVER = { warranty: "Warranty", guarantee: "Guarantee" };
export const KITS_ON = ["Wholesaler", "Manufacturer"];

export const on = (s) => s.workspace.modules?.serials === true;
export const flag = (v) => v === true || v === "true" || v === "on";
const clean = (v) => String(v ?? "").trim();
const key = (v) => clean(v).toUpperCase();

/* The item fields a line copies. */
export const fromItem = (it) =>
  it?.serials
    ? {
        tracked: true,
        model: it.model || "",
        modelNo: it.modelNo || "",
        cover: it.cover || "",
        coverMonths: it.coverMonths || 0,
        trackBatch: Boolean(it.trackBatch),
      }
    : {};

/* Normalise the serial fields of a line that came through a form (strings). */
export const normLine = (l) => {
  if (!flag(l.tracked)) {
    const {
      tracked,
      model,
      modelNo,
      cover,
      coverMonths,
      trackBatch,
      serial,
      batch,
      card,
      ...rest
    } = l;
    return rest;
  }
  return {
    ...l,
    tracked: true,
    model: clean(l.model),
    modelNo: clean(l.modelNo),
    cover: COVER[l.cover] ? l.cover : "",
    coverMonths: Math.max(0, Math.round(+l.coverMonths || 0)),
    trackBatch: flag(l.trackBatch),
    serial: clean(l.serial),
    batch: clean(l.batch),
    card: clean(l.card),
  };
};

/* "12-month warranty" */
export const coverText = (l) =>
  l.cover && l.coverMonths
    ? `${l.coverMonths}-month ${COVER[l.cover].toLowerCase()}`
    : l.cover
      ? COVER[l.cover]
      : "";
/* "Model Aura 2000 · No. AD-2000 · 12-month warranty" (what a proforma may show). */
export const modelText = (l) =>
  [
    l.model ? `Model ${l.model}` : "",
    l.modelNo ? `No. ${l.modelNo}` : "",
    coverText(l),
  ]
    .filter(Boolean)
    .join(" · ");

/* Units on this invoice still without a serial. */
export const missing = (inv) =>
  sum(
    inv.lines.filter(
      (l) => l.tracked && !l.serial && (!l.optional || l.selected)
    ),
    (l) => l.qty || 0
  );
export const trackedUnits = (inv) =>
  sum(
    inv.lines.filter((l) => l.tracked && (!l.optional || l.selected)),
    (l) => l.qty || 0
  );

/* Invoice date: the tax invoice's date (when the INV- number was given), else the date it was shared. */
export function invoiceDate(s, inv) {
  if (inv.invNumber) {
    const d = s.payments
      .filter((p) => p.invoiceId === inv.id && p.status === "approved")
      .map((p) => p.decidedAt || "")
      .sort()
      .pop();
    if (d) return d.slice(0, 10);
  }
  return String(inv.sharedAt || inv.createdAt || today(s)).slice(0, 10);
}
/* { start, end, status: active / ended / none } for a row. */
export function coverOf(s, inv, l) {
  if (!l.cover || !l.coverMonths) return { status: "none" };
  const start = invoiceDate(s, inv);
  const end = addMonths(start, l.coverMonths);
  return { start, end, status: today(s) < end ? "active" : "ended" };
}

/* Every serial in use, as KEY → { invoiceId, index }. Cancelled invoices free their serials. */
function inUse(s, skipInvoiceId) {
  const m = new Map();
  for (const inv of s.invoices) {
    if (inv.cancelled || inv.id === skipInvoiceId) continue;
    inv.lines.forEach((l, i) => {
      if (l.serial) m.set(key(l.serial), { invoiceId: inv.id, index: i });
    });
  }
  return m;
}
const numberOf = (inv) => inv.invNumber || inv.piNumber || "a draft";

/* A line with a serial is one unit; the same serial cannot be on two rows (D85). */
export function checkLines(s, inv, lines) {
  const used = inUse(s, inv.id);
  const seen = new Set();
  for (const l of lines) {
    if (!l.tracked) continue;
    if (l.serial && (l.qty || 0) !== 1)
      fail(`${l.name}: a row with a serial number is one unit.`);
    if (!l.serial) continue;
    const k = key(l.serial);
    if (seen.has(k)) fail(`Serial ${l.serial} is on two rows.`);
    seen.add(k);
    const u = used.get(k);
    if (u)
      fail(
        `Serial ${l.serial} is already on ${numberOf(byId(s.invoices, u.invoiceId))}.`
      );
  }
}

/* Lines with the catalog's model fields filled in where a line came without them (e.g. from a lead). */
export const enrich = (s, lines) =>
  lines.map((l) => {
    if (l.tracked !== undefined || !l.itemId) return l;
    return { ...l, ...fromItem(byId(s.items, l.itemId)) };
  });

/* Save serials. args: { id, units: [{ line, serial, batch }] } where line is the index of the line the unit
   belongs to (a line of qty 5 has five units). Every tracked line that gets units becomes one row per unit
   (D86). Money is unchanged, so it is allowed on a paid invoice and is not a new version. */
export function save(s, { id, units = [] }, ctx) {
  need(ctx, "write");
  const inv = byId(s.invoices, id) || fail("Invoice not found.");
  if (inv.cancelled) fail("This invoice is cancelled.");
  const by = new Map();
  for (const u of units) {
    const i = +u.line;
    const l = inv.lines[i];
    if (!l?.tracked) continue;
    if (!by.has(i)) by.set(i, []);
    by.get(i).push({
      serial: clean(u.serial),
      batch: clean(u.batch),
      cover: u.cover,
      coverMonths: u.coverMonths,
    });
  }
  const lines = [];
  inv.lines.forEach((l, i) => {
    const got = by.get(i);
    if (!got) return lines.push(l);
    const qty = l.qty || 0;
    if (!Number.isInteger(qty))
      fail(`${l.name}: a tracked item is counted in whole units.`);
    for (let k = 0; k < qty; k++) {
      const u = got[k] || { serial: "", batch: "" };
      /* Cover can change on the row (D85); left out, it stays as the line had it. */
      const cover = u.cover === undefined ? l.cover : COVER[u.cover] ? u.cover : "";
      const months =
        u.coverMonths === undefined || u.coverMonths === ""
          ? l.coverMonths
          : Math.max(0, Math.round(+u.coverMonths || 0));
      if (cover && !months)
        fail(`${l.name}: enter how many months the ${COVER[cover].toLowerCase()} lasts.`);
      const row = {
        ...l,
        qty: 1,
        serial: u.serial,
        batch: l.trackBatch ? u.batch : "",
        cover,
        coverMonths: cover ? months : 0,
      };
      row.card = row.serial ? (l.card && qty === 1 ? l.card : token("w")) : "";
      lines.push(row);
    }
  });
  checkLines(s, inv, lines);
  const before = missing(inv);
  inv.lines = lines;
  const left = missing(inv);
  return {
    recordId: inv.id,
    text: `${numberOf(inv)}: ${before - left >= 0 ? before - left : 0} serial${before - left === 1 ? "" : "s"} added${left ? `, ${left} still missing` : ", all entered"}`,
    invoice: inv,
  };
}

/* Bulk entry: a pasted list (one per line, or separated by commas / tabs) into the empty units in order.
   Returns the serials it could not place. */
export function parseList(text) {
  return String(text || "")
    .split(/[\n,;\t]+/)
    .map(clean)
    .filter(Boolean);
}

/* Every tracked row with what the lookup and the card need. */
export function rows(s) {
  const out = [];
  for (const inv of s.invoices) {
    if (inv.cancelled || !inv.sharedAt) continue;
    inv.lines.forEach((l, index) => {
      if (!l.tracked || (l.optional && !l.selected)) return;
      out.push({
        inv,
        line: l,
        index,
        customer: byId(s.customers, inv.customerId),
        cover: coverOf(s, inv, l),
      });
    });
  }
  return out;
}

/* Find by serial (or part of one), model, model number or customer. */
export function find(s, q) {
  const k = key(q);
  if (k.length < 2) return [];
  return rows(s).filter(
    (r) =>
      key(r.line.serial).includes(k) ||
      key(r.line.model).includes(k) ||
      key(r.line.modelNo).includes(k) ||
      key(r.line.batch).includes(k) ||
      key(r.customer?.name).includes(k)
  );
}

/* The row behind a card link. */
export function byCard(s, card) {
  if (!card) return null;
  for (const inv of s.invoices) {
    if (inv.cancelled) continue;
    const index = inv.lines.findIndex((l) => l.card === card);
    if (index >= 0)
      return {
        inv,
        line: inv.lines[index],
        index,
        customer: byId(s.customers, inv.customerId),
        cover: coverOf(s, inv, inv.lines[index]),
      };
  }
  return null;
}
