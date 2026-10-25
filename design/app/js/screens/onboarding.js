/* ONBOARDING: Create workspace, Brand setup, Business details, Catalog starter, Invite team, Done.
   Same look as design/screens-v2.html (ONBOARDING block). Every step's primary button saves to the live
   workspace (sessionStorage) through the business layer, then opens the next step. */
import { biz } from "../biz/index.js";
import { need, ROLES } from "../biz/perms.js";
import { KITS, kitOf, loadKit, missingItems } from "../biz/kits.js";
import { KITS_ON } from "../biz/serials.js";
import { byId, esc, fail, fyCode, initials } from "../core/util.js";
import { call } from "../ui/actions.js";
import {
  I,
  C,
  M,
  check,
  dataTable,
  field,
  flabel,
  hint,
  input,
  link,
  modal,
  actionsRow,
  pill,
  qr,
  radios,
  seg,
  select,
  toolbar,
} from "../ui/kit.js";
import { bizLogo, bizMark, display, onboard } from "../ui/shell.js";
import { render } from "../ui/viewer.js";

/* ---------- shared ---------- */
const VERTICALS = [
  ["scissors", "Salon or spa", "Services, appointments, packages"],
  ["store", "Wholesaler", "Products, MOQ, rates, HSN"],
  ["utensils", "Restaurant or café", "Menu, per plate, events"],
  ["code", "IT services", "Proposals, milestones, AMC"],
  ["factory", "Manufacturer", "Specifications, lead time"],
  ["pen-tool", "Design agency", "Deliverables, revisions"],
];
const APPS = ["Vyapar", "Zoho", "Refrens", "Dukaan", "Excel", "None"];
const STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

/* Footer: Back link, extra, primary submit button (inside the step's form). */
const obFoot = (primary, extra = "", prev = "") =>
  `<div class="mt-8 flex flex-wrap items-center gap-2"><a ${link(prev)} class="btn btn-ghost">${I("arrow-left")}Back</a><span class="ml-auto"></span>${extra}<button type="submit" class="btn btn-primary btn-lg">${primary}${I("arrow-right")}</button></div>`;

const numberSample = (s, series, prefix) => {
  const n = s.workspace.numbering[series];
  return `${prefix || n.prefix}-${fyCode(s.meta.today)}-${String(n.next).padStart(4, "0")}`;
};
const first = (name = "") => String(name).split(" ")[0];

/* ---------- workspace (step 1) ---------- */
export const slugify = (t) =>
  String(t || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63);
/* DNS label rule only (letters, digits, hyphens, 1 to 63, no hyphen at either end). Reserved names: open. */
const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function createWorkspace(s, a, c) {
  need(c, "settings");
  const ws = s.workspace;
  const name = String(a.name ?? "").trim();
  if (!name) fail("The business needs a name.");
  const slug = String(a.slug ?? "")
    .trim()
    .toLowerCase();
  if (!SLUG.test(slug))
    fail(
      "Your link uses small letters, numbers and hyphens, and cannot start or end with a hyphen."
    );
  if (a.vertical && !VERTICALS.some((v) => v[1] === a.vertical))
    fail("Pick what kind of business it is.");
  ws.name = name;
  ws.slug = slug;
  if (a.vertical && a.vertical !== ws.vertical) {
    ws.vertical = a.vertical;
    /* Serial numbers and warranty: on by default for these kits, off for the rest (D85). */
    ws.modules = { ...ws.modules, serials: KITS_ON.includes(a.vertical) };
  }
  if (a.previousApp) ws.previousApp = a.previousApp;
  return {
    recordId: ws.id,
    text: `Workspace saved: ${name} · ${slug}.biz4kit.com`,
  };
}

/* ---------- brand (step 2) ---------- */
const HEX = /^#[0-9a-f]{6}$/i;
const hexOf = (v) => {
  const t = String(v ?? "")
    .trim()
    .toLowerCase();
  return t && !t.startsWith("#") ? `#${t}` : t;
};
const lum = (hex) => {
  const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = ch.map((v) =>
    v <= 0.039_28 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/* Contrast of white labels on the colour (WCAG). */
export const contrastWhite = (hex) =>
  HEX.test(hex) ? 1.05 / (lum(hex) + 0.05) : 0;

const LOGO_COLORS = [
  ["Main colour", "main"],
  ["Highlight colour", "accent"],
  ["Ink", "#1c1917"],
  ["Rose", "#9f1239"],
  ["Teal", "#0f766e"],
  ["Violet", "#6d28d9"],
  ["Orange", "#c2410c"],
];
const makerDefault = (s) => {
  const ini = initials(s.workspace.name).padEnd(2, "B");
  return { c1: ini[0], c2: ini[1], color: "main", thick: 6, pos: 42, rot: 0 };
};
const makerOf = (ctx) => {
  const base = { ...makerDefault(ctx.s), ...ctx.s.workspace.brand?.maker };
  const d = { ...base, ...ctx.ui.maker };
  if (ctx.ui["maker:color"]) d.color = ctx.ui["maker:color"];
  for (const k of ["thick", "pos", "rot"]) d[k] = +d[k] || 0;
  return d;
};
/* The made mark: two characters crossed by a line. fill: CSS colour (vars inline, hex in a saved file). */
const madeMark = (c, L, fill, name) =>
  `<svg class="${c}" viewBox="0 0 120 100" role="img" aria-label="${esc(name)} logo" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="100" rx="14" fill="#fff"/><g fill="${fill}"><text x="35" y="76" text-anchor="middle" font-family="Fraunces, serif" font-weight="800" font-size="72">${esc(L.c1)}</text><text x="85" y="76" text-anchor="middle" font-family="Fraunces, serif" font-weight="800" font-size="72">${esc(L.c2)}</text>${L.thick ? `<rect x="4" y="${L.pos - L.thick / 2}" width="112" height="${L.thick}" transform="rotate(${L.rot} 60 ${L.pos})"/>` : ""}</g></svg>`;
const cssFill = (color) =>
  color === "main"
    ? "var(--biz)"
    : color === "accent"
      ? "var(--biz-accent)"
      : color;
const hexFill = (s, color) =>
  color === "main"
    ? s.workspace.brand.primary
    : color === "accent"
      ? s.workspace.brand.accent
      : color;
const madeLogoUrl = (s, L) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(madeMark("", L, hexFill(s, L.color), s.workspace.name))}`;

export function useMadeLogo(s, a, c) {
  const L = { ...makerDefault(s), ...a };
  L.c1 = String(L.c1 ?? "")
    .trim()
    .slice(0, 1);
  L.c2 = String(L.c2 ?? "")
    .trim()
    .slice(0, 1);
  if (!L.c1 && !L.c2) fail("Type at least one character for the logo.");
  for (const k of ["thick", "pos", "rot"]) L[k] = +L[k] || 0;
  const res = biz.settings.saveBrand(
    s,
    { logo: madeLogoUrl(s, L) },
    c
  );
  Object.assign(s.workspace.brand, {
    maker: L,
    logoKind: "made",
    logoFile: "",
  });
  return { ...res, text: "Your made logo is on every screen" };
}

export function saveBrandStep(s, a, c) {
  const primary = hexOf(a.primary ?? s.workspace.brand.primary);
  const accent = hexOf(a.accent ?? s.workspace.brand.accent);
  if (!HEX.test(primary) || !HEX.test(accent))
    fail("Colours are hex values like #9f1239.");
  const ratio = contrastWhite(primary);
  if (ratio < 4.5)
    fail(
      `Labels on ${primary} reach ${ratio.toFixed(1)}:1; they need 4.5:1. Pick a darker main colour.`
    );
  biz.settings.saveBrand(s, { primary, accent }, c);
  const b = s.workspace.brand;
  if (b.logoKind === "made" && b.maker) b.logo = madeLogoUrl(s, b.maker);
  return { text: `Brand saved: ${primary} and ${accent}` };
}

/* ---------- details (step 3) ---------- */
export function saveDetails(s, a, c) {
  const gstin = String(a.gstin ?? "")
    .trim()
    .toUpperCase();
  biz.settings.saveBusiness(
    s,
    {
      phone: a.phone,
      state: a.state,
      address: a.address,
      city: a.city,
      pin: a.pin,
      gstin,
      upi: a.upi,
    },
    c
  );
  biz.settings.saveNumbering(
    s,
    { PI_prefix: a.PI_prefix, INV_prefix: a.INV_prefix },
    c
  );
  return { text: "Business details and numbering saved" };
}

/* ---------- catalog CSV import (step 4) ---------- */
const CSV_FIELDS = {
  name: ["name", "item", "service", "product", "item name"],
  category: ["category", "group", "section"],
  unit: ["unit", "per", "uom"],
  price: ["price", "rate", "amount", "mrp", "selling price"],
  gst: ["gst", "gst %", "gst%", "tax", "tax %"],
  hsn: ["hsn", "sac", "hsn/sac", "hsn code"],
  desc: ["description", "desc", "details", "notes"],
};
const FIELD_LABEL = {
  name: "Item name",
  category: "Category",
  unit: "Unit",
  price: "Price",
  gst: "GST %",
  hsn: "HSN / SAC",
  desc: "Description",
};
export function parseCsv(text) {
  const rows = [];
  let row = [],
    cell = "",
    q = false;
  const t = String(text).replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"' && t[i + 1] === '"') ((cell += '"'), i++);
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") (row.push(cell), (cell = ""));
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      ((row = []), (cell = ""));
    } else cell += ch;
  }
  if (cell || row.length) (row.push(cell), rows.push(row));
  const clean = rows.filter((r) => r.some((x) => x.trim()));
  const headers = (clean.shift() || []).map((h) => h.trim());
  const map = headers.map(
    (h) =>
      Object.entries(CSV_FIELDS).find(([, names]) =>
        names.includes(h.toLowerCase())
      )?.[0] || ""
  );
  return { headers, map, rows: clean };
}
export function importCsv(s, { csv }, c) {
  if (!csv?.rows?.length) fail("Read a CSV file first.");
  if (!csv.map.includes("name"))
    fail("No column is mapped to Item name. Name a column Name or Item.");
  let n = 0;
  csv.rows.forEach((r, i) => {
    const a = {};
    csv.map.forEach((f, k) => f && (a[f] = (r[k] ?? "").trim()));
    if (!a.name) return;
    try {
      biz.catalog.saveItem(s, a, c);
      n++;
    } catch (e) {
      fail(`Row ${i + 2} (${a.name}): ${e.message}`);
    }
  });
  if (!n) fail("No rows with an item name.");
  return { text: `Imported ${n} item${n === 1 ? "" : "s"} from CSV` };
}
const decodeDataUrl = (url) => {
  const [head, body] = String(url).split(",");
  if (/;base64/.test(head)) {
    const bin = atob(body);
    return new TextDecoder().decode(
      Uint8Array.from(bin, (ch) => ch.charCodeAt(0))
    );
  }
  return decodeURIComponent(body);
};

/* ---------- team (step 5) ---------- */
const ROLE_CARDS = [
  ["Manager", "Everything except billing"],
  ["Staff", "Own bookings and jobs, leads, invoices, proof"],
  ["Accountant", "Read-only money and export"],
];
const INVITE_ROLES = ["manager", "staff", "accountant"].map((r) => [
  r,
  ROLES[r],
]);

/* ---------- done (step 6) ---------- */
const priceListMessage = (ctx, customerId) => {
  const s = ctx.s;
  const t = ctx.biz.messages.template(s, ctx.biz.messages.T.priceList);
  const owner = s.members.find((m) => m.role === "owner");
  const vars = ctx.biz.messages.varsFor(s, {
    customerId,
    extra: { sender: first(ctx.me?.name || owner?.name || "") },
  });
  return {
    t,
    vars,
    subject: ctx.biz.messages.fill(t.subject, vars),
    body: ctx.biz.messages.fill(t.body, vars),
  };
};


export default [
  {
    n: 3,
    area: "Onboarding",
    id: "new",
    name: "Create workspace",
    route: "/new",
    action: "Create",
    who: "Owner",
    notes:
      'Slug suggested from the name, unique globally; vertical picks the starter kit (4.2); "which app today" drives hints and import mapping (1.4). Saves name, link (<slug>.biz4kit.com, D47) and type to the workspace.',
    render: (ctx) => {
      const ws = ctx.s.workspace;
      const d = ctx.ui.new || {};
      const name = d.name ?? ws.name;
      const prevName = ctx.ui["new:prevName"] ?? ws.name;
      let slug = d.slug ?? ws.slug;
      /* Suggest the slug from the name until the owner edits the slug. */
      if (
        d.name !== undefined &&
        d.name !== prevName &&
        (slug === slugify(prevName) || slug === ws.slug || !slug)
      ) {
        slug = slugify(name);
        if (ctx.ui.new) ctx.ui.new.slug = slug;
      }
      ctx.ui["new:prevName"] = name;
      const ok = SLUG.test(slug);
      const vertical = ctx.ui["new:vertical"] ?? ws.vertical;
      const app = d.previousApp ?? ws.previousApp ?? "";
      return onboard(
        0,
        `<form class="max-w-2xl" data-do="createWorkspace" data-draft="new">
    ${display("Set up your business", "About eight minutes. Your customers see your name, never ours.")}
    <div class="mt-6 grid @tab:grid-cols-2 gap-3">
      ${field("Business name", "name", { value: name, req: true, autocomplete: "organization" })}
      <div><label class="flabel" for="f-slug">Your link</label><label class="field"><input id="f-slug" name="slug" class="code min-w-0 flex-1 bg-transparent outline-none" value="${esc(slug)}" autocomplete="off" spellcheck="false" aria-label="Your link" /><span class="code text-muted-foreground">.biz4kit.com</span>${ok ? I("circle-check", "size-icon text-success ml-auto") : I("circle-alert", "size-icon text-destructive ml-auto")}</label>${ok ? `<p class="hint text-success" data-slug-ok>Available</p>` : `<p class="hint text-destructive" data-slug-ok>Small letters, numbers and hyphens only</p>`}</div>
    </div>
    <p class="flabel mt-5">What kind of business is it?</p>
    <input type="hidden" name="vertical" value="${esc(vertical)}" />
    <div class="grid @tab:grid-cols-2 @web:grid-cols-3 gap-2" data-choice role="group" aria-label="Business type">${VERTICALS.map(
      (v) =>
        `<button type="button" class="choice" aria-pressed="${v[1] === vertical}" data-ui="new:vertical" data-v="${esc(v[1])}">${I(v[0], "size-icon mt-0.5 text-muted-foreground")}<span><span class="block font-medium">${v[1]}</span><span class="block text-caption text-muted-foreground">${v[2]}</span></span></button>`
    ).join("")}</div>
    <p class="hint" data-choice-out>Starter kit: ${esc(vertical)}</p>
    <p class="flabel mt-5">Which app do you use today?</p>
    ${radios("previousApp", APPS, app, { label: "Which app do you use today?" })}
    <p class="hint">We show your old app's words once, as hints.</p>
    ${obFoot("Create", "", "login")}
  </form>`
      );
    },
    actions: {
      createWorkspace: (ctx, args) => {
        const out = call(
          "Onboarding: create workspace",
          (s, c) =>
            createWorkspace(
              s,
              { ...args, vertical: args.vertical || ctx.ui["new:vertical"] },
              c
            ),
          ctx
        );
        delete ctx.ui["new:prevName"];
        return { ...out, go: ["brand"] };
      },
    },
    checks: [
      (t, h) => {
        const f = h.at("new");
        t(
          f.querySelectorAll("[data-choice] .choice").length ===
            VERTICALS.length,
          "six business types to pick from"
        );
        t(
          f.querySelector('[name="slug"]')?.value ===
            h.makeCtx().s.workspace.slug,
          "the link field shows the saved slug"
        );
        const c = { role: "owner", memberId: h.s.meta.people.owner };
        call(
          "check",
          (s, cc) =>
            createWorkspace(
              s,
              {
                name: "Glow Studio Pune",
                slug: "glow-pune",
                vertical: "Wholesaler",
              },
              cc
            ),
          c
        );
        const ws = h.makeCtx().s.workspace;
        t(
          ws.name === "Glow Studio Pune" &&
            ws.slug === "glow-pune" &&
            ws.vertical === "Wholesaler",
          "Create saves name, slug and vertical to the workspace"
        );
        t(
          h.at("new").querySelector('[aria-pressed="true"]')?.dataset.v ===
            "Wholesaler",
          "the saved business type is selected"
        );
        let err = "";
        try {
          call(
            "check",
            (s, cc) => createWorkspace(s, { name: "X", slug: "-bad slug" }, cc),
            c
          );
        } catch (e) {
          err = e.message;
        }
        t(err.includes("small letters"), "a bad link is refused");
        t(
          slugify("Glow Studio & Spa") === "glow-studio-spa",
          "slug is suggested from the name"
        );
      },
    ],
  },
  {
    n: 4,
    area: "Onboarding",
    id: "brand",
    name: "Brand setup",
    route: "/new/brand",
    action: "Save and preview",
    who: "Owner",
    notes:
      "Logo light required, dark optional; two colours or extracted from the logo; contrast gate ≥ 4.5:1. Logo: upload, or make one from two characters and a line (preset colour, thickness, position, rotation); Use this logo applies it to every screen. Logo maker is still an open question to the owner. Try the brand swatches in the toolbar.",
    render: (ctx) => {
      const s = ctx.s;
      const b = s.workspace.brand;
      const d = ctx.ui.brand || {};
      const primary = hexOf(d.primary ?? b.primary);
      const accent = hexOf(d.accent ?? b.accent);
      const pOk = HEX.test(primary),
        aOk = HEX.test(accent);
      const ratio = contrastWhite(primary);
      const L = makerOf(ctx);
      const tab =
        ctx.ui["brand:tab"] ?? (b.logoKind === "made" ? "make" : "up");
      const status = b.logo
        ? b.logoKind === "made"
          ? "Your made logo is on"
          : "Your upload is on"
        : "Sample logo";
      const items = ctx.biz.catalog.visibleItems(s);
      const lines = items
        .slice(0, 2)
        .map((it) => ctx.biz.invoices.lineFromItem(it));
      const tot = ctx.biz.invoices.totals(s, {
        lines,
        discount: 0,
        customerId: null,
      });
      const rates = [...new Set(lines.map((l) => l.gst ?? 0))];
      const totalLabel =
        tot.gstOn && rates.length === 1 && rates[0]
          ? `Total incl. ${rates[0]}% GST`
          : tot.gstOn
            ? "Total incl. GST"
            : "Total";
      const pi = numberSample(s, "PI");
      const cats = s.categories.filter((c) =>
        items.some((i) => i.category === c)
      );
      const shown = items
        .filter((i) => i.category === cats[0] && i.showPrice)
        .slice(0, 2);
      const vars =
        ctx.ui.brand && pOk
          ? `--biz:${primary};--biz-foreground:#ffffff;--biz-soft:color-mix(in oklch, ${primary} 8%, white);${aOk ? `--biz-accent:${accent};` : ""}`
          : "";
      const body = `<div class="max-w-xl">
    ${display("Make it yours", "Your logo and two colours go on everything your customers see.")}
    <div class="mt-6 card p-card-sm @tab:p-card text-left" data-panels>
      <div class="flex flex-wrap items-center gap-2"><p class="font-medium">Logo</p><span class="text-caption text-muted-foreground" data-logo-status>${status}</span><div class="ml-auto">${seg(
        ctx,
        "brand:tab",
        [
          ["up", "Upload"],
          ["make", "Make one"],
        ],
        tab
      )}</div></div>
      <div data-panel="up" ${tab === "make" ? "hidden" : ""} class="mt-3 grid grid-cols-2 gap-3">
        <form data-do="logoUpload" data-a-slot="light" data-autosubmit class="contents"><label class="rounded-control border border-dashed border-border bg-card p-4 text-center cursor-pointer hover:bg-muted">${bizMark(s, "size-12 mx-auto")}<p class="mt-2 font-medium">Logo, light pages</p><p class="text-caption text-muted-foreground" data-logo-file="light">${b.logo && b.logoKind !== "made" && b.logoFile ? esc(b.logoFile) : "SVG or PNG, 512 px or larger"}</p><span class="mt-2 btn btn-secondary btn-sm">${I("upload", "size-icon-sm")}${b.logo && b.logoKind !== "made" ? "Replace" : "Upload"}</span><input type="file" name="file" accept="image/svg+xml,image/png" class="sr-only" data-logo-upload="light"></label></form>
        <form data-do="logoUpload" data-a-slot="dark" data-autosubmit class="contents"><label class="rounded-control border border-dashed border-border bg-card p-4 text-center cursor-pointer hover:bg-muted">${b.logoDark ? `<img class="size-12 mx-auto object-contain rounded-control bg-foreground" src="${esc(b.logoDark)}" alt="">` : I("image-up", "size-icon mx-auto text-muted-foreground")}<p class="mt-2 font-medium">Logo, dark pages</p><p class="text-caption text-muted-foreground" data-logo-file="dark">${b.logoDark && b.logoDarkFile ? esc(b.logoDarkFile) : "Optional. SVG or PNG, 512 px+"}</p><span class="mt-2 btn btn-secondary btn-sm">${I("upload", "size-icon-sm")}${b.logoDark ? "Replace" : "Upload"}</span><input type="file" name="file" accept="image/svg+xml,image/png" class="sr-only" data-logo-upload="dark"></label></form>
      </div>
      <form data-panel="make" ${tab === "make" ? "" : "hidden"} class="mt-3 grid @tab:grid-cols-[10rem_1fr] gap-4" data-do="useMadeLogo" data-draft="maker">
        <div class="text-center"><div class="rounded-card border border-border bg-muted p-3" data-logo-made>${madeMark("w-full h-auto", L, cssFill(L.color), s.workspace.name)}</div>
          <div class="mt-2 flex items-center justify-center gap-2 text-caption text-muted-foreground"><span data-logo-small>${madeMark("size-8", L, cssFill(L.color), s.workspace.name)}</span>32 px, sidebar</div></div>
        <div class="space-y-3">
          <div><p class="flabel">Colour</p><div class="flex flex-wrap gap-2">${LOGO_COLORS.map((c) => `<button type="button" class="swatch" style="background:${cssFill(c[1])}" title="${c[0]}" aria-label="${c[0]}" aria-pressed="${c[1] === L.color}" data-ui="maker:color" data-v="${c[1]}"></button>`).join("")}</div></div>
          <div class="grid grid-cols-2 gap-3">${[
            ["c1", "Character 1"],
            ["c2", "Character 2"],
          ]
            .map(
              (f) =>
                `<div><label class="flabel" for="logo-${f[0]}">${f[1]}</label><input id="logo-${f[0]}" name="${f[0]}" class="field code justify-center text-center" maxlength="1" value="${esc(L[f[0]])}" data-logo="${f[0]}" autocomplete="off"></div>`
            )
            .join("")}</div>
          ${[
            ["thick", "Line thickness", 0, 16, " px"],
            ["pos", "Line position", 15, 85, "%"],
            ["rot", "Line rotation", -45, 45, "°"],
          ]
            .map(
              (r) =>
                `<div><div class="flex"><label class="flabel" for="logo-${r[0]}">${r[1]}</label><span class="ml-auto code text-muted-foreground" data-logo-out="${r[0]}">${L[r[0]]}${r[4]}</span></div><input id="logo-${r[0]}" name="${r[0]}" type="range" min="${r[2]}" max="${r[3]}" step="1" value="${L[r[0]]}" data-logo="${r[0]}"></div>`
            )
            .join("")}
          <input type="hidden" name="color" value="${esc(L.color)}" />
          <div class="flex gap-2"><button type="button" class="btn btn-ghost" data-do="logoReset">${I("rotate-ccw", "size-icon-sm")}Back to sample</button><button type="submit" class="btn btn-primary ml-auto">${I("check")}Use this logo</button></div>
        </div>
      </form>
    </div>
    <form data-do="saveBrandStep" data-draft="brand">
    <div class="mt-4 grid @tab:grid-cols-2 gap-3">${[
      [
        "Main colour",
        "bg-biz",
        "primary",
        primary,
        b.logoKind === "made" &&
          b.maker &&
          HEX.test(hexFill(s, b.maker.color)) &&
          b.maker.color !== "main",
      ],
      ["Highlight colour", "bg-biz-accent", "accent", accent, false],
    ]
      .map(
        (c) =>
          `<div><label class="flabel" for="f-${c[2]}">${c[0]}</label><label class="field pl-1.5"><span class="size-6 rounded-xs shrink-0 ${c[1]}" ${HEX.test(c[3]) ? `style="background:${c[3]}"` : ""}></span><input id="f-${c[2]}" name="${c[2]}" class="code min-w-0 flex-1 bg-transparent outline-none" value="${esc(c[3])}" maxlength="7" autocomplete="off" spellcheck="false" data-hex="${c[2]}" />${c[4] ? `<button type="button" class="ml-auto text-caption text-secondary-foreground" data-do="fromLogo">From logo</button>` : ""}</label></div>`
      )
      .join("")}</div>
    ${
      !pOk || !aOk
        ? `<div class="mt-3 flex gap-2 items-start p-3 rounded-control bg-warning-soft text-warning">${I("triangle-alert", "size-icon mt-0.5")}<span><b>Check the colours.</b> Use hex values like #9f1239.</span></div>`
        : ratio >= 4.5
          ? `<div class="mt-3 flex gap-2 items-start p-3 rounded-control bg-success-soft text-success" data-contrast="ok">${I("circle-check", "size-icon mt-0.5")}<span><b>Readable.</b> Labels on your main colour pass 4.5:1 (${ratio.toFixed(1)}:1). Dark mode lightens it one step.</span></div>`
          : `<div class="mt-3 flex gap-2 items-start p-3 rounded-control bg-destructive text-destructive-foreground" data-contrast="bad">${I("circle-alert", "size-icon mt-0.5")}<span><b>Hard to read.</b> Labels on your main colour reach ${ratio.toFixed(1)}:1; they need 4.5:1. Pick a darker colour.</span></div>`
    }
    ${lines[0] ? `<div class="@web:hidden mt-4 rounded-card overflow-hidden border border-border"><div class="bg-biz text-biz-foreground px-4 py-3 flex items-center justify-between"><span class="text-label uppercase tracking-wider">Preview</span><span class="font-semibold">${esc(pi)}</span></div><div class="p-3 flex justify-between bg-card"><span>${esc(lines[0].name)}</span>${M(lines[0].rate)}</div></div>` : ""}
    ${obFoot("Save and preview", "", "new")}
    </form>
  </div>`;
      const aside = `<p class="label mb-2">Live preview</p>
    <div class="font-customer rounded-card overflow-hidden border border-customer-border bg-customer-surface text-customer-text">
      <div class="bg-biz text-biz-foreground p-4 flex items-center justify-between"><span class="bg-customer-surface text-customer-text rounded-control px-1.5 py-1">${bizLogo(s, "h-5")}</span><div class="text-right"><div class="text-label uppercase tracking-wider">Proforma invoice</div><div class="font-semibold">${esc(pi)}</div></div></div>
      <div class="p-4 space-y-1.5">${lines.map((l) => `<div class="flex justify-between"><span>${esc(l.name)}</span>${M(l.qty * l.rate)}</div>`).join("")}<div class="flex justify-between font-semibold pt-1.5 border-t border-customer-border"><span>${totalLabel}</span>${M(tot.total)}</div></div>
    </div>
    <div class="mt-4 font-customer rounded-card border border-customer-border bg-customer-page text-customer-text p-4">
      <div class="flex items-center justify-between">${bizLogo(s, "h-5")}<span class="size-control-sm rounded-sm bg-biz-soft text-biz flex items-center justify-center">${I("search", "size-icon-sm")}</span></div>
      <div class="mt-3 flex gap-1.5 text-caption">${[...cats.slice(0, 2), ...(s.packages.some((p) => p.active) ? ["Packages"] : [])].map((t, i) => `<span class="px-2.5 h-control-sm flex items-center rounded-xs ${i ? "bg-customer-surface border border-customer-border" : "bg-biz text-biz-foreground"}">${esc(t)}</span>`).join("")}</div>
      <div class="mt-3 grid grid-cols-2 gap-2">${shown
        .map(
          (n) =>
            `<div class="ccard p-2"><div class="h-14 rounded-xs bg-biz-soft"></div><div class="mt-1.5 font-medium">${esc(n.name)}</div><div class="text-customer-muted">${M(n.price)}</div></div>`
        )
        .join("")}</div>
    </div>`;
      return `<div class="h-full" ${vars ? `style="${vars}"` : ""}>${onboard(1, body, aside)}</div>`;
    },
    actions: {
      saveBrandStep: (ctx, args) => {
        const out = call(
          "Onboarding: brand",
          (s, c) => saveBrandStep(s, args, c),
          ctx
        );
        return { ...out, go: ["details"] };
      },
      useMadeLogo: (ctx, args) => {
        const a = { ...args, color: ctx.ui["maker:color"] ?? args.color };
        const out = call(
          "Onboarding: use made logo",
          (s, c) => useMadeLogo(s, a, c),
          ctx
        );
        delete ctx.ui["maker:color"];
        ctx.ui["brand:tab"] = "make";
        return out;
      },
      logoReset: (ctx) => {
        const out = call(
          "Onboarding: sample logo",
          (s, c) => {
            const r = biz.settings.saveBrand(s, { logo: "" }, c);
            const b = s.workspace.brand;
            for (const k of ["maker", "logoKind", "logoFile"]) delete b[k];
            return { ...r, text: "Back to the sample logo" };
          },
          ctx
        );
        delete ctx.ui.maker;
        delete ctx.ui["maker:color"];
        return out;
      },
      fromLogo: (ctx) => {
        const b = ctx.s.workspace.brand;
        const hex = hexFill(ctx.s, b.maker?.color);
        ctx.ui.brand = { ...(ctx.ui.brand || {}), primary: hex };
        return { text: `Main colour taken from the logo: ${hex}` };
      },
      /* Reads the picked file (SVG or PNG), then saves it as the logo. PNGs under 512 px get a warning. */
      logoUpload: (ctx, { slot = "light" }) => {
        need(ctx, "settings");
        const el = document.querySelector(
          `#stage [data-logo-upload="${slot}"]`
        );
        const file = el?.files?.[0];
        if (!file) fail("Pick an SVG or PNG file.");
        if (!/^image\/(png|svg\+xml)$/.test(file.type))
          fail("Use an SVG or PNG file.");
        const r = new FileReader();
        r.onload = () => {
          const img = new Image();
          const done = (w = 0, h = 0) => {
            const small =
              file.type === "image/png" && w && Math.min(w, h) < 512;
            const label = `${file.name}${w ? ` · ${w}×${h}` : ""}${small ? " · under 512 px, may look blurry" : ""}`;
            try {
              call(
                `Onboarding: upload ${slot} logo`,
                (s, c) => {
                  const b = s.workspace.brand;
                  if (slot === "dark") {
                    need(c, "settings");
                    Object.assign(b, {
                      logoDark: r.result,
                      logoDarkFile: label,
                    });
                    return { text: `Dark-page logo uploaded: ${file.name}` };
                  }
                  biz.settings.saveBrand(s, { logo: r.result }, c);
                  Object.assign(b, { logoKind: "upload", logoFile: label });
                  return { text: `Logo uploaded: ${file.name}` };
                },
                ctx
              );
            } catch {}
            ctx.ui["brand:tab"] = "up";
            render();
          };
          img.onload = () => done(img.naturalWidth, img.naturalHeight);
          img.onerror = () => done();
          img.src = r.result;
        };
        r.readAsDataURL(file);
        return { text: `Reading ${file.name}` };
      },
    },
    checks: [
      (t, h) => {
        const c = { role: "owner", memberId: h.s.meta.people.owner };
        t(
          contrastWhite("#ffffff") < 1.1 && contrastWhite("#9f1239") > 4.5,
          "contrast is measured against white labels"
        );
        call(
          "check",
          (s, cc) =>
            saveBrandStep(s, { primary: "0f766e", accent: "#f59e0b" }, cc),
          c
        );
        t(
          h.makeCtx().s.workspace.brand.primary === "#0f766e",
          "Save and preview stores the main colour"
        );
        let err = "";
        try {
          call(
            "check",
            (s, cc) =>
              saveBrandStep(s, { primary: "#fde68a", accent: "#f59e0b" }, cc),
            c
          );
        } catch (e) {
          err = e.message;
        }
        t(
          err.includes("4.5:1"),
          "a main colour below 4.5:1 is refused (contrast gate)"
        );
        call(
          "check",
          (s, cc) =>
            useMadeLogo(
              s,
              { c1: "X", c2: "Y", color: "main", thick: 6, pos: 42, rot: 0 },
              cc
            ),
          c
        );
        const b = h.makeCtx().s.workspace.brand;
        t(
          String(b.logo).startsWith("data:image/svg+xml") &&
            b.logoKind === "made",
          "Use this logo saves the made logo"
        );
        t(
          decodeURIComponent(b.logo).includes("#0f766e"),
          "the saved logo uses the real main colour"
        );
        const f = h.at("brand");
        t(
          f
            .querySelector("[data-logo-status]")
            ?.textContent.includes("made logo"),
          "the logo status says the made logo is on"
        );
        t(
          f.querySelectorAll('[data-ui="maker:color"]').length ===
            LOGO_COLORS.length,
          "logo maker keeps its preset colours"
        );
        t(
          f.querySelector("[data-logo-made]")?.textContent.includes("X"),
          "the maker shows the saved characters"
        );
        t(
          f.querySelector('[data-do="logoUpload"]') &&
            f.querySelector("[data-logo-upload=dark]"),
          "light and dark logo upload are there"
        );
      },
    ],
  },
  {
    n: 5,
    area: "Onboarding",
    id: "details",
    name: "Business details",
    route: "/new/details",
    action: "Save",
    who: "Owner",
    notes:
      "GST number optional; it unlocks GST fields. Numbers: {prefix}-{FY}-{seq}. PI- when shared; INV- gap-free when the payment is approved (D60, D71). Saves via settings.saveBusiness and saveNumbering.",
    render: (ctx) => {
      const s = ctx.s,
        ws = s.workspace;
      const d = ctx.ui.details || {};
      const v = (k) => d[k] ?? ws[k] ?? "";
      const pre = (series) =>
        String(
          d[`${series}_prefix`] ?? ws.numbering[series].prefix
        ).toUpperCase();
      return onboard(
        2,
        `<form class="max-w-2xl" data-do="saveDetails" data-draft="details">
    ${display("Business details", "These go on your replies and invoices. Change them later in Settings.")}
    <div class="mt-6 grid @tab:grid-cols-2 gap-x-3 gap-y-4">
      ${field("Phone", "phone", { value: v("phone"), cls: "code", type: "tel", autocomplete: "tel" })}
      <div>${flabel("State", false, "f-state")}${select("state", STATES, v("state"), { id: "f-state" })}</div>
      <div class="@tab:col-span-2 grid grid-cols-[1fr_8rem] @tab:grid-cols-[1fr_10rem_7rem] gap-3">
        ${field("Address", "address", { value: v("address"), wrap: "col-span-2 @tab:col-span-1", autocomplete: "street-address" })}
        ${field("City", "city", { value: v("city") })}
        ${field("PIN", "pin", { value: v("pin"), cls: "code", inputmode: "numeric" })}
      </div>
      <div><label class="flabel" for="f-gstin">GST number <span class="text-muted-foreground font-normal">optional</span></label>${input("gstin", { id: "f-gstin", value: v("gstin"), cls: "code uppercase" })}${hint(v("gstin") ? "Turns on GST fields." : "Without it, replies and invoices show no GST.")}</div>
      ${field("UPI ID", "upi", { value: v("upi"), cls: "code", hint: "Customers pay this from any UPI app." })}
      <div>${flabel("Proforma prefix", false, "f-PI_prefix")}${input("PI_prefix", { id: "f-PI_prefix", value: pre("PI"), cls: "code uppercase" })}<p class="hint" data-sample="PI">Next reply: ${C(numberSample(s, "PI", pre("PI")))}</p></div>
      <div>${flabel("Invoice prefix", false, "f-INV_prefix")}${input("INV_prefix", { id: "f-INV_prefix", value: pre("INV"), cls: "code uppercase" })}<p class="hint" data-sample="INV">Next invoice: ${C(numberSample(s, "INV", pre("INV")))}</p></div>
    </div>
    ${obFoot("Save", "", "brand")}
  </form>`
      );
    },
    actions: {
      saveDetails: (ctx, args) => {
        const out = call(
          "Onboarding: business details",
          (s, c) => saveDetails(s, args, c),
          ctx
        );
        return { ...out, go: ["catalog-starter"] };
      },
    },
    checks: [
      (t, h) => {
        const c = { role: "owner", memberId: h.s.meta.people.owner };
        const f = h.at("details");
        t(
          f.querySelector('[name="gstin"]')?.value === h.s.workspace.gstin,
          "GST number shows the saved value"
        );
        t(
          f
            .querySelector('[data-sample="PI"]')
            ?.textContent.includes(
              `-${String(h.s.workspace.numbering.PI.next).padStart(4, "0")}`
            ),
          "the proforma hint shows the real next number"
        );
        call(
          "check",
          (s, cc) =>
            saveDetails(
              s,
              {
                phone: "+91 90000 00000",
                state: "Goa",
                address: "1 Main Road",
                city: "Panaji",
                pin: "403001",
                gstin: "",
                upi: "x@upi",
                PI_prefix: "pr",
                INV_prefix: "TI",
              },
              cc
            ),
          c
        );
        const ws = h.makeCtx().s.workspace;
        t(
          ws.state === "Goa" && ws.city === "Panaji" && ws.gstin === "",
          "Save stores the business details"
        );
        t(
          ws.numbering.PI.prefix === "PR" && ws.numbering.INV.prefix === "TI",
          "Save stores the PI / INV prefixes"
        );
        t(
          h
            .at("details")
            .querySelector('[data-sample="INV"]')
            ?.textContent.includes("TI-"),
          "the invoice hint follows the new prefix"
        );
        let err = "";
        try {
          call("check", (s, cc) => saveDetails(s, { gstin: "12345" }, cc), c);
        } catch (e) {
          err = e.message;
        }
        t(err.includes("GSTIN"), "a wrong GST number is refused");
      },
    ],
  },
  {
    n: 6,
    area: "Onboarding",
    id: "catalog-starter",
    name: "Catalog starter",
    route: "/new/catalog",
    action: "Keep / edit / import",
    who: "Owner",
    notes:
      "Every vertical has a starter kit (WBS 4.2, D1): the salon kit is the sample price list; the other five are drafts for the owner to approve (D96). Loading a kit adds its items and packages, never removes any. Prices edit inline; CSV import shows the mapping before saving. Remove takes an item off the catalog (it can be put back).",
    render: (ctx) => {
      const s = ctx.s;
      const items = [...s.items].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
      const live = items.filter((i) => i.active).length;
      const pk = s.packages.filter((p) => p.active).length;
      const salon = s.workspace.vertical === "Salon or spa";
      const kit = kitOf(s.workspace.vertical);
      const toAdd = missingItems(s, kit);
      const draftMark = kit?.draft
        ? `<span class="italic text-warning" data-kit-draft>[Draft kit: owner to approve (D96)]</span>`
        : "";
      const kitCard =
        kit && toAdd.length
          ? `<div class="card p-card-sm space-y-2" data-kit="${esc(s.workspace.vertical)}"><div class="flex flex-wrap items-center gap-2"><p class="font-medium">Starter kit: ${esc(s.workspace.vertical)}</p>${draftMark}</div><p class="text-caption text-muted-foreground">${toAdd.length} item${toAdd.length === 1 ? "" : "s"} (${esc(
              toAdd
                .slice(0, 4)
                .map((k) => k.name)
                .join(", ")
            )}${toAdd.length > 4 ? ", …" : ""})${kit.packages.length ? ` and ${kit.packages.length} package${kit.packages.length === 1 ? "" : "s"}` : ""}. GST rate and HSN / SAC stay empty for you to fill in.</p><button type="button" class="btn btn-primary" data-need="catalog" data-do="loadKit">${I("package-plus")}Add the ${esc(s.workspace.vertical)} kit</button></div>`
          : "";
      const csv = ctx.ui.csv;
      const gst = ctx.biz.invoices.gstFor(s, {});
      const units = [...new Set(s.items.map((i) => i.unit).filter(Boolean))];
      const rows = items.map((r) => ({
        id: r.id,
        text: `${r.name} ${r.category}`,
        cells: [
          `<span class="font-medium ${r.active ? "" : "line-through text-muted-foreground"}">${esc(r.name)}</span>`,
          esc(r.category),
          `per ${esc(r.unit)}`,
          r.active
            ? `<form data-do="catalog.saveItem" data-a-id="${r.id}" data-autosubmit class="inline-flex"><input type="hidden" name="name" value="${esc(r.name)}" /><input class="field money inline-flex w-28 h-control-sm text-right" name="price" value="${r.price}" inputmode="numeric" aria-label="Price of ${esc(r.name)}" autocomplete="off" /></form>`
            : `<span class="text-muted-foreground">Removed</span>`,
          r.active
            ? `<button type="button" class="btn btn-ghost btn-sm btn-icon" data-need="catalog" data-do="catalog.toggleItem" data-a-id="${r.id}" data-a-field="active" aria-label="Remove ${esc(r.name)}">${I("trash-2", "size-icon-sm")}</button>`
            : `<button type="button" class="btn btn-ghost btn-sm btn-icon" data-need="catalog" data-do="catalog.toggleItem" data-a-id="${r.id}" data-a-field="active" aria-label="Put ${esc(r.name)} back">${I("rotate-ccw", "size-icon-sm")}</button>`,
        ],
      }));
      const addDlg = modal(
        "add-item",
        "Add item",
        `<form data-do="catalog.saveItem" class="mt-3 space-y-3">
        ${field("Name", "name", { req: true })}
        <div class="grid grid-cols-2 gap-3"><div>${flabel("Category", false, "ai-cat")}${select("category", s.categories, s.categories[0], { id: "ai-cat" })}</div>${field("Unit", "unit", { value: units[0] || "", id: "ai-unit" })}</div>
        <div class="grid grid-cols-2 gap-3">${field("Price (₹)", "price", { money: true, req: true, id: "ai-price" })}${field("GST %", "gst", { value: s.workspace.gstin ? gst : "", inputmode: "numeric", id: "ai-gst", hint: s.workspace.gstin ? "The rate most of your items use." : "No GST number: GST is not shown." })}</div>
        <label class="flex items-center gap-2">${check("showPrice", true, { label: "Show the price" })}<span>Show the price on the catalog</span></label>
        ${actionsRow(`<button type="submit" class="btn btn-primary">${I("plus")}Add item</button>`)}
      </form>`
      );
      const csvDlg = modal(
        "import-csv",
        "Import CSV",
        `<p class="mt-2 text-muted-foreground">One row per item. Columns we read: ${Object.values(FIELD_LABEL).join(", ")}. The first row names the columns.</p>
      <form data-do="csvRead" data-keep-open class="mt-3 flex flex-wrap items-end gap-2">
        <label class="field flex-1 min-w-0 cursor-pointer">${I("file-spreadsheet", "size-icon text-muted-foreground")}<span class="truncate" data-csv-name>${csv ? esc(csv.file) : "Choose a .csv file"}</span><input type="file" name="file" accept=".csv,text/csv" class="sr-only" data-preview="[data-csv-name]" /></label>
        <button type="submit" class="btn btn-outline">${I("eye")}Show mapping</button>
      </form>
      ${
        csv
          ? `<div class="mt-3 rounded-control border border-border overflow-hidden"><table class="tbl w-full border-collapse"><thead class="bg-muted"><tr><th class="th pl-card-sm">Column in file</th><th class="th">Goes to</th><th class="th pr-card-sm">First row</th></tr></thead><tbody>${csv.headers
              .map(
                (hd, k) =>
                  `<tr><td class="td pl-card-sm">${esc(hd)}</td><td class="td">${csv.map[k] ? FIELD_LABEL[csv.map[k]] : '<span class="text-muted-foreground">Not used</span>'}</td><td class="td pr-card-sm text-muted-foreground truncate">${esc(csv.rows[0]?.[k] ?? "")}</td></tr>`
              )
              .join("")}</tbody></table></div>
      <p class="hint" data-csv-count>${csv.rows.length} row${csv.rows.length === 1 ? "" : "s"} to import${csv.map.includes("name") ? "" : ' · <span class="text-destructive">no column maps to Item name</span>'}</p>
      ${actionsRow(`<button type="button" class="btn btn-primary" data-do="csvImport">${I("upload")}Import ${csv.rows.length} items</button>`)}`
          : ""
      }`
      );
      return onboard(
        3,
        `<div class="max-w-3xl space-y-4">
    ${display("Your price list, started for you", `${salon ? "Common salon services." : kit ? `A starter list for ${esc(s.workspace.vertical)}.` : "Your items so far."} Change prices, remove what you don’t offer.`)}
    ${kitCard}
    ${toolbar(`<span class="text-muted-foreground" data-counts>${live} items · ${pk} packages</span>`, `<button type="button" class="btn btn-outline" data-need="catalog" data-open="import-csv">${I("file-spreadsheet")}Import CSV</button><button type="button" data-need="catalog" class="btn btn-outline" data-open="add-item">${I("plus")}Add item</button>`)}
    <div class="@tab:hidden flex gap-2"><button type="button" class="btn btn-outline flex-1" data-open="import-csv">${I("file-spreadsheet")}Import CSV</button><button type="button" class="btn btn-outline flex-1" data-open="add-item">${I("plus")}Add item</button></div>
    ${dataTable(ctx, {
      key: "starter",
      icon: "book-open",
      title: "Items",
      compact: true,
      all: "catalog",
      per: 50,
      cols: [
        { t: "Item", role: "title" },
        { t: "Category", m: 1, role: "sub" },
        { t: "Unit", m: 1, web: 1 },
        { t: "Price", r: 1, role: "end" },
        { t: "", role: "act" },
      ],
      rows,
    })}
    <form data-do="starterNext">${obFoot("Keep and continue", "", "details")}</form>
    ${addDlg}${csvDlg}
  </div>`
      );
    },
    actions: {
      starterNext: () => ({ text: "Price list kept", go: ["team"] }),
      loadKit: (ctx) =>
        call(
          "Onboarding: load starter kit",
          (s, c) => {
            need(c, "catalog");
            return loadKit(s, { vertical: s.workspace.vertical }, c);
          },
          ctx
        ),
      csvRead: (ctx, { file }) => {
        if (!file) fail("Choose a .csv file first.");
        if (!file.url) fail("Still reading the file. Try again in a moment.");
        const parsed = parseCsv(decodeDataUrl(file.url));
        if (!parsed.headers.length) fail("That file is empty.");
        ctx.ui.csv = { file: file.name, ...parsed };
        return {
          text: `${parsed.rows.length} rows read from ${file.name}. Check the mapping.`,
        };
      },
      csvImport: (ctx) => {
        const csv = ctx.ui.csv;
        const out = call(
          "Onboarding: import CSV",
          (s, c) => importCsv(s, { csv }, c),
          ctx
        );
        delete ctx.ui.csv;
        return out;
      },
    },
    checks: [
      (t, h) => {
        const own = { role: "owner", memberId: h.s.meta.people.owner };
        t(
          VERTICALS.every((v) => kitOf(v[1])?.items.length >= 6),
          "every vertical has a starter kit (D1, 4.2)"
        );
        t(
          Object.entries(KITS).every(([v, k]) => (v === "Salon or spa" ? !k.draft : k.draft === true)),
          "the five non-salon kits are marked draft (D96)"
        );
        t(
          !h.at("catalog-starter").querySelector("[data-kit]"),
          "the salon sample needs no kit (its items are already there)"
        );
        const s = h.s;
        s.workspace.vertical = "Wholesaler";
        const f = h.at("catalog-starter");
        t(
          Boolean(f.querySelector('[data-kit="Wholesaler"] [data-kit-draft]')) &&
            !f.textContent.includes("not written yet"),
          "a non-salon vertical offers its draft kit"
        );
        const before = s.items.length;
        loadKit(s, { vertical: "Wholesaler" }, own);
        const added = s.items.slice(before);
        t(
          added.length === KITS.Wholesaler.items.length &&
            added.filter((i) => i.unit !== "order").every((i) => i.moq > 0) &&
            added.every((i) => i.gst === null && !i.hsn),
          "the Wholesaler kit adds items with MOQ and no invented GST or HSN"
        );
        loadKit(s, { vertical: "Wholesaler" }, own);
        t(s.items.length === before + added.length, "loading a kit twice adds nothing");
        for (const v of ["Restaurant or café", "Design agency"]) {
          s.workspace.vertical = v;
          loadKit(s, { vertical: v }, own);
        }
        const pk = (name) => s.packages.filter((p) => p.name === name);
        t(
          pk("Birthday party menu, 50 guests")[0]?.advancePct > 0 &&
            pk("Brand starter").length === 3 &&
            pk("Brand starter").every((p) => p.advancePct === 50),
          "restaurant and agency packages carry an advance (D56)"
        );
        t(
          !h.at("catalog-starter").querySelector("[data-kit]"),
          "a loaded kit is no longer offered"
        );
      },
      (t, h) => {
        const c = { role: "owner", memberId: h.s.meta.people.owner };
        const f = h.at("catalog-starter");
        const n0 = h.s.items.length;
        t(
          f.querySelectorAll('[data-table="starter"] tbody tr').length === n0,
          "every catalog item is listed"
        );
        t(
          f
            .querySelector("[data-counts]")
            ?.textContent.startsWith(
              `${h.s.items.filter((i) => i.active).length} items`
            ),
          "the item count is live"
        );
        const id = h.s.items[0].id;
        call(
          "check",
          (s, cc) => h.biz.catalog.toggleItem(s, { id, field: "active" }, cc),
          c
        );
        t(
          h.makeCtx().s.items[0].active === false,
          "Remove takes the item off the catalog"
        );
        t(
          h
            .at("catalog-starter")
            .querySelector(`[data-do="catalog.toggleItem"][data-a-id="${id}"]`)
            ?.getAttribute("aria-label")
            .startsWith("Put"),
          "a removed item can be put back"
        );
        call(
          "check",
          (s, cc) =>
            h.biz.catalog.saveItem(
              s,
              { id: h.s.items[1].id, name: h.s.items[1].name, price: "1999" },
              cc
            ),
          c
        );
        t(h.makeCtx().s.items[1].price === 1999, "inline price edit saves");
        call(
          "check",
          (s, cc) =>
            h.biz.catalog.saveItem(
              s,
              {
                name: "Threading",
                category: "Hair",
                unit: "visit",
                price: "150",
                gst: "18",
              },
              cc
            ),
          c
        );
        t(
          h.makeCtx().s.items.length === n0 + 1,
          "Add item adds to the catalog"
        );
        const csv = parseCsv(
          'Item,Rate,Category\n"Head massage, 30 min",600,Hair\nNail art,450,Hands and feet\n'
        );
        t(
          csv.map.join() === "name,price,category" && csv.rows.length === 2,
          "CSV columns map to item fields"
        );
        call("check", (s, cc) => importCsv(s, { csv }, cc), c);
        t(
          h
            .makeCtx()
            .s.items.some(
              (i) => i.name === "Head massage, 30 min" && i.price === 600
            ),
          "CSV import adds the rows"
        );
      },
    ],
  },
  {
    n: 7,
    area: "Onboarding",
    id: "team",
    name: "Invite team",
    route: "/new/team",
    action: "Send invites / skip",
    who: "Owner",
    notes:
      "Email + role per row; skippable. Roles: Owner, Manager, Staff, Accountant. Changing a role saves at once; the empty row invites (settings.invite).",
    render: (ctx) => {
      const s = ctx.s;
      const team = s.members.filter((m) => m.role !== "owner");
      const d = ctx.ui.team || {};
      const typed = String(d.email || "").trim();
      return onboard(
        4,
        `<div class="max-w-2xl">
    ${display("Bring your team", "They sign in with Google and see only what their role allows.")}
    <div class="mt-6 space-y-2" data-team>${team
      .map(
        (m) =>
          `<div class="flex gap-2 items-center" data-member="${m.id}"><div class="field flex-1 min-w-0"><span class="truncate">${esc(m.email)}</span><span class="ml-auto">${pill(m.status)}</span></div><form data-do="settings.setRole" data-a-id="${m.id}" data-autosubmit class="contents">${select("role", INVITE_ROLES, m.role, { cls: "w-32 @tab:w-40", label: `Role of ${m.email}` })}</form></div>`
      )
      .join("")}</div>
    <form data-do="teamInvite" data-draft="team">
      <div class="mt-2 flex gap-2">${input("email", { type: "email", value: d.email ?? "", placeholder: "name@gmail.com", cls: "flex-1 min-w-0", attrs: { "aria-label": "Email to invite" } })}${select("role", INVITE_ROLES, d.role ?? "staff", { cls: "w-32 @tab:w-40", label: "Role for the invite" })}<button type="submit" name="stay" value="1" class="btn btn-outline btn-icon shrink-0" aria-label="Add invite">${I("plus")}</button></div>
      <div class="mt-4 grid @tab:grid-cols-3 gap-2">${ROLE_CARDS.map(
        (r) =>
          `<div class="p-3 rounded-control bg-muted"><div class="font-medium">${r[0]}</div><div class="text-caption text-muted-foreground">${r[1]}</div></div>`
      ).join("")}</div>
      ${obFoot(`${I("send")}${typed ? "Send invite" : "Send invites"}`, `<a ${link("done")} class="btn btn-outline btn-lg">Skip for now</a>`, "catalog-starter")}
    </form>
  </div>`
      );
    },
    actions: {
      teamInvite: (ctx, args) => {
        const email = String(args.email || "").trim();
        let out = { text: "Team saved" };
        if (email)
          out = call(
            "Onboarding: invite",
            (s, c) =>
              ctx.biz.settings.invite(
                s,
                { email, role: args.role || "staff" },
                c
              ),
            ctx
          );
        else if (args.stay) fail("Enter an email address.");
        return args.stay ? out : { ...out, go: ["done"] };
      },
    },
    checks: [
      (t, h) => {
        const c = { role: "owner", memberId: h.s.meta.people.owner };
        const f = h.at("team");
        t(
          f.querySelectorAll("[data-member]").length ===
            h.s.members.filter((m) => m.role !== "owner").length,
          "every member except the Owner is listed"
        );
        call(
          "check",
          (s, cc) =>
            h.biz.settings.invite(
              s,
              { email: "new.person@gmail.com", role: "manager" },
              cc
            ),
          c
        );
        const g = h.at("team");
        const row = [...g.querySelectorAll("[data-member]")].find((r) =>
          r.textContent.includes("new.person@gmail.com")
        );
        t(Boolean(row), "a new invite shows in the list");
        t(
          row?.querySelector('[data-status="invited"]') &&
            row?.querySelector("select")?.value === "manager",
          "the invite shows Invited and its role"
        );
        const id = row?.dataset.member;
        call(
          "check",
          (s, cc) => h.biz.settings.setRole(s, { id, role: "staff" }, cc),
          c
        );
        t(
          byId(h.makeCtx().s.members, id)?.role === "staff",
          "changing the role saves"
        );
      },
    ],
  },
  {
    n: 8,
    area: "Onboarding",
    id: "done",
    name: "Done",
    route: "/new/done",
    action: "Share price list",
    who: "Owner",
    notes:
      "Catalog link, QR download, ready message 1 (Price list). Share on WhatsApp puts it in the outbox and copies it (D67). First-run checklist stays on Today until a first reply is shared.",
    render: (ctx) => {
      const s = ctx.s,
        ws = s.workspace;
      const d = ctx.ui.done || {};
      const custs = s.customers.filter((c) => c.phone);
      const cid = d.customerId ?? custs[0]?.id ?? "";
      const msg = priceListMessage(ctx, cid);
      const owner = s.members.find((m) => m.role === "owner");
      const nm = first(ctx.me?.name || owner?.name || "");
      return `<div class="h-full overflow-y-auto flex items-start @tab:items-center justify-center bg-sidebar p-4">
    <div class="card w-full max-w-3xl p-card @tab:p-page grid @tab:grid-cols-[1fr_220px] gap-6 shadow-lg">
      <form data-do="sharePriceList" data-draft="done" data-copy-scope>
        <span class="inline-flex items-center justify-center size-control-lg rounded-pill bg-success-soft text-success">${I("party-popper")}</span>
        <h1 class="mt-3 font-serif text-heading @tab:text-display-lg font-bold">You’re live${nm ? `, ${esc(nm)}` : ""}.</h1>
        <p class="mt-1 text-body text-muted-foreground">Your catalog is ready. Send it to a customer now.</p>
        <label class="flabel mt-5">Catalog link</label>
        <div class="flex gap-2"><div class="field code" data-link>${esc(ws.slug)}.biz4kit.com</div><button type="button" class="btn btn-outline" data-copy="[data-link]">${I("copy")}Copy</button></div>
        <div class="mt-4 flex items-end gap-2"><label class="flabel" for="f-done-to">Ready message</label><span class="ml-auto"></span>${select(
          "customerId",
          custs.map((c) => [c.id, c.name]),
          cid,
          { id: "f-done-to", cls: "w-48 h-control-sm", label: "Send to" }
        )}</div>
        <div class="mt-1 rounded-control bg-muted p-3 whitespace-pre-line" data-msg>${esc(msg.body)}</div>
        <div class="mt-4 flex flex-wrap gap-2"><button type="submit" class="btn btn-primary" data-need="write">${I("message-circle")}Share on WhatsApp</button><button type="button" class="btn btn-outline" data-copy>${I("copy")}Copy message</button><a ${link("dashboard")} class="btn btn-ghost @tab:ml-auto">Go to Today${I("arrow-right")}</a></div>
      </form>
      <div class="text-center"><div class="mx-auto max-w-56 rounded-card border border-border p-3">${qr()}</div><button type="button" class="mt-2 btn btn-outline w-full" data-do="downloadQr">${I("download")}Download QR</button><p class="hint">Print it for your counter.</p></div>
    </div>
  </div>`;
    },
    actions: {
      sharePriceList: (ctx, args) => {
        need(ctx, "write");
        const c = byId(ctx.s.customers, args.customerId);
        if (!c) fail("Pick who to send it to.");
        const m = priceListMessage(ctx, c.id);
        const out = call(
          "Onboarding: share price list",
          (s, cc) => {
            const message = ctx.biz.messages.send(
              s,
              {
                channel: "whatsapp",
                templateId: m.t.id,
                vars: m.vars,
                to: ctx.biz.messages.addressOf(c, "whatsapp"),
                recordId: c.id,
              },
              cc
            );
            return {
              recordId: c.id,
              text: `Price list ready for ${c.name} on WhatsApp`,
              message,
            };
          },
          ctx
        );
        return out;
      },
      downloadQr: (ctx) => {
        const b = ctx.s.workspace.brand;
        const svg = qr(512)
          .replace(
            ' class="w-full h-auto"',
            ' xmlns="http://www.w3.org/2000/svg"'
          )
          .replaceAll("var(--biz-accent)", b.accent)
          .replaceAll("var(--biz)", b.primary);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(
          new Blob([svg], { type: "image/svg+xml" })
        );
        a.download = `${ctx.s.workspace.slug}-qr.svg`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        return {
          text: `QR saved as ${a.download} (illustration: the real QR encodes ${ctx.s.workspace.slug}.biz4kit.com)`,
        };
      },
    },
    checks: [
      (t, h) => {
        const f = h.at("done");
        const ws = h.makeCtx().s.workspace;
        t(
          f.querySelector("[data-link]")?.textContent ===
            `${ws.slug}.biz4kit.com`,
          "the catalog link is the real slug"
        );
        t(
          f
            .querySelector("[data-msg]")
            ?.textContent.includes(`${ws.slug}.biz4kit.com`),
          "ready message 1 carries the link"
        );
        t(
          !/\{\w+\}/.test(f.querySelector("[data-msg]")?.textContent || ""),
          "ready message has no unfilled placeholders"
        );
        t(Boolean(f.querySelector("svg[aria-label^='QR']")), "QR is shown");
        const before = h.makeCtx().s.outbox.length;
        const sc = h.makeCtx(undefined, "done").screen;
        const ctx = {
          ...h.makeCtx(undefined, "done", "owner"),
          customer: false,
        };
        const out = sc.actions.sharePriceList(ctx, { customerId: "C1" });
        const s = h.makeCtx().s;
        t(
          s.outbox.length === before + 1 && s.outbox[0].templateId === 1,
          "Share puts message 1 in the outbox"
        );
        t(
          out.message?.channel === "whatsapp" &&
            s.outbox[0].status === "copied",
          "WhatsApp is copied, not sent (D67)"
        );
      },
    ],
  },
];
