/* Vertical starter kits (WBS 4.2, D1: all six verticals ship a kit). The salon kit is the sample data's own
   price list. The other five are DRAFTS written for the owner to approve (D96): every item, unit, price,
   package and noun below is a placeholder until approved. GST rate and HSN / SAC are left empty on purpose:
   rates per vertical are a CA question (D23), never invented. MOQ only for goods sellers (Design inputs.md,
   vertical sheets; D87). Advance % on packages: D56 (design agency 50 %); the restaurant advance % is a draft. */
import * as catalog from "./catalog.js";

/* nouns: the vocabulary from Design inputs.md "Vertical sheets", kept for the labels work in 4.2. */
export const KITS = {
  "Salon or spa": {
    draft: false,
    fromSample: true,
    nouns: { item: "Service", items: "Services", booking: "Appointment" },
    items: [
      ["Haircut and styling", "Hair", "visit", 800],
      ["Hair spa", "Hair", "visit", 1500],
      ["Global colour", "Hair", "visit", 3500],
      ["Keratin treatment", "Hair", "visit", 6500],
      ["Party makeup", "Makeup", "visit", 4500],
      ["Bridal makeup", "Makeup", "visit", 18000],
      ["Manicure", "Hands and feet", "visit", 700],
      ["Pedicure", "Hands and feet", "visit", 900],
    ].map(([name, category, unit, price]) => ({
      name,
      category,
      unit,
      price,
      gst: 18,
    })),
    packages: [],
  },
  Wholesaler: {
    draft: true,
    nouns: { item: "Product", items: "Products", price: "Rate" },
    items: [
      ["Steel tiffin box, 3 tier", "Kitchenware", "pc", 420, 50],
      ["Steel water bottle, 1 L", "Kitchenware", "pc", 260, 100],
      ["Pressure cooker, 5 L", "Kitchenware", "pc", 1450, 20],
      ["Steel dinner plate, 12 inch", "Kitchenware", "pc", 95, 200],
      ["Kadhai, 2 L", "Kitchenware", "pc", 520, 30],
      ["Spoon set of 12", "Cutlery", "pc", 180, 50],
      ["Steel sheet, 0.5 mm", "Raw material", "kg", 210, 100],
      ["Delivery within the city", "Services", "order", 500, null],
    ].map(([name, category, unit, price, moq]) => ({
      name,
      category,
      unit,
      price,
      moq,
    })),
    packages: [],
  },
  "Restaurant or café": {
    draft: true,
    nouns: {
      item: "Dish",
      items: "Menu",
      unit: "Per plate",
      booking: "Event date",
    },
    items: [
      ["Paneer butter masala", "Mains", "plate", 260],
      ["Veg biryani", "Mains", "plate", 220],
      ["Dal makhani", "Mains", "plate", 210],
      ["Butter naan", "Breads", "pc", 50],
      ["Gulab jamun, 2 pcs", "Desserts", "plate", 90],
      ["Masala chai", "Drinks", "cup", 30],
      ["Veg thali, catering", "Catering", "plate", 350],
      ["Chaat live counter", "Catering", "event", 8000],
    ].map(([name, category, unit, price]) => ({ name, category, unit, price })),
    packages: [
      {
        name: "Birthday party menu, 50 guests",
        items: [["Veg thali, catering", 50]],
        price: 17500,
        bookable: true,
        durationMin: 240,
        advancePct: 50,
      },
      {
        name: "Wedding catering, 200 guests",
        items: [
          ["Veg thali, catering", 200],
          ["Chaat live counter", 1],
        ],
        price: 78000,
        bookable: true,
        durationMin: 480,
        advancePct: 50,
      },
    ],
  },
  "IT services": {
    draft: true,
    nouns: { item: "Service", reply: "Proposal", job: "Milestone" },
    items: [
      ["Business website, 5 pages", "Websites", "project", 35000],
      ["E-commerce website", "Websites", "project", 90000],
      ["Android app, basic", "Apps", "project", 150000],
      ["UI / UX design", "Design", "hr", 1200],
      ["Development", "Development", "hr", 1500],
      ["Domain and hosting set-up", "Websites", "project", 4000],
      ["AMC support", "Support", "month", 5000],
    ].map(([name, category, unit, price]) => ({ name, category, unit, price })),
    packages: [
      {
        name: "Website",
        tier: "Basic",
        items: [["Business website, 5 pages", 1]],
        price: 35000,
      },
      {
        name: "Website",
        tier: "Standard",
        items: [
          ["Business website, 5 pages", 1],
          ["Domain and hosting set-up", 1],
        ],
        price: 39000,
      },
      {
        name: "AMC support",
        items: [["AMC support", 1]],
        price: 5000,
        billing: "monthly",
      },
    ],
  },
  Manufacturer: {
    draft: true,
    nouns: { item: "Item", items: "Items", job: "Order", done: "Dispatch" },
    items: [
      ["MS angle bracket, 50 mm", "Parts", "pc", 35, 500],
      ["Sheet metal enclosure, custom", "Fabrication", "pc", 2800, 10],
      ["Fabricated stand, standard", "Fabrication", "pc", 4500, 5],
      ["MS pipe, 1 inch", "Raw material", "m", 160, 50],
      ["CNC machining", "Services", "hr", 900, null],
      ["Laser cutting", "Services", "m", 40, 50],
      ["Powder coating", "Services", "sqft", 25, 100],
      ["Packing and dispatch", "Services", "order", 750, null],
    ].map(([name, category, unit, price, moq]) => ({
      name,
      category,
      unit,
      price,
      moq,
    })),
    packages: [],
  },
  "Design agency": {
    draft: true,
    nouns: { item: "Deliverable", reply: "Proposal" },
    items: [
      ["Logo design", "Branding", "project", 15000],
      ["Brand identity kit", "Branding", "project", 45000],
      ["Social media post", "Digital", "pc", 1200],
      ["Website UI design", "Digital", "page", 6000],
      ["Brochure, 8 pages", "Print", "project", 18000],
      ["Packaging design", "Print", "project", 25000],
      ["Extra revision round", "Extras", "revision", 2500],
    ].map(([name, category, unit, price]) => ({ name, category, unit, price })),
    packages: [
      {
        name: "Brand starter",
        tier: "Basic",
        items: [["Logo design", 1]],
        price: 15000,
        advancePct: 50,
      },
      {
        name: "Brand starter",
        tier: "Standard",
        items: [
          ["Logo design", 1],
          ["Social media post", 10],
        ],
        price: 26000,
        advancePct: 50,
      },
      {
        name: "Brand starter",
        tier: "Premium",
        items: [
          ["Brand identity kit", 1],
          ["Social media post", 20],
        ],
        price: 65000,
        advancePct: 50,
      },
    ],
  },
};

export const kitOf = (vertical) => KITS[vertical] || null;

/* Kit items not yet in the catalog (matched by name). */
export const missingItems = (s, kit) =>
  (kit?.items || []).filter((k) => !s.items.some((i) => i.name === k.name));

/* Load a kit: add its items and packages to the catalog (never removes or overwrites what is there).
   Mutates s; returns { recordId, text }. */
export function loadKit(s, { vertical }, ctx) {
  const kit = kitOf(vertical);
  if (!kit) return { text: "No starter kit for this business type." };
  let n = 0;
  for (const k of missingItems(s, kit)) {
    catalog.saveItem(
      s,
      {
        name: k.name,
        category: k.category,
        unit: k.unit,
        price: String(k.price),
        gst: k.gst === undefined || k.gst === null ? "" : String(k.gst),
        hsn: "",
        moq: k.moq ? String(k.moq) : "",
        showPrice: true,
        active: true,
      },
      ctx
    );
    n++;
  }
  let p = 0;
  for (const pk of kit.packages) {
    const label = `${pk.name}${pk.tier ? ` ${pk.tier}` : ""}`;
    if (
      s.packages.some(
        (x) =>
          `${x.name}${x.tier && x.tier !== "none" ? ` ${x.tier}` : ""}` ===
          label
      )
    )
      continue;
    catalog.savePackage(
      s,
      {
        name: pk.name,
        tier: pk.tier || "none",
        items: pk.items.map(([name, qty]) => ({
          itemId: s.items.find((i) => i.name === name)?.id,
          qty,
        })),
        price: String(pk.price),
        billing: pk.billing || "one_time",
        bookable: Boolean(pk.bookable),
        durationMin: pk.durationMin || 60,
        advancePct: pk.advancePct ? String(pk.advancePct) : "",
        active: true,
      },
      ctx
    );
    p++;
  }
  s.workspace.kitLoaded = [
    ...new Set([...(s.workspace.kitLoaded || []), vertical]),
  ];
  return {
    text: `${vertical} kit: ${n} item${n === 1 ? "" : "s"} and ${p} package${p === 1 ? "" : "s"} added${kit.draft ? " (draft, D96)" : ""}`,
  };
}
