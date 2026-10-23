/* Catalog items and packages (D77 Quick Catalog). Order here is the public page order. A price change never
   touches invoices already written: invoice lines are snapshots. */
import { byId, fail, nextId } from "../core/util.js";
import { need } from "./perms.js";
import { COVER } from "./serials.js";

const clean = (v) => String(v ?? "").trim();
const price = (v) => {
  const n = Math.round(+String(v).replace(/[^\d.]/g, ""));
  if (!(n >= 0) || Number.isNaN(n)) fail("Enter a price in rupees.");
  return n;
};

export function saveItem(s, a, ctx) {
  need(ctx, "catalog");
  if (!clean(a.name)) fail("Give the item a name.");
  const it = a.id ? byId(s.items, a.id) || fail("Item not found.") : null;
  const data = {
    name: clean(a.name),
    category: clean(a.category) || it?.category || s.categories[0] || "",
    unit: clean(a.unit) || it?.unit || "visit",
    price: price(a.price ?? it?.price ?? 0),
    gst: a.gst === undefined || a.gst === "" ? (it?.gst ?? null) : +a.gst,
    hsn: clean(a.hsn ?? it?.hsn),
    desc: clean(a.desc ?? it?.desc),
    showPrice:
      a.showPrice === undefined
        ? (it?.showPrice ?? true)
        : a.showPrice === true ||
          a.showPrice === "on" ||
          a.showPrice === "true",
    active:
      a.active === undefined
        ? (it?.active ?? true)
        : a.active === true || a.active === "on" || a.active === "true",
  };
  /* Serial and warranty fields (D85): only sent when the feature is on; otherwise kept as they were. */
  const yes = (v, d) =>
    v === undefined ? d : v === true || v === "on" || v === "true";
  Object.assign(data, {
    serials: yes(a.serials, it?.serials ?? false),
    model: clean(a.model ?? it?.model),
    modelNo: clean(a.modelNo ?? it?.modelNo),
    cover: COVER[a.cover ?? it?.cover] ? (a.cover ?? it?.cover) : "",
    coverMonths: Math.max(
      0,
      Math.round(+(a.coverMonths ?? it?.coverMonths ?? 0) || 0)
    ),
    trackBatch: yes(a.trackBatch, it?.trackBatch ?? false),
  });
  /* MOQ and photos (D87): moq is a whole number of units, or none; a photo from the form is added on save. */
  const moq = a.moq === undefined ? (it?.moq ?? null) : String(a.moq).trim();
  if (moq === null || moq === "") data.moq = null;
  else if (!/^\d+$/.test(String(moq)) || +moq < 1)
    fail("Minimum order is a whole number of 1 or more, or leave it empty.");
  else data.moq = +moq;
  data.photos = [...(it?.photos || [])];
  if (a.photo?.name) {
    if (data.photos.length >= MAX_ITEM_PHOTOS)
      fail(`Up to ${MAX_ITEM_PHOTOS} photos per item. Remove one first.`);
    data.photos.push({
      id: `F${data.photos.reduce((m, x) => Math.max(m, +String(x.id).slice(1) || 0), 0) + 1}`,
      name: String(a.photo.name),
      url: a.photo.url || null,
    });
  }
  if (data.cover && !data.coverMonths)
    fail(`Enter how many months the ${COVER[data.cover].toLowerCase()} lasts.`);
  if (data.category && !s.categories.includes(data.category))
    s.categories.push(data.category);
  if (it) {
    Object.assign(it, data);
    return { recordId: it.id, text: `Item updated: ${it.name}`, item: it };
  }
  const item = { id: nextId(s, "T"), ...data, sort: s.items.length + 1 };
  s.items.push(item);
  return { recordId: item.id, text: `Item added: ${item.name}`, item };
}

export const MAX_ITEM_PHOTOS = 4;
export function removeItemPhoto(s, { id, photoId }, ctx) {
  need(ctx, "catalog");
  const it = byId(s.items, id) || fail("Item not found.");
  if (!(it.photos || []).some((p) => p.id === photoId)) fail("Photo not found.");
  it.photos = it.photos.filter((p) => p.id !== photoId);
  return { recordId: id, text: `Photo removed from ${it.name}` };
}
/* The smallest quantity a customer may ask for (1 when no MOQ is set). */
export const minQty = (it) => (it?.moq > 1 ? it.moq : 1);

export function toggleItem(s, { id, field }, ctx) {
  need(ctx, "catalog");
  const it = byId(s.items, id) || fail("Item not found.");
  if (!["showPrice", "active"].includes(field)) fail("Unknown setting.");
  it[field] = !it[field];
  return {
    recordId: id,
    text: `${it.name}: ${field === "showPrice" ? (it.showPrice ? "price shown" : "Request a quote") : it.active ? "on catalog" : "hidden"}`,
  };
}

/* ids in their new order (drag and drop). */
export function reorder(s, { kind = "items", ids }, ctx) {
  need(ctx, "catalog");
  const list = s[kind];
  ids.forEach((id, i) => {
    const r = byId(list, id);
    if (r) r.sort = i + 1;
  });
  list.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  return { text: `${kind === "items" ? "Items" : "Packages"} reordered` };
}

export function removeItem(s, { id }, ctx) {
  need(ctx, "catalog");
  const it = byId(s.items, id) || fail("Item not found.");
  if (s.packages.some((p) => p.items.some((x) => x.itemId === id)))
    fail(
      `${it.name} is in a package. Take it out of the package first, or hide it instead.`
    );
  s.items = s.items.filter((x) => x.id !== id);
  return { recordId: id, text: `Item removed: ${it.name}` };
}

export function savePackage(s, a, ctx) {
  need(ctx, "catalog");
  if (!clean(a.name)) fail("Give the package a name.");
  const p = a.id ? byId(s.packages, a.id) || fail("Package not found.") : null;
  const items = (a.items || p?.items || [])
    .filter(
      (x) => (x.itemId ? byId(s.items, x.itemId) : clean(x.name)) && +x.qty > 0
    )
    .map((x) =>
      x.itemId
        ? { itemId: x.itemId, qty: +x.qty }
        : { itemId: null, name: clean(x.name), qty: +x.qty }
    );
  const data = {
    name: clean(a.name),
    tier: a.tier ?? p?.tier ?? "none",
    items,
    price: price(a.price ?? p?.price ?? 0),
    billing: a.billing ?? p?.billing ?? "one_time",
    bookable:
      a.bookable === undefined
        ? (p?.bookable ?? false)
        : a.bookable === true || a.bookable === "on" || a.bookable === "true",
    durationMin: +(a.durationMin ?? p?.durationMin ?? 60) || 60,
    advancePct:
      a.advancePct === "" || a.advancePct === undefined
        ? (p?.advancePct ?? null)
        : +a.advancePct || null,
    desc: clean(a.desc ?? p?.desc),
    active:
      a.active === undefined
        ? (p?.active ?? true)
        : a.active === true || a.active === "on" || a.active === "true",
  };
  if (
    data.advancePct !== null &&
    (data.advancePct < 1 || data.advancePct > 100)
  )
    fail("Advance is a percentage from 1 to 100.");
  if (p) {
    Object.assign(p, data);
    return { recordId: p.id, text: `Package updated: ${p.name}`, pkg: p };
  }
  const pkg = { id: nextId(s, "K"), ...data, sort: s.packages.length + 1 };
  s.packages.push(pkg);
  return { recordId: pkg.id, text: `Package added: ${pkg.name}`, pkg };
}

export const visibleItems = (s) =>
  s.items.filter((i) => i.active).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
export const itemsOf = (s, pkg) =>
  pkg.items
    .map((x) => ({ item: byId(s.items, x.itemId), qty: x.qty }))
    .filter((x) => x.item);
