import * as notify from "../biz/notify.js";
import { ROLES, can } from "../biz/perms.js";
/* Chrome around screens: the workspace shell (sidebar, header, page tabs, phone bar), customer pages and
   onboarding. Same look as design/screens-v2.html (D80–D83). */
import { esc, fmtTime } from "../core/util.js";
import { I, P, C, av, link, lockup, mark } from "./kit.js";
import { SCREENS, screenById } from "./registry.js";

/* ---------- business logo (customer brand) ---------- */
export const bizMark = (s, c = "size-6") => {
  const logo = s.workspace.brand?.logo;
  if (logo)
    return `<img class="${c} object-contain rounded-pill bg-white" src="${esc(logo)}" alt="${esc(s.workspace.name)}">`;
  return `<svg class="${c}" viewBox="0 0 40 40" aria-label="${esc(s.workspace.name)}"><circle cx="20" cy="20" r="18" fill="var(--biz)"/><path d="M12 22c3 7 13 7 16 0" stroke="var(--biz-foreground)" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="20" cy="12" r="3.5" fill="var(--biz-accent)"/></svg>`;
};
export const bizLogo = (s, c = "h-6") => {
  const logo = s.workspace.brand?.logo;
  if (logo)
    return `<span class="inline-flex items-center gap-1.5 font-customer font-bold text-body-sm whitespace-nowrap ${c}"><img class="h-full w-auto object-contain" src="${esc(logo)}" alt="">${esc(s.workspace.name)}</span>`;
  return `<svg class="${c} w-auto" viewBox="0 0 ${40 + esc(s.workspace.name).length * 11} 40" aria-label="${esc(s.workspace.name)}"><circle cx="20" cy="20" r="16" fill="var(--biz)"/><path d="M13 22c3 6 11 6 14 0" stroke="var(--biz-foreground)" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="20" cy="13" r="3" fill="var(--biz-accent)"/><text x="44" y="27" font-family="Inter" font-weight="700" font-size="18" fill="currentColor">${esc(s.workspace.name)}</text></svg>`;
};

/* ---------- who may open a screen (screen map "who"); Manager also gets Approvals when delegated ---------- */
export const canSee = (ctx, sc) => {
  if (!sc) return false;
  const r = ctx.role;
  if (r === "owner" || r === "superadmin") return true;
  const w = sc.who.split(",").map((x) => x.trim());
  return (
    w.includes("All") ||
    w.includes(ROLES[r]) ||
    (r === "manager" &&
      sc.id === "approvals" &&
      ctx.s.workspace.approvals?.managerEnabled)
  );
};

/* Sidebar sections (D80); Settings is separate (D83). Board, Customers and Jobs are extras (D63, Lite mode). */
export const NAV = [
  [
    "Home",
    "house",
    [
      ["dashboard", "Today"],
      ["board", "Board", "board"],
      ["reports", "Reports"],
    ],
  ],
  [
    "Sales",
    "handshake",
    [
      ["leads", "Leads"],
      ["customers", "Customers", "customers"],
      ["serials", "Serials", "serials"],
    ],
  ],
  [
    "Schedule",
    "calendar-blank",
    [
      ["bookings", "Bookings"],
      ["jobs", "Jobs", "jobs"],
    ],
  ],
  [
    "Payments",
    "currency-inr",
    [
      ["invoices", "Invoices"],
      ["overdue", "Overdue"],
      ["approvals", "Approvals"],
    ],
  ],
  [
    "Business",
    "storefront",
    [
      ["catalog", "Catalog"],
      ["packages", "Packages"],
    ],
  ],
];
const PAGE_ICON = {
  dashboard: "sun",
  board: "kanban",
  reports: "chart-bar",
  leads: "tray",
  customers: "users",
  serials: "barcode",
  bookings: "calendar-check",
  jobs: "wrench",
  invoices: "receipt",
  overdue: "warning-circle",
  approvals: "seal-check",
  catalog: "book-open",
  packages: "package",
  settings: "gear-six",
};
/* Lucide icon for the phone bottom bar per section. */
const GROUP_LUCIDE = {
  Home: "house",
  Sales: "handshake",
  Schedule: "calendar-days",
  Payments: "indian-rupee",
  Business: "store",
};

export const pagesOf = (ctx, g) =>
  g[2].filter(
    (pg) =>
      (!pg[2] ||
        (pg[2] === "serials"
          ? ctx.s.workspace.modules?.serials === true // off unless turned on (D85)
          : ctx.s.workspace.modules?.[pg[2]] !== false)) &&
      canSee(ctx, screenById(pg[0]))
  );
export const groupOf = (id) => NAV.find((g) => g[2].some((pg) => pg[0] === id));

/* Live counts on sidebar pages: leads to answer, overdue bills, payments to approve. */
const badgeOf = (ctx, id) => ctx.counts?.[id] || 0;

/* Favourites (option A tiles, D82/D83): one click to the Quick jobs. */
const FAVS = [
  [
    "Catalog",
    "book-open",
    "catalog",
    "share-catalog",
    "catalog",
    "bg-teal-soft text-teal",
  ],
  [
    "Create invoice",
    "receipt",
    "invoices",
    "new-invoice",
    "write",
    "bg-info-soft text-info",
  ],
  [
    "Send reply",
    "paper-plane-tilt",
    "leads",
    "",
    "write",
    "bg-violet-soft text-violet",
  ],
];

function sidebar(ctx, grp, active) {
  const open = (g) => ctx.nav[g[0]] ?? g === grp;
  const groups = NAV.map((g) => {
    const pages = pagesOf(ctx, g);
    if (!pages.length) return "";
    const n = pages.reduce((t, pg) => t + badgeOf(ctx, pg[0]), 0);
    const isOpen = open(g);
    return `<div data-grp-tree="${g[0]}" class="group/nav" ${isOpen ? "data-expanded" : ""}>
      <div class="sb-sum h-nav-item rounded-control pr-0 ${g === grp ? "text-foreground" : ""}">
        <a ${link(pages[0][0])} data-nav-open="${g[0]}" class="flex flex-1 min-w-0 items-center gap-2 h-full">${P(g[1])}<span class="truncate">${g[0]}</span>${n && !isOpen ? `<span class="ml-auto count bg-info text-info-foreground">${n}</span>` : ""}</a>
        <button type="button" class="btn btn-ghost btn-sm btn-icon shrink-0 text-muted-foreground" data-act="nav-toggle" data-grp="${g[0]}" aria-expanded="${isOpen}" aria-label="${isOpen ? "Collapse" : "Expand"} ${g[0]}">${P("caret-right", "regular", `transition-transform ${isOpen ? "rotate-90" : ""}`)}</button>
      </div>
      ${isOpen ? `<ul class="sb-sub">${pages.map((pg) => `<li><a ${link(pg[0])} data-page ${pg[0] === active ? 'aria-current="page"' : ""} class="sb-page h-nav-item rounded-control">${P(PAGE_ICON[pg[0]])}<span class="truncate">${pg[1]}</span>${badgeOf(ctx, pg[0]) ? `<span class="ml-auto count">${badgeOf(ctx, pg[0])}</span>` : ""}</a></li>`).join("")}</ul>` : ""}
    </div>`;
  }).join("");
  const rail = NAV.map((g) => {
    const pages = pagesOf(ctx, g);
    if (!pages.length) return "";
    const n = pages.reduce((t, pg) => t + badgeOf(ctx, pg[0]), 0);
    const here = g === grp;
    return `<a ${link(pages[0][0])} data-grp="${g[0]}" title="${g[0]}" ${here ? 'aria-current="page"' : ""} class="sb-item relative flex items-center justify-center h-nav-item px-2 rounded-control ${here ? "bg-secondary text-secondary-foreground" : "hover:bg-muted"}">${P(g[1], "duotone", "text-[17px]")}<span class="sr-only">${g[0]}</span>${n ? `<span class="absolute top-1 right-1 size-2 rounded-pill bg-destructive"></span>` : ""}</a>`;
  }).join("");
  const favs = FAVS.filter(
    (f) =>
      canSee(ctx, screenById(f[2])) &&
      (ctx.role === "superadmin" || can(ctx.role, f[4]))
  );
  const favA = (f, cls, inner) =>
    `<a ${link(f[2])} ${f[3] ? `data-then="${f[3]}"` : ""} data-fav title="${f[0]}" class="${cls}">${inner}</a>`;
  const tile = (f) => `<span class="sb-tile ${f[5]}">${P(f[1], "fill")}</span>`;
  const favBlock = favs.length
    ? `<div role="group" aria-label="Favourites" class="mt-2 pt-2 border-t border-border">
        <div class="sb-text"><p class="label px-2 h-control-sm flex items-center">Favourites</p>
          <ul class="space-y-0.5">${favs.map((f) => `<li>${favA(f, "flex items-center gap-2 h-nav-item px-2 rounded-control hover:bg-muted", `${tile(f)}<span class="truncate">${f[0]}</span>`)}</li>`).join("")}</ul></div>
        <div class="sb-mark flex-col gap-0.5">${favs.map((f) => favA(f, "sb-item flex items-center justify-center h-nav-item px-2 rounded-control hover:bg-muted", `${tile(f)}<span class="sr-only">${f[0]}</span>`)).join("")}</div>
      </div>`
    : "";
  const set = canSee(ctx, screenById("settings"))
    ? `<div class="mt-2 pt-2 border-t border-border" data-settings><a ${link("settings")} data-page ${active === "settings" ? 'aria-current="page"' : ""} class="sb-full sb-page h-nav-item rounded-control">${P("gear-six")}<span class="truncate">Settings</span></a><a ${link("settings")} ${active === "settings" ? 'aria-current="page"' : ""} title="Settings" class="sb-mark sb-item items-center justify-center h-nav-item px-2 rounded-control ${active === "settings" ? "bg-secondary text-secondary-foreground" : "hover:bg-muted"}">${P("gear-six", "duotone", "text-[17px]")}<span class="sr-only">Settings</span></a></div>`
    : "";
  const s = ctx.s;
  const me = ctx.me || { name: "Biz4Kit support", email: "" };
  const owner = ctx.role === "owner" || ctx.role === "superadmin";
  return `<aside class="sb ${ctx.nav.sidebar === false ? "is-collapsed" : ""} hidden @tab:flex flex-col shrink-0">
      <div class="sb-head flex items-center gap-1 mx-2 mt-3 mb-2 pb-2 box-content h-control-lg border-b border-border">
        <a ${link("dashboard")} class="sb-item flex items-center gap-2.5 px-1.5 min-w-0 flex-1" aria-label="Go to Today"><span class="size-8 shrink-0 rounded-control bg-primary text-primary-foreground inline-flex items-center justify-center" role="img" aria-label="Biz4Kit mark">${mark("h-4 -translate-x-px -translate-y-px")}</span></a>
        <button type="button" class="sb-web btn btn-ghost btn-sm btn-icon shrink-0 text-muted-foreground" data-act="sidebar" aria-label="Collapse or expand sidebar" title="Collapse sidebar">${I("panel-left", "size-icon-sm")}</button>
      </div>
      <nav class="flex-1 overflow-y-auto noscroll px-2 pt-1" aria-label="Workspace"><div class="sb-mark flex-col gap-0.5">${rail}</div><div class="sb-text space-y-0.5">${groups}</div>${favBlock}${set}</nav>
      <details class="dd relative m-2" data-menu>
        <summary class="sb-item flex items-center gap-2.5 p-2 rounded-control border border-border bg-card hover:bg-muted cursor-pointer" aria-label="Account and workspace menu">
          ${bizMark(s, "size-8 shrink-0 rounded-pill")}<div class="sb-text min-w-0 leading-tight"><div class="font-semibold truncate">${esc(s.workspace.name)}</div><div class="text-caption text-muted-foreground truncate">${esc(me.name)} · ${ROLES[ctx.role]}</div></div>
          <span class="sb-full ml-auto text-muted-foreground">${I("chevrons-up-down", "size-icon-sm")}</span></summary>
        <div class="menu w-72 left-full bottom-0 ml-2 @web:left-0 @web:bottom-full @web:ml-0 @web:mb-1">
          <div class="flex items-start gap-2.5 p-2">${bizMark(s, "size-10 shrink-0 rounded-pill")}<div class="min-w-0 leading-tight space-y-0.5"><p class="font-semibold truncate">${esc(s.workspace.name)}</p><p class="text-caption text-muted-foreground">${esc([s.workspace.address, s.workspace.city, s.workspace.pin].filter(Boolean).join(", "))}</p>${s.workspace.gstin ? `<p class="text-caption text-muted-foreground">${C(`GSTIN ${s.workspace.gstin}`)}</p>` : ""}<p class="text-caption text-muted-foreground"><span class="money">${esc(s.workspace.phone)}</span> · ${C(`${s.workspace.slug}.biz4kit.com`)}</p></div></div>
          <a ${link("p-catalog")}>${I("external-link", "size-icon-sm")}Public page</a>
          ${owner ? `<a ${link("settings", { tab: "business" })}>${I("building-2", "size-icon-sm")}Company details</a><a ${link("settings", { tab: "brand" })}>${I("palette", "size-icon-sm")}Brand and logo</a><a ${link("settings", { tab: "team" })}>${I("settings", "size-icon-sm")}Settings and team</a>` : ""}
          <hr />
          <p class="menu-label">Signed in</p>
          <div class="flex items-center gap-2.5 px-2 py-1.5">${av(me.initials || "?", "bg-secondary text-secondary-foreground")}<div class="min-w-0 leading-tight"><p class="font-medium truncate">${esc(me.name)} · ${ROLES[ctx.role]}</p><p class="text-caption text-muted-foreground truncate">${esc(me.email || "")}</p></div></div>
          <button type="button" data-act="theme">${I("sun-moon", "size-icon-sm")}Light or dark</button>
          <a ${link("login")}>${I("log-out", "size-icon-sm")}Sign out</a>
        </div>
      </details>
    </aside>`;
}

export const pageTabs = (ctx, g, active) => {
  const pages = g ? pagesOf(ctx, g) : [];
  if (pages.length < 2) return "";
  return `<nav data-tabs class="shrink-0 flex items-center gap-1 px-2 @tab:px-page border-b border-border overflow-x-auto noscroll" aria-label="${g[0]} pages">${pages
    .map(
      (pg) =>
        `<a ${link(pg[0])} ${pg[0] === active ? 'aria-current="page"' : ""} class="h-control-lg px-3 flex items-center gap-1.5 whitespace-nowrap border-b-2 ${pg[0] === active ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}">${pg[1]}${badgeOf(ctx, pg[0]) ? `<span class="count">${badgeOf(ctx, pg[0])}</span>` : ""}</a>`
    )
    .join("")}</nav>`;
};

const denied = (ctx, sc) =>
  `<div class="h-full flex flex-col items-center justify-center gap-2 p-page text-center"><span class="size-control-lg rounded-pill bg-muted text-muted-foreground flex items-center justify-center">${I("lock")}</span><p class="text-title font-semibold">Not available to ${ROLES[ctx.role]}</p><p class="text-muted-foreground">This page is for ${esc(sc.who)}.</p></div>`;

/* The workspace frame. active: the list page this screen belongs to (selects the section and its tab).
   back: the screen the back arrow opens. fab / fabOpen: the phone action. dialogs: dialogs of this screen. */
export function app(
  ctx,
  active,
  {
    icon,
    title,
    crumb = "",
    fab = "",
    fabOpen = "",
    back = "",
    backParams = {},
    dialogs = "",
  },
  body
) {
  const grp = groupOf(active);
  const sc = ctx.screen;
  const allowed = canSee(ctx, sc);
  const support =
    ctx.role === "superadmin"
      ? `<div class="shrink-0 flex items-center gap-2 px-4 @tab:px-page py-2 bg-violet-soft text-violet text-caption font-medium">${I("shield-check", "size-icon-sm")}Support view of ${esc(ctx.s.workspace.name)} · read-only · access is logged</div>`
      : "";
  return `<div data-app class="relative h-full flex bg-background text-foreground">
    ${sidebar(ctx, grp, active)}
    <div class="relative flex-1 min-w-0 flex flex-col bg-card overflow-hidden @tab:my-2 @tab:mr-2 @tab:rounded-card @tab:border @tab:border-border @tab:shadow-xs">
      ${support}
      <header class="h-header shrink-0 flex items-center gap-3 px-4 @tab:px-page border-b border-border">
        <span class="@tab:hidden flex">${back ? `<a ${link(back, backParams)} class="flex" aria-label="Back">${I("chevron-left")}</a>` : mark("h-5")}</span>
        ${back ? `<a ${link(back, backParams)} class="hidden @tab:inline-flex btn btn-outline btn-sm btn-icon" aria-label="Back">${I("chevron-left", "size-icon-sm")}</a>` : `<span class="hidden @tab:inline">${I(icon, "size-icon text-muted-foreground")}</span>`}
        <h1 class="text-title font-semibold truncate">${title}${crumb ? `<span class="hidden @tab:inline text-muted-foreground font-normal"> / ${back ? `<a ${link(back, backParams)} class="hover:underline">${crumb}</a>` : crumb}</span>` : ""}</h1>
        <div class="ml-auto flex items-center gap-2">
          <label class="relative hidden @web:flex field w-72 pr-12">${I("search", "size-icon text-muted-foreground")}<input type="search" class="min-w-0 flex-1 bg-transparent outline-none" placeholder="Search customers, leads, invoices" data-global-search aria-label="Search customers, leads, invoices" /><span class="kbd absolute right-2 top-1.5">⌘K</span></label>
          <button type="button" class="@web:hidden btn btn-ghost btn-icon" data-open="global-search" aria-label="Search">${I("search")}</button>
          ${(() => {
            /* Bell: the notification inbox (D87); the simulated outbox stays in the Tools menu. */
            const n = notify.unread(ctx.s, ctx);
            return `<a ${link("inbox")} class="btn btn-outline btn-icon relative" aria-label="Inbox${n ? `, ${n} unread` : ""}" data-bell>${I("bell")}${n ? `<span class="absolute -top-1.5 -right-1.5 count bg-destructive text-destructive-foreground">${n}</span>` : ""}</a>`;
          })()}
          <button type="button" class="hidden @tab:inline-flex btn btn-outline btn-icon" data-open="help" aria-label="Help">${I("circle-help")}</button>
        </div>
      </header>
      ${pageTabs(ctx, grp, active)}
      <main class="flex-1 overflow-y-auto ${fab ? "pb-20 @tab:pb-0" : ""}">${allowed ? body : denied(ctx, sc)}</main>
      ${fab && allowed ? `<button type="button" class="@tab:hidden absolute right-4 bottom-20 btn btn-primary h-touch px-4 shadow-lg" data-need="write"${fabOpen ? ` data-open="${fabOpen}"` : ""}>${fab}</button>` : ""}
      <nav class="@tab:hidden shrink-0 flex border-t border-border bg-card" aria-label="Groups">${NAV.map(
        (g) => {
          const pages = pagesOf(ctx, g);
          return pages.length
            ? `<a ${link(pages[0][0])} data-grp="${g[0]}" class="flex-1 flex flex-col items-center justify-center gap-0.5 h-header text-caption ${g === grp ? "text-secondary-foreground font-medium" : "text-muted-foreground"}">${I(GROUP_LUCIDE[g[0]])}${g[0]}</a>`
            : "";
        }
      ).join("")}</nav>
    </div>
    ${allowed ? dialogs : ""}
    ${helpDialog()}${searchDialog()}
  </div>`;
}

/* Phone / tablet search: the same search as the web header box. */
const searchDialog = () =>
  `<div class="dlg" data-dialog="global-search" role="dialog" aria-modal="true" aria-labelledby="gs-t"><div class="dlg-panel"><div class="grab"></div><div class="flex items-center"><h2 id="gs-t" class="text-title font-semibold">Search</h2><button type="button" class="ml-auto btn btn-ghost btn-sm btn-icon" data-close aria-label="Close">${I("x")}</button></div>
  <label class="mt-3 field">${I("search", "size-icon text-muted-foreground")}<input type="search" class="min-w-0 flex-1 bg-transparent outline-none" placeholder="Customers, leads, invoices" data-global-search aria-label="Search customers, leads, invoices" /></label><p class="hint">Type two letters or more; pick a result.</p></div></div>`;
const helpDialog = () =>
  `<div class="dlg" data-dialog="help" role="dialog" aria-modal="true" aria-labelledby="help-t"><div class="dlg-panel"><div class="grab"></div><div class="flex items-center"><h2 id="help-t" class="text-title font-semibold">Help</h2><button type="button" class="ml-auto btn btn-ghost btn-sm btn-icon" data-close aria-label="Close">${I("x")}</button></div>
  <p class="mt-2 text-muted-foreground">This is a working prototype. Everything you do is kept in this browser tab only. Use <b>Tools</b> in the top bar to reset, export or import the data, see the activity log, or read the outbox (messages are never really sent).</p></div></div>`;

/* ---------- customer pages: business slots + fixed customer neutrals, Inter (D34), touch sizes ---------- */
export const cHeader = (ctx, back = "") =>
  `<header class="sticky top-0 z-10 bg-customer-page border-b border-customer-border"><div class="mx-auto max-w-5xl flex items-center gap-3 h-header px-4">
  ${back ? `<a ${link(back)} class="text-customer-muted" aria-label="Back">${I("chevron-left")}</a>` : ""}<a ${link("p-catalog")} aria-label="${esc(ctx.s.workspace.name)} home">${bizLogo(ctx.s, "h-6")}</a>
  <nav class="hidden @web:flex items-center gap-6 ml-8 text-body text-customer-muted"><a ${link("p-catalog")} class="text-customer-text font-medium">Services</a><a ${link("p-catalog", { tab: "packages" })}>Packages</a><a ${link("p-request")}>Request a quote</a></nav>
  <a href="tel:${esc(ctx.s.workspace.phone)}" class="ml-auto inline-flex items-center gap-2 h-touch px-3 rounded-sm bg-biz-soft text-biz font-medium" aria-label="Call">${I("phone")}<span class="hidden @tab:inline money">${esc(ctx.s.workspace.phone)}</span></a></div></header>`;
/* D78: on customer pages Biz4Kit appears only as this footer line. */
export const madeWith = `<p class="py-6 text-center text-caption text-customer-muted">Made with Biz4Kit</p>`;
export const cust = (inner, bar = "") =>
  `<div class="h-full flex flex-col font-customer bg-customer-page text-customer-text"><div class="flex-1 min-h-0 overflow-y-auto">${inner}</div>${bar}</div>`;
export const cBar = (b) =>
  `<div class="@web:hidden shrink-0 p-3 bg-customer-page border-t border-customer-border">${b}</div>`;

/* ---------- onboarding (Biz4Kit chrome) ---------- */
const STEPS = ["Workspace", "Brand", "Details", "Catalog", "Team"];
export function onboard(step, body, aside = "") {
  return `<div class="h-full flex flex-col bg-background">
    <div class="h-header shrink-0 flex items-center gap-4 px-4 @tab:px-page border-b border-border">${lockup("h-5")}
      <ol class="hidden @tab:flex mx-auto items-center gap-2">${STEPS.map(
        (s, i) => `<li class="flex items-center gap-2">
        <span class="flex items-center justify-center size-control-xs rounded-pill text-caption font-semibold ${i < step ? "bg-success-soft text-success" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}">${i < step ? I("check", "size-icon-sm") : i + 1}</span>
        <span class="hidden @web:inline ${i === step ? "font-medium" : "text-muted-foreground"}">${s}</span>${i < 4 ? '<span class="w-4 @web:w-6 h-px bg-border"></span>' : ""}</li>`
      ).join("")}</ol>
      <span class="@tab:hidden ml-auto text-caption text-muted-foreground">Step ${step + 1} of 5</span>
      <span class="hidden @web:inline text-caption text-muted-foreground">Saved. Close any time and come back.</span>
    </div>
    <div class="@tab:hidden h-1 bg-muted"><div class="h-full bg-primary" style="width:${(step + 1) * 20}%"></div></div>
    <div class="flex-1 min-h-0 flex">
      <div class="ob-body flex-1 overflow-y-auto px-4 py-6 @tab:px-12 @tab:py-10">${body}</div>
      ${aside ? `<div class="hidden @web:block w-96 shrink-0 bg-muted border-l border-border p-page overflow-y-auto">${aside}</div>` : ""}
    </div>
  </div>`;
}
export const display = (t, s) =>
  `<div class="text-center"><h1 class="font-serif text-heading @tab:text-display-lg font-bold">${t}</h1><p class="mt-2 text-body text-muted-foreground">${s}</p></div>`;

export { SCREENS, fmtTime };
