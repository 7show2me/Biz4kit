/* PORTAL: the customer pages (Catalog, Request form, Booking picker, Invoice & pay page, My orders).
   Business brand only, Inter, Biz4Kit appears only in the "Made with Biz4Kit" footer (D34, D78).
   Same data as the workspace (owner: "linked"): ctx.customer is true here, so leads.create and
   payments.record run as the customer. A request becomes a New lead in the Leads inbox; "I have paid"
   records a pending payment for approval; an expired or rejected reply cannot be paid (D73). */
import { addDays, byId, fail, fmtDate, fmtTime } from "../core/util.js";
import { call } from "../ui/actions.js";
import { I, M, esc, inr, link, pill, qr, radios, bookingPill } from "../ui/kit.js";
import { cBar, cHeader, cust, madeWith } from "../ui/shell.js";

/* ---------- shared bits ---------- */
/* The request basket: catalog Add buttons and the request form share it (kept in memory for this tab). */
const bag = new Map();

const cin = (name, o = {}) =>
  `<input class="cfield ${o.cls || ""}" name="${name}" id="${o.id || `c-${name}`}" type="${o.type || "text"}" value="${esc(o.value ?? "")}"${o.ph ? ` placeholder="${esc(o.ph)}"` : ""}${o.min !== undefined ? ` min="${o.min}"` : ""}${o.max !== undefined ? ` max="${o.max}"` : ""}${o.req ? " required" : ""}${o.mode ? ` inputmode="${o.mode}"` : ""}${o.ac ? ` autocomplete="${o.ac}"` : ' autocomplete="off"'}${o.aria ? ` aria-label="${esc(o.aria)}"` : ""} />`;
const lbl = (t, forId) => `<label class="flabel" for="${forId}">${t}</label>`;
const cfield = (label, name, o = {}) =>
  `<div>${lbl(label, o.id || `c-${name}`)}${cin(name, o)}</div>`;

/* v2 ok(): centred confirmation block on a customer page. */
/* foot: the "Made with Biz4Kit" line; left off pages that carry money (D89). */
const ok = (ctx, icon, title, body, rest = "", foot = madeWith) =>
  `${cHeader(ctx)}<div class="mx-auto max-w-md px-6 pt-12 @tab:pt-20 text-center"><span class="mx-auto size-16 rounded-pill bg-biz-soft text-biz flex items-center justify-center">${I(icon)}</span><h1 class="mt-4 text-heading font-bold">${title}</h1><p class="mt-1 text-body text-customer-muted">${body}</p>${rest}</div>${foot}`;

const first = (name = "") => String(name).split(" ")[0];
const pkgLabel = (p) =>
  p ? `${p.name}${p.tier && p.tier !== "none" ? ` · ${p.tier}` : ""}` : "";
const per = (p) => (p.billing === "monthly" ? " / month" : "");
const hours = (min) =>
  min % 60 ? `${min} min` : `${min / 60} hour${min === 60 ? "" : "s"}`;
const phoneBtn = (s, cls = "mt-2") =>
  `<a href="tel:${esc(s.workspace.phone)}" data-copy-text="${esc(s.workspace.phone)}" class="${cls} cbtn cbtn-line">${I("phone")}<span class="money">${esc(s.workspace.phone)}</span></a>`;
/* Staff a customer can book with: active members who run bookings (as screens-v2: Rahul, Pooja, Priya). */
const bookableStaff = (s) =>
  s.members.filter(
    (m) => m.status === "active" && ["staff", "owner"].includes(m.role)
  );
/* Time slots from the business's opening hours: every 30 minutes, the package must end inside a range (D97, D99). */
const slotsOf = (ctx, pkg, day) =>
  ctx.biz.settings.slotsFor(ctx.s, day, pkg?.durationMin || 60);

/* Resolve a basket id (item T… or package K…) to a line. */
const entryOf = (s, id) => {
  const it = byId(s.items, id);
  if (it)
    return {
      id,
      name: it.name,
      price: it.price,
      show: it.showPrice,
      /* MOQ (D87): the smallest quantity this item can be asked for; first photo as its picture */
      min: it.moq > 1 ? it.moq : 1,
      unit: it.unit,
      photo: it.photos?.[0]?.url || null,
      line: (qty) => ({
        itemId: it.id,
        name: it.name,
        note: "",
        qty,
        rate: it.price,
        unit: it.unit,
        gst: it.gst ?? 0,
      }),
    };
  const p = byId(s.packages, id);
  if (p)
    return {
      id,
      name: pkgLabel(p),
      price: p.price,
      show: true,
      min: 1,
      line: (qty) => ({
        itemId: null,
        packageId: p.id,
        name: pkgLabel(p),
        note: "",
        qty,
        rate: p.price,
        unit: "visit",
      }),
    };
  return null;
};
/* Item picture: the first photo, or the plain tile. */
const pic = (url, cls) =>
  url
    ? `<img src="${esc(url)}" alt="" class="${cls} object-cover" data-pic>`
    : `<div class="${cls} bg-biz-soft"></div>`;
const minNote = (e) =>
  e.min > 1
    ? `<span class="text-caption text-customer-muted" data-moq>Min. order ${e.min}${e.unit ? ` ${esc(e.unit)}` : ""}</span>`
    : "";
const priceOf = (e) =>
  e.show
    ? M(e.price)
    : '<span class="text-caption text-customer-muted">Request a quote</span>';

/* ---------- catalog ---------- */
function reqPanel(ctx) {
  const s = ctx.s;
  const list = [...bag.keys()].map((id) => entryOf(s, id)).filter(Boolean);
  return `<div class="ccard p-4 space-y-3"><p class="font-semibold">Your request</p>${
    list.length
      ? list
          .map(
            (e) =>
              `<div class="flex items-center gap-3">${pic(e.photo, "size-control-lg rounded-xs shrink-0")}<div class="min-w-0 flex-1"><p class="font-medium truncate">${esc(e.name)}</p><p class="text-customer-muted">${priceOf(e)}</p></div><button type="button" class="text-customer-muted" data-do="bag.remove" data-a-id="${e.id}" aria-label="Remove ${esc(e.name)}">${I("x", "size-icon")}</button></div>`
          )
          .join("")
      : `<p class="text-caption text-customer-muted">Tap Add on a service, or just tell us what you need.</p>`
  }<a ${link("p-request")} class="cbtn cbtn-biz">Request a quote${I("arrow-right")}</a><p class="text-caption text-customer-muted">No account needed.</p></div>`;
}

function catalogPage(ctx) {
  const s = ctx.s;
  const ws = s.workspace;
  const items = ctx.biz.catalog.visibleItems(s);
  const tabKey = `cat:${ctx.params.tab || ""}`;
  const cur =
    ctx.ui[tabKey] ?? (ctx.params.tab === "packages" ? "Packages" : "All");
  const q = String(ctx.ui["cat:q"] || "")
    .trim()
    .toLowerCase();
  const cats = s.categories.filter((c) => items.some((i) => i.category === c));
  const tabs = [
    "All",
    ...cats,
    ...(s.packages.some((p) => p.active) ? ["Packages"] : []),
  ];
  const hit = (t) =>
    !q ||
    String(t || "")
      .toLowerCase()
      .includes(q);
  const card = (it) => {
    const inBag = bag.has(it.id);
    return `<div class="ccard overflow-hidden flex @tab:flex-col" data-item="${it.id}">${pic(it.photos?.[0]?.url, "w-24 @tab:w-full @tab:aspect-[4/3] shrink-0")}<div class="p-3 flex-1 min-w-0"><a ${link("p-request", { item: it.id })} class="font-semibold hover:underline">${esc(it.name)}</a><p class="text-caption text-customer-muted">${esc(it.desc)}</p>${it.moq > 1 ? `<p class="text-caption text-customer-muted" data-moq>Min. order ${it.moq}${it.unit ? ` ${esc(it.unit)}` : ""}</p>` : ""}
          <div class="mt-2 flex items-center gap-2">${it.showPrice ? M(it.price) : `<a ${link("p-request", { item: it.id })} class="text-caption text-customer-muted underline">Request a quote</a>`}<button type="button" class="ml-auto h-control-md px-3 rounded-control border border-biz text-biz font-medium ${inBag ? "bg-biz-soft" : ""}" data-do="bag.toggle" data-a-id="${it.id}" aria-label="${inBag ? "Added" : "Add"} ${esc(it.name)}" aria-pressed="${inBag}">${inBag ? I("check", "size-icon-sm") : "Add"}</button></div></div></div>`;
  };
  const grid = (list) =>
    `<div class="mt-3 grid @tab:grid-cols-2 @web:grid-cols-3 gap-3">${list.map(card).join("")}</div>`;
  let body;
  if (cur === "Packages") {
    const pk = s.packages
      .filter((p) => p.active && (hit(p.name) || hit(p.tier) || hit(p.desc)))
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    body = pk.length
      ? `<div class="mt-4 grid @tab:grid-cols-2 gap-3">${pk
          .map((p) => {
            const inc = ctx.biz.catalog
              .itemsOf(s, p)
              .map((x) => x.item.name)
              .concat(p.items.filter((x) => !x.itemId).map((x) => x.name));
            return `<div class="ccard p-4" data-package="${p.id}"><p class="text-label uppercase tracking-wider text-biz font-semibold">Package</p><p class="font-semibold">${esc(pkgLabel(p))} · ${M(p.price)}${per(p)}</p><p class="text-caption text-customer-muted">${esc(inc.join(", "))}${p.bookable ? ` · ${hours(p.durationMin)}` : ""}</p>
            <div class="mt-3">${p.bookable ? `<a ${link("p-book", { id: p.id })} class="cbtn cbtn-biz">${I("calendar-plus")}Book a slot</a>` : `<a ${link("p-request", { item: p.id })} class="cbtn cbtn-line">Request a quote</a>`}</div></div>`;
          })
          .join("")}</div>`
      : `<p class="mt-6 text-center text-customer-muted">No packages match.</p>`;
  } else {
    const shown = items.filter(
      (i) =>
        (cur === "All" || i.category === cur) && (hit(i.name) || hit(i.desc))
    );
    const groups = (cur === "All" ? cats : [cur])
      .map((c) => [c, shown.filter((i) => i.category === c)])
      .filter(([, l]) => l.length);
    body = groups.length
      ? groups
          .map(
            ([c, l]) =>
              `<section class="mt-4" data-cat="${esc(c)}">${cur === "All" ? `<h2 class="font-semibold">${esc(c)}</h2>` : ""}${grid(l)}</section>`
          )
          .join("")
      : `<p class="mt-6 text-center text-customer-muted">No services match.</p>`;
  }
  /* Promo: the first package family with tiers (e.g. Bridal Basic / Standard / Premium). */
  const fam = Object.values(
    Object.groupBy(
      s.packages.filter((p) => p.active),
      (p) => p.name
    )
  ).find((l) => l.length > 1);
  const promo =
    fam && cur !== "Packages"
      ? `<a ${link("p-catalog", { tab: "packages" })} class="mt-4 block p-4 rounded-card bg-biz-soft"><p class="text-label uppercase tracking-wider text-biz font-semibold">Package</p><p class="font-semibold">${esc(fam[0].name)} · from ${inr(Math.min(...fam.map((p) => p.price)))}</p><p class="text-caption text-customer-muted">${esc(
          fam
            .map((p) => p.tier)
            .join(", ")
            .replace(/, ([^,]*)$/, " or $1")
        )}.${fam.some((p) => p.bookable) ? " Book a slot." : ""}</p></a>`
      : "";
  const n = bag.size;
  return cust(
    `${cHeader(ctx)}<div class="mx-auto max-w-5xl px-4 py-5 @web:py-8 grid @web:grid-cols-[1fr_300px] gap-6">
      <div class="min-w-0"><h1 class="text-heading @web:text-display-lg font-bold">${esc(ws.tagline || `${ws.name}, ${ws.city}`)}</h1><p class="mt-1 text-customer-muted">${esc([ws.address, ws.city].filter(Boolean).join(" · "))}</p>
        <label class="mt-4 cfield text-customer-muted">${I("search")}<input type="search" class="min-w-0 flex-1 bg-transparent outline-none text-customer-text" placeholder="Search services" aria-label="Search services" data-ui="cat:q" value="${esc(ctx.ui["cat:q"] || "")}" /></label>
        <div class="mt-3 flex gap-2 overflow-x-auto noscroll" role="tablist">${tabs.map((c) => `<button type="button" role="tab" aria-selected="${c === cur}" data-ui="${tabKey}" data-v="${esc(c)}" class="shrink-0 px-3 h-control-lg flex items-center rounded-sm ${c === cur ? "bg-biz text-biz-foreground" : "bg-customer-surface border border-customer-border"}">${esc(c)}</button>`).join("")}</div>
        ${body}${promo}
      </div>
      <div class="hidden @web:block"><div class="sticky top-20">${reqPanel(ctx)}</div></div>
    </div>${madeWith}`,
    cBar(
      `<a ${link("p-request")} class="cbtn cbtn-biz">Request a quote${n ? ` · ${n} item${n > 1 ? "s" : ""}` : ""}${I("arrow-right")}</a>`
    )
  );
}

function itemPage(ctx) {
  const s = ctx.s;
  const items = ctx.biz.catalog.visibleItems(s);
  const it =
    (ctx.params.item && items.find((x) => x.id === ctx.params.item)) ||
    items[0];
  if (!it)
    return cust(
      ok(
        ctx,
        "book-open",
        "Nothing here yet",
        "This catalog has no services yet."
      )
    );
  const btn = `<button type="button" class="cbtn cbtn-biz" data-do="bag.addGo" data-a-id="${it.id}">Add to request${it.showPrice ? ` · ${inr(it.price)}` : ""}</button>`;
  return cust(
    `${cHeader(ctx, "p-catalog")}<div class="mx-auto max-w-5xl px-4 py-5 grid @web:grid-cols-2 gap-6">${pic(it.photos?.[0]?.url, "w-full aspect-[4/3] rounded-card")}
      <div><h1 class="text-heading font-bold">${esc(it.name)}</h1><p class="text-body text-customer-muted">${esc(it.desc)}</p>
      <p class="mt-4">${it.showPrice ? `<span class="font-mono text-money-lg">${inr(it.price)}</span>` : '<span class="text-customer-muted">Request a quote</span>'}</p>${it.moq > 1 ? `<p class="text-customer-muted" data-moq>Min. order ${it.moq}${it.unit ? ` ${esc(it.unit)}` : ""}</p>` : ""}
      <div class="hidden @web:block mt-6">${btn}</div></div></div>${madeWith}`,
    cBar(btn)
  );
}

/* ---------- request form ---------- */
function requestForm(ctx) {
  const s = ctx.s;
  const ui = ctx.ui;
  if (ctx.params.sent) return sentPage(ctx);
  if (ctx.params.item && ui._seeded !== ctx.params.item) {
    const e0 = entryOf(s, ctx.params.item);
    if (e0) bag.set(ctx.params.item, Math.max(bag.get(ctx.params.item) || 0, e0.min));
    ui._seeded = ctx.params.item;
  }
  if (ui["req:add"]) {
    const e1 = entryOf(s, ui["req:add"]);
    if (e1) bag.set(ui["req:add"], e1.min);
    delete ui["req:add"];
  }
  const d = ui.req || {};
  const list = [...bag.keys()].map((id) => entryOf(s, id)).filter(Boolean);
  const items = ctx.biz.catalog.visibleItems(s).filter((i) => !bag.has(i.id));
  const pks = s.packages.filter((p) => p.active && !bag.has(p.id));
  const photo = d.photo && typeof d.photo === "object" ? d.photo : null;
  const ws = s.workspace;
  return cust(`${cHeader(ctx, "p-catalog")}<div class="mx-auto max-w-xl px-4 py-5"><h1 class="text-heading font-bold">Request a quote</h1><p class="text-caption text-customer-muted">We usually reply within a few hours.</p>
    <form data-do="request.send" data-draft="req" novalidate>
    <div class="mt-3 space-y-2" data-lines>${list
      .map(
        (e) =>
          `<div class="ccard p-3 flex items-center gap-3" data-line="${e.id}">${pic(e.photo, "size-control-lg rounded-xs shrink-0")}<div class="min-w-0 flex-1"><p class="font-medium truncate">${esc(e.name)}</p><p class="text-customer-muted">${priceOf(e)}</p>${minNote(e)}${e.min > 1 && d.q?.[e.id] !== undefined && Math.round(+d.q[e.id]) > 0 && Math.round(+d.q[e.id]) < e.min ? `<p class="text-caption text-warning" data-moq-clamp>Below the minimum order: we will ask for ${e.min}.</p>` : ""}</div><input class="cfield w-20 money" type="number" min="${e.min}" max="${Math.max(99, e.min)}" name="q[${e.id}]" value="${esc(d.q?.[e.id] ?? bag.get(e.id) ?? e.min)}" aria-label="Quantity of ${esc(e.name)}" /><button type="button" class="text-customer-muted" data-do="bag.remove" data-a-id="${e.id}" aria-label="Remove ${esc(e.name)}">${I("x")}</button></div>`
      )
      .join("")}
      <select class="cfield text-customer-muted" data-ui="req:add" aria-label="Add a service"><option value="">${list.length ? "Add another service" : "Add a service from the catalog"}</option>${items.length ? `<optgroup label="Services">${items.map((i) => `<option value="${i.id}">${esc(i.name)}${i.showPrice ? ` · ${inr(i.price)}` : ""}</option>`).join("")}</optgroup>` : ""}${pks.length ? `<optgroup label="Packages">${pks.map((p) => `<option value="${p.id}">${esc(pkgLabel(p))} · ${inr(p.price)}${per(p)}</option>`).join("")}</optgroup>` : ""}</select>
    </div>
    <div class="mt-3 space-y-3">
      <div>${lbl("Tell us what you need", "c-brief")}<textarea class="cfield h-24 items-start py-2.5" name="brief" id="c-brief" rows="3" placeholder="For example: also want a haircut, same day if possible.">${esc(d.brief || "")}</textarea></div>
      <label class="flex items-center gap-2 cursor-pointer"><span class="size-touch rounded-sm border-2 border-dashed border-customer-border flex items-center justify-center text-customer-muted">${I("camera")}</span><input type="file" class="sr-only" name="photo" accept="image/*" data-preview="#req-photo" ${photo ? `data-keep="${esc(JSON.stringify(photo))}"` : ""} /><span class="text-caption text-customer-muted" id="req-photo">${photo ? esc(photo.name) : "Add photos (optional)"}</span></label>
      <div class="grid grid-cols-2 gap-2">${cfield("Preferred date", "preferredDate", { type: "date", value: d.preferredDate || "", min: ctx.today })}<div>${lbl("Time", "c-time")}<select class="cfield" name="time" id="c-time">${[
        ["", "Any time"],
        ["Morning", "Morning"],
        ["Afternoon", "Afternoon"],
        ["Evening", "Evening"],
      ]
        .map(
          ([v, t]) =>
            `<option value="${v}" ${v === (d.time || "") ? "selected" : ""}>${t}</option>`
        )
        .join("")}</select></div></div>
      <div class="grid @tab:grid-cols-2 gap-2">${cfield("Your name", "name", { value: d.name || "", ac: "name", req: true })}${cfield("Phone", "phone", { type: "tel", value: d.phone || "", cls: "money", mode: "tel", ac: "tel", req: true, ph: "+91" })}</div>
      ${cfield("Email (optional)", "email", { type: "email", value: d.email || "", ac: "email" })}
    </div>
    <p class="mt-3 text-caption text-customer-muted">By sending this request you agree that ${esc(ws.name)} may contact you about it and store your details to prepare your quote. <span class="underline text-biz">Privacy notice</span> <span class="italic">[Draft, lawyer to finalise]</span></p>
    <div class="mt-4"><button type="submit" class="cbtn cbtn-biz">Send request</button></div></form></div>${madeWith}`);
}

function sentPage(ctx) {
  const s = ctx.s;
  const lead =
    (ctx.params.sent && byId(s.leads, ctx.params.sent)) ||
    s.leads.find((l) => l.source === "web" && l.type === "quoted") ||
    s.leads[0];
  const c = lead ? byId(s.customers, lead.customerId) : null;
  return cust(
    ok(
      ctx,
      "check",
      "Request sent",
      `Thanks ${esc(first(c?.name))}, ${esc(s.workspace.name)} has your request. We will send a quote shortly.`,
      `${phoneBtn(s, "mt-6")}<a ${link("p-catalog")} class="mt-2 block text-biz underline">Back to the catalog</a>`
    )
  );
}

function sendRequest(ctx, args) {
  const lines = Object.entries(args.q || {})
    .map(([id, qty]) => [entryOf(ctx.s, id), Math.round(+qty)])
    .filter(([e, qty]) => e && qty > 0)
    /* never below the item's minimum order (D87) */
    .map(([e, qty]) => e.line(Math.max(qty, e.min || 1)));
  const out = call(
    "Portal: request sent",
    (s, c) => {
      const r = ctx.biz.leads.create(
        s,
        {
          type: "quoted",
          source: "web",
          name: args.name,
          phone: args.phone,
          email: String(args.email || "").trim(),
          brief: args.brief,
          lines,
          preferredDate: args.preferredDate || null,
        },
        c
      );
      if (args.time) r.lead.preferredTime = args.time;
      if (args.photo && typeof args.photo === "object")
        r.lead.photos = [args.photo];
      return r;
    },
    { ...ctx, memberId: null }
  );
  bag.clear();
  delete ctx.ui.req;
  return {
    text: "Request sent",
    recordId: out.recordId,
    go: ["p-request", { sent: out.lead.id }],
  };
}

/* ---------- booking picker ---------- */
const days = (today) => Array.from({ length: 7 }, (_, i) => addDays(today, i));
const slotEnd = (start, min) => {
  const d = new Date(start);
  d.setMinutes(d.getMinutes() + min);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
/* Taken when the chosen person clashes, or, for Any, when every bookable person clashes. */
function taken(ctx, pkg, day, time, withId) {
  const start = `${day}T${time}`;
  const end = slotEnd(start, pkg.durationMin || 60);
  const people =
    withId && withId !== "any"
      ? [withId]
      : bookableStaff(ctx.s).map((m) => m.id);
  return people.every((memberId) =>
    ctx.biz.bookings.clash(ctx.s, { memberId, start, end })
  );
}
const bookState = (ctx) => {
  const s = ctx.s;
  const list = s.packages.filter((p) => p.active && p.bookable);
  const pkg =
    list.find((p) => p.id === (ctx.ui["bk:pkg"] || ctx.params.id)) || list[0];
  const withId = ctx.ui["bk:with"] || ctx.params.with || "any";
  const ds = days(ctx.today);
  const day = ds.includes(ctx.ui["bk:day"] || ctx.params.day)
    ? ctx.ui["bk:day"] || ctx.params.day
    : ds[0];
  const time = ctx.ui["bk:time"] || ctx.params.time || "";
  return { list, pkg, withId, ds, day, time };
};

function bookPage(ctx) {
  const s = ctx.s;
  if (ctx.params.booked) return bookedPage(ctx);
  const { list, pkg, withId, ds, day, time } = bookState(ctx);
  if (!pkg)
    return cust(
      ok(
        ctx,
        "calendar-x",
        "No bookable packages",
        `${esc(s.workspace.name)} takes requests instead. Request a quote.`,
        `<a ${link("p-request")} class="mt-6 cbtn cbtn-biz">Request a quote</a>`
      )
    );
  const staff = bookableStaff(s);
  const SLOTS = slotsOf(ctx, pkg, day);
  const chosen =
    time && SLOTS.includes(time) && !taken(ctx, pkg, day, time, withId) ? time : "";
  const d = ctx.ui.bk || {};
  const chip = (key, v, label, on, cls = "h-touch px-4") =>
    `<button type="button" data-ui="${key}" data-v="${esc(v)}" aria-pressed="${on}" class="${cls} flex items-center rounded-sm ${on ? "bg-biz text-biz-foreground" : "bg-customer-surface border border-customer-border"}">${label}</button>`;
  const btn = `<button type="submit" form="bk-form" class="cbtn cbtn-biz" ${chosen ? "" : "disabled"}>${chosen ? `Confirm ${fmtDate(day)}, ${chosen}` : "Pick a time"}</button>`;
  return cust(
    `${cHeader(ctx, "p-catalog")}<div class="mx-auto max-w-xl px-4 py-5"><h1 class="text-heading font-bold">Book ${esc(pkgLabel(pkg))}</h1><p class="text-caption text-customer-muted">${hours(pkg.durationMin || 60)} · ${inr(pkg.price)}${per(pkg)}</p>
    ${list.length > 1 ? `<div class="mt-3">${lbl("Package", "c-bkpkg")}<select class="cfield" id="c-bkpkg" data-ui="bk:pkg">${list.map((p) => `<option value="${p.id}" ${p.id === pkg.id ? "selected" : ""}>${esc(pkgLabel(p))} · ${inr(p.price)}${per(p)}</option>`).join("")}</select></div>` : ""}
    <p class="mt-4 font-semibold">With</p><div class="mt-1.5 flex flex-wrap gap-2">${chip("bk:with", "any", "Any", withId === "any")}${staff.map((m) => chip("bk:with", m.id, esc(first(m.name)), withId === m.id)).join("")}</div>
    <p class="mt-4 font-semibold">Day</p><div class="mt-1.5 grid grid-cols-7 gap-1.5" data-days>${ds
      .map((x) => {
        const [dow, dd] = fmtDate(x).split(" ");
        return `<button type="button" data-ui="bk:day" data-v="${x}" aria-pressed="${x === day}" aria-label="${fmtDate(x)}" class="h-14 rounded-sm flex flex-col items-center justify-center ${x === day ? "bg-biz text-biz-foreground" : "bg-customer-surface border border-customer-border"}"><span class="text-caption">${dow}</span><span class="text-title font-semibold">${dd}</span></button>`;
      })
      .join("")}</div>
    <p class="mt-4 font-semibold">Time</p><div class="mt-1.5 grid grid-cols-3 @tab:grid-cols-6 gap-2" data-slots>${SLOTS.map(
      (t) => {
        const off = taken(ctx, pkg, day, t, withId);
        const on = t === chosen;
        return off
          ? `<button type="button" disabled data-slot="${t}" data-taken aria-label="${t} taken" class="h-touch rounded-sm flex items-center justify-center money text-customer-muted line-through border border-dashed border-customer-border cursor-not-allowed">${t}</button>`
          : `<button type="button" data-ui="bk:time" data-v="${t}" data-slot="${t}" aria-pressed="${on}" class="h-touch rounded-sm flex items-center justify-center money ${on ? "bg-biz-soft border-2 border-biz text-biz font-semibold" : "bg-customer-surface border border-customer-border"}">${t}</button>`;
      }
    ).join("")}</div>
    ${SLOTS.length ? `<p class="mt-1.5 text-caption text-customer-muted">Crossed-out times are taken.</p>` : `<p class="mt-1.5 text-customer-muted" data-closed>${esc(s.workspace.name)} is closed on ${fmtDate(day)}. Pick another day.</p>`}
    <form id="bk-form" data-do="book.send" data-draft="bk" class="mt-4 grid @tab:grid-cols-2 gap-2" novalidate>${cfield("Your name", "name", { id: "bk-name", value: d.name || "", ac: "name", req: true })}${cfield("Phone", "phone", { id: "bk-phone", type: "tel", value: d.phone || "", cls: "money", mode: "tel", ac: "tel", req: true, ph: "+91" })}</form>
    <div class="hidden @web:block mt-6">${btn}</div></div>${madeWith}`,
    cBar(btn)
  );
}

function bookedPage(ctx) {
  const s = ctx.s;
  const lead =
    (ctx.params.booked && byId(s.leads, ctx.params.booked)) ||
    s.leads.find(
      (l) => l.type === "booked" && s.bookings.some((b) => b.leadId === l.id)
    );
  const b = lead && s.bookings.find((x) => x.leadId === lead.id);
  if (!b)
    return cust(
      ok(
        ctx,
        "calendar-x",
        "No booking yet",
        "Pick a package to book a slot.",
        `<a ${link("p-catalog", { tab: "packages" })} class="mt-6 cbtn cbtn-biz">See packages</a>`
      )
    );
  const pkg = byId(s.packages, b.packageId);
  const m = byId(s.members, b.memberId);
  const ws = s.workspace;
  const agreed = b.status === "confirmed";
  return cust(
    ok(
      ctx,
      agreed ? "calendar-check" : "calendar-clock",
      agreed ? "You are booked" : "Slot requested",
      `With ${esc(ws.name)} on ${fmtDate(b.start)} at ${fmtTime(b.start)} for ${esc(pkgLabel(pkg) || "your booking")}${m ? ` with ${esc(first(m.name))}` : ""}.`,
      `<div class="mt-3 flex justify-center">${bookingPill(b.status)}</div>${agreed ? "" : `<p class="mt-2 text-caption text-customer-muted">${esc(ws.name)} will confirm the slot. <span class="italic">[Draft wording, owner to approve]</span></p>`}
      <button type="button" class="mt-6 cbtn cbtn-biz" data-do="book.ics" data-a-id="${b.id}">${I("calendar-plus")}Add to calendar</button><a href="#" data-copy-text="${esc([ws.address, ws.city].filter(Boolean).join(", "))}" class="mt-2 cbtn cbtn-line">${I("map-pin")}${esc(ws.address)}</a>`
    )
  );
}

function sendBooking(ctx, args) {
  const { pkg, withId, day, time } = bookState(ctx);
  if (!pkg) fail("Pick a package to book.");
  if (!time) fail("Pick a time.");
  if (taken(ctx, pkg, day, time, withId))
    fail("That time was just taken. Pick another.");
  const start = `${day}T${time}`;
  const out = call(
    "Portal: slot booked",
    (s, c) =>
      ctx.biz.leads.create(
        s,
        {
          type: "booked",
          source: "web",
          name: args.name,
          phone: args.phone,
          packageId: pkg.id,
          start,
          preferredDate: start,
          assigneeId: withId !== "any" ? withId : null,
          brief: `${pkgLabel(pkg)} · ${fmtDate(day)} ${time}`,
        },
        c
      ),
    { ...ctx, memberId: null }
  );
  for (const k of ["bk", "bk:time"]) delete ctx.ui[k];
  return {
    text: "Slot requested. The business will confirm it.",
    recordId: out.recordId,
    go: ["p-book", { id: pkg.id, booked: out.lead.id }],
  };
}

/* ---------- invoice & pay page ---------- */
const invoiceOf = (ctx) => {
  const s = ctx.s;
  const live = ctx.biz.invoices.live(s);
  const p = ctx.params;
  return (
    (p.id && byId(s.invoices, p.id)) ||
    (p.token && s.invoices.find((i) => i.token === p.token)) ||
    live.find(
      (i) =>
        i.kind === "reply" && ctx.biz.invoices.statusOf(s, i) === "awaiting"
    ) ||
    live[0]
  );
};

function docBlock(ctx, inv) {
  const s = ctx.s;
  const B = ctx.biz.invoices;
  const t = B.totals(s, inv);
  const c = byId(s.customers, inv.customerId);
  const st = B.statusOf(s, inv);
  const paid = B.paid(s, inv);
  const rates = [
    ...new Set(
      inv.lines.filter((l) => !l.optional || l.selected).map((l) => l.gst ?? 0)
    ),
  ];
  const half = rates.length === 1 ? ` ${rates[0] / 2}%` : "";
  const whole = rates.length === 1 ? ` ${rates[0]}%` : "";
  const rows = [
    ...inv.lines
      .filter((l) => !l.optional || l.selected)
      .map((l) => [
        `${l.name}${l.qty > 1 ? ` × ${l.qty}` : ""}${ctx.biz.serials.on(s) && l.tracked && ctx.biz.serials.modelText(l) ? ` · ${ctx.biz.serials.modelText(l)}` : ""}`,
        l.qty * l.rate,
      ]),
    ...(t.discount ? [["Discount", -t.discount]] : []),
    ...(t.cgst ? [[`CGST${half}`, t.cgst]] : []),
    ...(t.sgst ? [[`SGST${half}`, t.sgst]] : []),
    ...(t.igst ? [[`IGST${whole}`, t.igst]] : []),
  ];
  const when = B.isReplyLike(inv)
    ? inv.payBy
      ? `Pay by ${fmtDate(inv.payBy)}`
      : ""
    : inv.dueDate
      ? `Due ${fmtDate(inv.dueDate)}`
      : "";
  const bank = s.workspace.bank;
  return `<div><p class="text-label uppercase tracking-wider text-customer-muted">${B.docKind(inv)} ${esc(B.numberOf(inv))}</p><p class="font-mono text-money-lg" data-total>${inr(t.total)}</p><p class="text-caption text-customer-muted">${[when, esc(c?.name || "")].filter(Boolean).join(" · ")}</p><div class="mt-1.5">${pill(st)}</div></div>
        <div class="ccard p-4 space-y-1">${rows
          .map(
            (r) =>
              `<div class="flex gap-3"><span class="text-customer-muted">${esc(r[0])}</span><span class="ml-auto">${M(r[1])}</span></div>`
          )
          .join(
            ""
          )}<div class="flex pt-2 border-t border-customer-border font-semibold"><span>Total</span><span class="ml-auto">${M(t.total)}</span></div>${paid ? `<div class="flex"><span class="text-customer-muted">Paid</span><span class="ml-auto">${M(paid)}</span></div><div class="flex font-semibold"><span>Open</span><span class="ml-auto">${M(B.open(s, inv))}</span></div>` : ""}</div>
        ${optionalBlock(ctx, inv)}
        ${bank?.account ? `<details class="ccard p-4"><summary class="font-medium cursor-pointer">Bank transfer details</summary><p class="mt-1 text-customer-muted">${esc(s.workspace.name)} · A/c <span class="money">${esc(bank.account)}</span> · IFSC <span class="money">${esc(bank.ifsc)}</span></p></details>` : ""}`;
}

/* Optional lines the customer ticks (D102): the amount updates; fixed once a payment is made or waiting. */
function optionalBlock(ctx, inv) {
  const s = ctx.s;
  const B = ctx.biz.invoices;
  const opts = inv.lines.map((l, i) => [l, i]).filter(([l]) => l.optional);
  if (!opts.length) return "";
  const open =
    ctx.biz.payments.payable(s, inv).ok &&
    !B.paid(s, inv) &&
    !B.pendingOf(s, inv).length;
  return `<div class="ccard p-4" data-optional><p class="font-semibold">Optional extras</p><p class="text-caption text-customer-muted">${open ? "Tick what you want; the total updates." : "Your choice is fixed now that a payment is made."}</p><ul class="mt-2 space-y-1">${opts
    .map(
      ([l, i]) =>
        `<li class="flex items-center gap-3 min-h-touch">${
          open
            ? `<button type="button" role="checkbox" aria-checked="${l.selected ? "true" : "false"}" class="size-6 shrink-0 rounded-xs border-2 ${l.selected ? "bg-biz border-biz text-biz-foreground" : "border-customer-border"} flex items-center justify-center" data-do="pay.optional" data-a-id="${esc(inv.id)}" data-a-index="${i}" data-a-on="${l.selected ? "false" : "true"}" aria-label="${esc(l.name)}">${l.selected ? I("check", "size-icon-sm") : ""}</button>`
            : I(l.selected ? "circle-check" : "circle", "size-icon text-customer-muted")
        }<span class="flex-1">${esc(l.name)}</span><span class="money">${inr(l.qty * l.rate)}</span></li>`
    )
    .join("")}</ul></div>`;
}

/* The customer's own payments on this invoice: pending waits for the business to confirm. */
function paymentNotes(ctx, inv) {
  const s = ctx.s;
  const list = ctx.biz.invoices.paymentsOf(s, inv).filter((p) => p.byCustomer);
  return list
    .map((p) =>
      p.status === "pending"
        ? `<div class="p-3 rounded-sm bg-biz-soft flex gap-2" data-waiting>${I("hourglass", "size-icon text-biz")}<span>${inr(p.amount)} sent ${fmtDate(p.uploadedAt)}: waiting for ${esc(s.workspace.name)} to confirm. You will get a receipt.</span></div>`
        : p.status === "rejected"
          ? `<div class="p-3 rounded-sm border border-customer-border flex gap-2">${I("circle-x", "size-icon text-destructive")}<span>${inr(p.amount)} was not accepted${p.note ? `: ${esc(p.note)}` : ""}. Send the proof again or call us.</span></div>`
          : `<div class="p-3 rounded-sm border border-customer-border flex gap-2">${I("circle-check", "size-icon text-success")}<span>${inr(p.amount)} received ${fmtDate(p.decidedAt)}.</span></div>`
    )
    .join("");
}

function noLongerValid(ctx, inv, reason) {
  const s = ctx.s;
  const B = ctx.biz.invoices;
  const c = byId(s.customers, inv.customerId);
  const expired = B.statusOf(s, inv) === "expired";
  const lead = inv.leadId && byId(s.leads, inv.leadId);
  const invalid = expired || lead?.status === "rejected";
  const body = expired
    ? `${esc(first(c?.name))}, the price ${esc(B.numberOf(inv))} from ${esc(s.workspace.name)} expired on ${fmtDate(inv.payBy)}, so it cannot be paid. Request a new quote and we will send one.`
    : esc(reason);
  return cust(
    ok(
      ctx,
      invalid ? "calendar-x" : "circle-alert",
      invalid ? "This price is no longer valid" : "This cannot be paid",
      `<span data-reason>${body}</span>`,
      `<a ${link("p-request")} class="mt-6 cbtn cbtn-biz">${I("message-circle")}Ask ${esc(s.workspace.name)}</a>${phoneBtn(s)}<p class="mt-3 text-caption text-customer-muted italic">[Draft wording, owner to approve]</p>`,
      ""
    )
  );
}

function proofForm(ctx, inv, room) {
  const s = ctx.s;
  return `<form data-do="pay.send" data-a-invoice-id="${inv.id}" class="space-y-3" novalidate>
    <h1 class="text-heading font-bold">Upload your payment proof</h1><p class="text-caption text-customer-muted">A screenshot or PDF from your UPI or bank app.</p>
    <div class="grid grid-cols-2 gap-2">${cfield("Amount paid", "amount", { type: "number", value: room, min: 1, max: room, cls: "money", mode: "numeric" })}${cfield("Reference (UTR)", "reference", { ph: "Optional" })}</div>
    <div><p class="flabel">Paid by</p>${radios(
      "method",
      [
        ["upi", "UPI"],
        ["bank", "Bank transfer"],
      ],
      "upi",
      { label: "Paid by" }
    )}</div>
    <label class="h-40 rounded-card border-2 border-dashed border-customer-border flex flex-col items-center justify-center gap-1 text-customer-muted cursor-pointer">${I("image-up")}<span>Tap to choose a file</span><input type="file" class="sr-only" name="proof" accept="image/*,application/pdf" data-preview="#proof-name" /></label>
    <div class="cfield">${I("file-image", "size-icon text-biz")}<span id="proof-name" class="truncate text-customer-muted">No file chosen</span></div>
    <button type="submit" class="cbtn cbtn-biz">Send proof</button>
    <div class="p-3 rounded-sm bg-biz-soft flex gap-2">${I("hourglass", "size-icon text-biz")}<span>Shown as received once ${esc(s.workspace.name)} confirms. You will get a receipt.</span></div>
  </form>`;
}

function payPage(ctx, step = "") {
  const s = ctx.s;
  const B = ctx.biz.invoices;
  const inv = invoiceOf(ctx);
  if (!inv)
    return cust(
      ok(ctx, "receipt", "Nothing to pay", "There is no invoice here.", "", "")
    );
  const p = ctx.biz.payments.payable(s, inv);
  const st = B.statusOf(s, inv);
  if (!p.ok && st !== "paid") return noLongerValid(ctx, inv, p.reason);
  const pendingSum = B.pendingOf(s, inv).reduce((t, x) => t + x.amount, 0);
  const room = Math.max(0, B.open(s, inv) - pendingSum);
  const ws = s.workspace;
  const notes = paymentNotes(ctx, inv);
  if (p.ok && room > 0 && (step || ctx.ui["pay:step"]) === "proof")
    return cust(
      `${cHeader(ctx)}<div class="mx-auto max-w-xl px-4 py-5"><button type="button" class="mb-3 inline-flex items-center gap-1 text-customer-muted" data-ui="pay:step" data-v="">${I("chevron-left", "size-icon-sm")}Back to the invoice</button>${proofForm(ctx, inv, room)}</div>`
    );
  let side;
  if (!p.ok)
    side = `<div class="ccard p-4 flex gap-2" data-reason>${I("circle-check", "size-icon text-success")}<span>${esc(p.reason)}${inv.invNumber ? ` Tax invoice ${esc(inv.invNumber)}.` : ""}</span></div>${notes}`;
  else if (room <= 0)
    side = `${notes}<p class="text-caption text-customer-muted">Nothing more to pay while ${esc(ws.name)} checks your payment.</p>`;
  else {
    const upi = `upi://pay?pa=${encodeURIComponent(ws.upi)}&pn=${encodeURIComponent(ws.name)}&am=${room}&cu=INR&tn=${encodeURIComponent(B.numberOf(inv))}`;
    side = `${notes}<a href="#" data-copy-text="${esc(upi)}" class="cbtn cbtn-biz">${I("smartphone")}Pay ${inr(room)} by UPI</a><p class="text-center text-caption text-customer-muted">Opens GPay, PhonePe, Paytm or any UPI app</p>
        <div class="ccard p-4 flex gap-4 items-center"><div class="w-28 shrink-0">${qr(112)}</div><div><p class="font-semibold">Or scan</p><p class="code">${esc(ws.upi)}</p><button type="button" class="mt-1 text-caption text-biz underline" data-copy-text="${esc(ws.upi)}">Copy UPI ID</button></div></div>
        <button type="button" class="cbtn border-2 border-biz text-biz" data-ui="pay:step" data-v="proof">I have paid</button>`;
  }
  return cust(`${cHeader(ctx)}<div class="mx-auto max-w-5xl px-4 py-5 grid @web:grid-cols-[1fr_360px] gap-6">
      <div class="min-w-0 space-y-3">${docBlock(ctx, inv)}${cardLinks(ctx, inv)}</div>
      <div class="space-y-3 @web:row-start-1 @web:col-start-2" data-pay>${side}</div>
    </div>`);
}

/* Warranty cards on the tax invoice (D86: the proforma shows model and cover, not serial). */
function cardLinks(ctx, inv) {
  if (!ctx.biz.serials.on(ctx.s) || !inv.invNumber) return "";
  const rows = inv.lines.filter((l) => l.tracked && l.serial && l.card);
  if (!rows.length) return "";
  return `<div class="ccard p-4" data-cards><p class="font-semibold">Warranty cards</p><ul class="mt-2 space-y-1">${rows.map((l) => `<li><a ${link("p-warranty", { id: l.card })} class="flex items-center gap-2 min-h-touch">${I("shield-check", "size-icon text-biz")}<span>${esc(l.name)}</span><span class="ml-auto code">${esc(l.serial)}</span></a></li>`).join("")}</ul></div>`;
}

function sendPayment(ctx, args) {
  const inv = byId(ctx.s.invoices, args.invoiceId);
  call(
    "Portal: payment proof sent",
    (s, c) =>
      ctx.biz.payments.record(
        s,
        {
          invoiceId: args.invoiceId,
          amount: args.amount,
          method: args.method || "upi",
          reference: String(args.reference || "").trim(),
          proof: args.proof || null,
        },
        c
      ),
    { ...ctx, memberId: null }
  );
  delete ctx.ui["pay:step"];
  return {
    text: `Proof sent. Waiting for ${ctx.s.workspace.name} to confirm.`,
    go: ["p-pay", { id: inv?.id || args.invoiceId }],
  };
}

/* ---------- my orders ---------- */
const recordsOf = (s, c) =>
  s.leads.filter((l) => l.customerId === c.id).length +
  s.invoices.filter((i) => i.customerId === c.id && !i.cancelled).length +
  s.bookings.filter((b) => b.customerId === c.id).length;

function ordersPage(ctx) {
  const s = ctx.s;
  const B = ctx.biz.invoices;
  const p = ctx.params;
  const c =
    (p.token && s.customers.find((x) => x.token === p.token)) ||
    (p.id && byId(s.customers, p.id)) ||
    [...s.customers].sort((a, b) => recordsOf(s, b) - recordsOf(s, a))[0];
  if (!c)
    return cust(ok(ctx, "user-x", "Link not found", "This link is not valid."));
  const ws = s.workspace;
  const invs = B.ofCustomer(s, c.id).filter((i) => i.sharedAt);
  const bks = s.bookings.filter((b) => b.customerId === c.id);
  const leads = s.leads.filter(
    (l) =>
      l.customerId === c.id &&
      !invs.some((i) => i.leadId === l.id) &&
      !bks.some((b) => b.leadId === l.id)
  );
  const bookLabel = (b) => {
    const pkg = byId(s.packages, b.packageId);
    const lead = b.leadId && byId(s.leads, b.leadId);
    return pkgLabel(pkg) || lead?.brief || "Appointment";
  };
  const when = (b) => `${fmtDate(b.start)}, ${fmtTime(b.start)}`;
  const next = bks
    .filter(
      (b) =>
        ["tentative", "confirmed"].includes(b.status) &&
        String(b.start).slice(0, 10) >= ctx.today
    )
    .sort((a, b) => String(a.start).localeCompare(String(b.start)))[0];
  const KIND = {
    reply: "Your price",
    advance: "Advance",
    bill: "Invoice",
    balance: "Balance",
  };
  const invSub = (i) => {
    const st = B.statusOf(s, i);
    if (st === "paid") return "Paid";
    if (st === "pending") return "Waiting for the business to confirm";
    if (st === "expired") return `Expired ${fmtDate(i.payBy)}`;
    if (B.isReplyLike(i)) return `Pay by ${fmtDate(i.payBy)} to confirm`;
    return `Due ${fmtDate(i.dueDate)}`;
  };
  const rows = [
    ...invs.map((i) => ({
      at: i.sharedAt || i.createdAt,
      html: `<a ${link("p-pay", { id: i.id })} data-row="${i.id}" class="flex items-center gap-3 p-3 min-h-touch hover:bg-biz-soft/40"><span class="size-control-lg shrink-0 rounded-sm bg-biz-soft text-biz flex items-center justify-center">${I("receipt")}</span><div class="min-w-0"><p class="font-medium">${KIND[i.kind] || "Invoice"}</p><p class="text-caption text-customer-muted truncate">${esc(B.numberOf(i))} · ${invSub(i)}</p></div><div class="ml-auto text-right shrink-0"><p>${M(B.total(s, i))}</p><div class="mt-0.5">${pill(B.statusOf(s, i))}</div></div></a>`,
    })),
    ...bks.map((b) => {
      const m = byId(s.members, b.memberId);
      return {
        at: b.start,
        html: `<div data-row="${b.id}" class="flex items-center gap-3 p-3 min-h-touch"><span class="size-control-lg shrink-0 rounded-sm bg-biz-soft text-biz flex items-center justify-center">${I("calendar-check")}</span><div class="min-w-0"><p class="font-medium">Booking</p><p class="text-caption text-customer-muted truncate">${esc(bookLabel(b))} · ${when(b)}${m ? ` · With ${esc(first(m.name))}` : ""}</p></div><div class="ml-auto text-right shrink-0"><div class="mt-0.5">${bookingPill(b.status)}</div></div></div>`,
      };
    }),
    ...leads.map((l) => ({
      at: l.createdAt,
      html: `<div data-row="${l.id}" class="flex items-center gap-3 p-3 min-h-touch"><span class="size-control-lg shrink-0 rounded-sm bg-biz-soft text-biz flex items-center justify-center">${I("message-square")}</span><div class="min-w-0"><p class="font-medium">Request</p><p class="text-caption text-customer-muted truncate">${esc(l.brief || l.lines.map((x) => x.name).join(", ") || "Your request")} · ${fmtDate(l.createdAt)}</p></div><div class="ml-auto text-right shrink-0"><div class="mt-0.5">${pill(l.status === "snoozed" ? "contacted" : l.status)}</div></div></div>`,
    })),
  ].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return cust(`${cHeader(ctx)}<div class="mx-auto max-w-3xl px-4 py-5"><h1 class="text-heading font-bold">Hi ${esc(first(c.name))}</h1><p class="text-caption text-customer-muted">Everything with ${esc(ws.name)}, in one place.</p>
    ${next ? `<div class="mt-3 p-4 rounded-card bg-biz text-biz-foreground" data-next><p class="text-label uppercase tracking-wider">Next booking</p><p class="text-title font-semibold">${esc(bookLabel(next))} · ${when(next)}</p><p class="text-caption">${byId(s.members, next.memberId) ? `With ${esc(first(byId(s.members, next.memberId).name))}` : "Staff to be assigned"}${next.status === "tentative" ? " · To confirm" : ""}</p></div>` : ""}
    <div class="mt-3 ccard divide-y divide-customer-border overflow-hidden" data-orders>${rows.length ? rows.map((r) => r.html).join("") : `<p class="p-4 text-customer-muted">Nothing here yet.</p>`}</div>
    <p class="mt-4 text-caption text-customer-muted">This page shows your requests, bookings and invoices with ${esc(ws.name)}. Ask ${esc(ws.name)} to update or delete your details at any time. <span class="italic">[Draft, lawyer to finalise]</span></p></div>${madeWith}`);
}

/* ---------- calendar file ---------- */
function downloadIcs(ctx, { id }) {
  const s = ctx.s;
  const b = byId(s.bookings, id) || fail("Booking not found.");
  const pkg = byId(s.packages, b.packageId);
  const stamp = (x) =>
    String(x || "")
      .slice(0, 16)
      .replace(/[-:]/g, "") + "00";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${b.id}@${s.workspace.slug}`,
    `DTSTART:${stamp(b.start)}`,
    `DTEND:${stamp(b.end || b.start)}`,
    `SUMMARY:${pkgLabel(pkg) || "Booking"} · ${s.workspace.name}`,
    `LOCATION:${[s.workspace.address, s.workspace.city].filter(Boolean).join(", ")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  if (
    typeof document !== "undefined" &&
    typeof URL.createObjectURL === "function"
  ) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = `booking-${b.id}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  return { text: "Calendar file downloaded" };
}

/* ---------- screens ---------- */
const handlers = {
  "request.send": sendRequest,
  "book.send": sendBooking,
  "pay.send": sendPayment,
  "pay.optional": (ctx, a) =>
    call(
      "Portal: optional line",
      (s, c) => ctx.biz.invoices.chooseOptional(s, a, c),
      { ...ctx, memberId: null }
    ),
};

export default [
  {
    n: 30,
    area: "Portal",
    id: "p-catalog",
    name: "Catalog",
    route: "glow.biz4kit.com",
    action: "Request a quote",
    who: "Customer",
    notes:
      'Business brand only (pick one in the toolbar); Biz4Kit appears only in the "Made with Biz4Kit" footer (D78). "Request a quote" where a price is hidden. LCP ≤ 2.5 s on Slow 4G.',
    states: [
      ["Catalog", catalogPage],
      ["Item", itemPage],
    ],
    actions: {
      "bag.toggle": (ctx, { id }) => {
        const e = entryOf(ctx.s, id) || fail("Item not found.");
        if (bag.has(id)) bag.delete(id);
        else bag.set(id, e.min || 1);
        return { text: `${e.name} ${bag.has(id) ? "added" : "removed"}` };
      },
      "bag.remove": (ctx, { id }) => {
        bag.delete(id);
        return { text: "Removed from your request" };
      },
      "bag.addGo": (ctx, { id }) => {
        const e = entryOf(ctx.s, id) || fail("Item not found.");
        bag.set(id, bag.get(id) || e.min || 1);
        return { text: `${e.name} added`, go: ["p-request", { item: id }] };
      },
    },
    checks: [
      (t, h) => {
        const items = h.biz.catalog.visibleItems(h.s);
        const f = h.at("p-catalog");
        t(
          f.querySelectorAll("[data-item]").length === items.length,
          "All shows every visible item"
        );
        t(
          f.querySelectorAll("[data-cat]").length ===
            new Set(items.map((i) => i.category)).size,
          "items are grouped by category"
        );
        const hidden = items.find((i) => !i.showPrice);
        if (hidden)
          t(
            f
              .querySelector(`[data-item="${hidden.id}"]`)
              ?.textContent.includes("Request a quote"),
            "a hidden price shows Request a quote"
          );
        t(
          !f.textContent.includes("Biz4Kit") ||
            f.textContent.split("Biz4Kit").length === 2,
          "Biz4Kit appears only in the footer"
        );
        const pk = h.at("p-catalog", { tab: "packages" });
        t(
          !pk.querySelector("[data-item]") &&
            pk.querySelectorAll("[data-package]").length ===
              h.s.packages.filter((p) => p.active).length,
          "Packages tab shows packages only"
        );
        const bookable = h.s.packages.find((p) => p.active && p.bookable);
        if (bookable)
          t(
            Boolean(
              pk.querySelector(
                `[data-package="${bookable.id}"] [data-go="p-book"][data-p-id="${bookable.id}"]`
              )
            ),
            "a bookable package links to the booking picker"
          );
      },
    ],
  },
  {
    n: 31,
    area: "Portal",
    id: "p-request",
    name: "Request form",
    route: "/request",
    action: "Submit",
    who: "Customer",
    notes:
      "Basket or brief, photos, date, name, phone; rate-limited. Consent line: Legal & compliance draft, lawyer to finalise (3.11).",
    states: [
      ["Form", requestForm],
      ["Sent", sentPage],
    ],
    sample: { item: "T2" },
    actions: {
      ...handlers,
      "bag.remove": (ctx, { id }) => {
        bag.delete(id);
        if (ctx.ui.req?.q) delete ctx.ui.req.q[id];
        return { text: "Removed from your request" };
      },
    },
    checks: [
      (t, h) => {
        const f = h.at("p-request", { item: "T2" });
        t(
          Boolean(f.querySelector('[data-line="T2"] input[name="q[T2]"]')),
          "the item from the catalog is on the request with a quantity"
        );
        const ctx = h.makeCtx();
        const before = ctx.s.leads.length;
        const outBefore = ctx.s.outbox.length;
        const out = sendRequest(
          { ...ctx, customer: true },
          {
            q: { T2: "2" },
            brief: "Check: hair spa for two",
            name: "Check Customer",
            phone: "+91 90000 12345",
            email: "check@example.com",
            preferredDate: h.makeCtx().today,
          }
        );
        const s = h.makeCtx().s;
        const lead = s.leads[0];
        t(s.leads.length === before + 1, "a request creates a new lead");
        t(
          lead.status === "new" &&
            lead.type === "quoted" &&
            lead.source === "web" &&
            lead.lines[0]?.qty === 2,
          "the new lead is New, quoted, from the web, with the items"
        );
        t(
          s.outbox.length === outBefore + 1 && s.outbox[0].templateId === 2,
          "message 2 (request received) goes to the outbox"
        );
        t(
          out.go[0] === "p-request" && out.go[1].sent === lead.id,
          "after sending, the thank-you state opens"
        );
        const done = h.at("p-request", { sent: lead.id });
        t(
          done.textContent.includes("Request sent") &&
            done.textContent.includes("Thanks Check"),
          "thank-you state names the customer"
        );
        t(
          toAnswerHas(h, lead.id),
          "the new lead is in the workspace Leads inbox"
        );
        let err = "";
        try {
          sendRequest(
            { ...h.makeCtx(), customer: true },
            { name: "X", phone: "1" }
          );
        } catch (e) {
          err = e.message;
        }
        t(Boolean(err), "an incomplete request is refused");
      },
      (t, h) => {
        /* MOQ (D87): the request never goes below an item's minimum order */
        const s = h.makeCtx().s;
        const it = byId(s.items, "T2");
        it.moq = 3;
        /* seed the basket afresh (an earlier check may have seeded and sent it) */
        delete h.makeCtx(undefined, "p-request", "owner", { item: "T2" }).ui._seeded;
        delete h.makeCtx(undefined, "p-request", "owner", { item: "T2" }).ui.req;
        const f = h.at("p-request", { item: "T2" });
        const q = f.querySelector('input[name="q[T2]"]');
        t(
          q?.min === "3" && +q.value >= 3 && f.querySelector('[data-line="T2"] [data-moq]'),
          "the request starts at the minimum order and says so"
        );
        sendRequest(
          { ...h.makeCtx(), customer: true },
          { q: { T2: "1" }, name: "Moq Check", phone: "+91 90000 54321" }
        );
        t(
          h.makeCtx().s.leads[0].lines[0]?.qty === 3,
          "a quantity below the minimum is raised to it"
        );
      },
    ],
  },
  {
    n: 32,
    area: "Portal",
    id: "p-book",
    name: "Booking picker",
    route: "/book/:package",
    action: "Confirm slot",
    who: "Customer",
    notes:
      "Bookable packages only; staff then slot from availability; confirmation uses ready message 10 wording, add-to-calendar.",
    states: [
      ["Pick", bookPage],
      ["Booked", bookedPage],
    ],
    sample: { id: "K4" },
    actions: {
      ...handlers,
      "book.ics": downloadIcs,
    },
    checks: [
      (t, h) => {
        const f = h.at("p-book", { id: "K4" });
        t(
          f.querySelectorAll("[data-days] button").length === 7,
          "seven day chips from today"
        );
        /* B7: Rahul (M3) has Monthly hair care on Tue 20 Oct 10:30–12:30, so 11:00 with Rahul is taken. */
        const b7 = h.s.bookings.find((b) => b.id === "B7");
        if (b7) {
          const day = String(b7.start).slice(0, 10);
          const g = h.at("p-book", { id: "K4", with: b7.memberId, day });
          t(
            Boolean(g.querySelector('[data-slot="11:00"][data-taken]')),
            "a slot that clashes with the chosen person's booking is taken"
          );
          const any = h.at("p-book", { id: "K4", day });
          t(
            !any.querySelector('[data-slot="11:00"][data-taken]'),
            "with Any, the slot stays free while someone else is free"
          );
        }
        const day = h.makeCtx().today;
        const k5 = h.s.packages.find((p) => p.id === "K5");
        const SLOTS = h.biz.settings.slotsFor(h.s, day, k5?.durationMin);
        const free = SLOTS.find(
          (x) =>
            !h
              .at("p-book", { id: "K5", day, time: x })
              .querySelector(`[data-slot="${x}"][data-taken]`)
        );
        h.at("p-book", { id: "K5", day, time: free });
        const before = h.makeCtx().s.leads.length;
        const out = sendBooking(
          { ...h.makeCtx(), customer: true },
          { name: "Check Booker", phone: "+91 90000 54321" }
        );
        const s = h.makeCtx().s;
        const lead = s.leads[0];
        const b = s.bookings.find((x) => x.leadId === lead.id);
        t(
          s.leads.length === before + 1 &&
            lead.type === "booked" &&
            lead.packageId === "K5",
          "booking creates a booked lead with the package"
        );
        t(
          b && b.status === "tentative" && b.start === `${day}T${free}`,
          "the booking is To confirm at the chosen slot"
        );
        const done = h.at("p-book", out.go[1]);
        t(
          Boolean(done.querySelector('[data-status="tentative"]')),
          "confirmation shows To confirm"
        );
      },
    ],
  },
  {
    n: 33,
    area: "Portal",
    id: "p-pay",
    name: "Invoice & pay page",
    route: "/i/:token",
    action: "Pay by UPI, upload proof",
    who: "Customer",
    notes:
      'UPI deep link opens any UPI app; QR and bank details as fallback; Paid only after approval, then a receipt and the INV- number. Expired or rejected replies show "no longer valid" and cannot be paid (D73).',
    states: [
      ["Invoice", (ctx) => payPage(ctx)],
      ["Upload proof", (ctx) => payPage(ctx, "proof")],
      [
        "No longer valid",
        (ctx) => {
          const s = ctx.s;
          const inv =
            (ctx.params.id && byId(s.invoices, ctx.params.id)) ||
            s.invoices.find(
              (i) =>
                !ctx.biz.payments.payable(s, i).ok &&
                ctx.biz.invoices.statusOf(s, i) === "expired"
            );
          return inv && !ctx.biz.payments.payable(s, inv).ok
            ? noLongerValid(ctx, inv, ctx.biz.payments.payable(s, inv).reason)
            : payPage(ctx);
        },
      ],
    ],
    sample: { id: "I2" },
    actions: handlers,
    checks: [
      (t, h) => {
        const f = h.at("p-pay", { id: "I2" });
        t(
          f.textContent.includes(h.s.workspace.upi),
          "the pay page shows the workspace UPI"
        );
        t(
          Boolean(f.querySelector('svg[aria-label^="QR"]')),
          "the pay page shows a QR"
        );
        const p = h.at("p-pay", { id: "I2" }, "owner", "web", 1);
        t(
          Boolean(
            p.querySelector('form[data-do="pay.send"] input[name="proof"]')
          ),
          "I have paid opens the proof form"
        );
        const s0 = h.makeCtx().s;
        const inv = s0.invoices.find((i) => i.id === "I2");
        const open = h.biz.invoices.open(s0, inv);
        t(
          Number(p.querySelector('input[name="amount"]').value) === open,
          "amount defaults to the open balance"
        );
        const before = s0.payments.length;
        sendPayment(
          { ...h.makeCtx(), customer: true },
          {
            invoiceId: "I2",
            amount: String(open),
            method: "upi",
            reference: "UTR123",
            proof: { name: "gpay.jpg", size: 1000, type: "image/jpeg" },
          }
        );
        const s = h.makeCtx().s;
        t(
          s.payments.length === before + 1 &&
            s.payments[0].status === "pending" &&
            s.payments[0].byCustomer === true,
          "paying records a pending payment from the customer"
        );
        const w = h.at("p-pay", { id: "I2" });
        t(
          Boolean(w.querySelector("[data-waiting]")) &&
            !w.querySelector('[data-ui="pay:step"][data-v="proof"]'),
          "after paying: waiting for the business to confirm, no second pay form"
        );
        const x = h.at("p-pay", { id: "I10" });
        t(
          Boolean(x.querySelector("[data-reason]")) &&
            x.textContent.includes("expired on") &&
            !x.querySelector('form[data-do="pay.send"]') &&
            !x.querySelector('[data-v="proof"]'),
          "an expired reply shows the reason instead of the form"
        );
        const rej = s.invoices.find(
          (i) =>
            i.leadId &&
            s.leads.find((l) => l.id === i.leadId)?.status === "rejected"
        );
        if (rej)
          t(
            !h.at("p-pay", { id: rej.id }).querySelector('[data-v="proof"]'),
            "a rejected request cannot be paid"
          );
        const paid = s.invoices.find(
          (i) => h.biz.invoices.statusOf(s, i) === "paid"
        );
        if (paid)
          t(
            !h.at("p-pay", { id: paid.id }).querySelector('[data-v="proof"]') &&
              h
                .at("p-pay", { id: paid.id })
                .textContent.includes("already paid"),
            "a paid invoice shows it is paid, no pay form"
          );
      },
    ],
  },
  {
    n: 34,
    area: "Portal",
    id: "p-orders",
    name: "My orders",
    route: "/me/:token",
    action: "Open any record",
    who: "Customer",
    notes:
      "Private per-customer link, no login ever. Status colours stay ours (success / warning), never the business colour.",
    render: ordersPage,
    sample: { id: "C1" },
    checks: [
      (t, h) => {
        const s = h.s;
        const c = s.customers.find((x) => x.id === "C1");
        const f = h.at("p-orders", { token: c.token });
        const invs = h.biz.invoices
          .ofCustomer(s, c.id)
          .filter((i) => i.sharedAt);
        t(
          f.textContent.includes(`Hi ${c.name.split(" ")[0]}`),
          "opens by the customer's token"
        );
        t(
          invs.every((i) =>
            f.querySelector(`[data-go="p-pay"][data-p-id="${i.id}"]`)
          ),
          "every invoice links to the pay page"
        );
        t(
          s.bookings
            .filter((b) => b.customerId === c.id)
            .every((b) => f.querySelector(`[data-row="${b.id}"]`)),
          "every booking is listed"
        );
        const fb = h.at("p-orders");
        t(
          fb.querySelectorAll("[data-orders] [data-row]").length > 1,
          "without a link it falls back to a customer with several records"
        );
      },
    ],
  },
];

function toAnswerHas(h, id) {
  return h.biz.leads.toAnswer(h.makeCtx().s).some((l) => l.id === id);
}
