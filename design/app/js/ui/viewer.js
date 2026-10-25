import { biz } from "../biz/index.js";
import { ROLES } from "../biz/perms.js";
/* The viewer: top bar (screen, role, device, theme, brand, tools), router, render loop and every event
   inside a screen. Screens only return HTML; this file makes it work. */
import * as store from "../core/store.js";
import { byId, esc, inr, fmtDate } from "../core/util.js";
import { formArgs, dataArgs, run } from "./actions.js";
import { I, C } from "./kit.js";
import { SCREENS, screenById } from "./registry.js";
import { canSee } from "./shell.js";

const $ = (id) => document.getElementById(id);
const stage = $("stage");

/* Sample business brands for the viewer (as the theme generator would emit them), plus the business's own. */
const NEAR = "oklch(0.1288 0.0219 314.0129)";
const BRANDS = {
  rose: {
    name: "Rose",
    l: ["#9f1239", "#ffffff", "#fff1f2"],
    d: ["#fb7185", NEAR, "#3b0d1a"],
    acc: "#f59e0b",
  },
  teal: {
    name: "Teal",
    l: ["#0f766e", "#ffffff", "#f0fdfa"],
    d: ["#2dd4bf", NEAR, "#042f2e"],
    acc: "#f59e0b",
  },
  violet: {
    name: "Violet",
    l: ["#6d28d9", "#ffffff", "#f5f3ff"],
    d: ["#a78bfa", NEAR, "#2e1065"],
    acc: "#f472b6",
  },
  orange: {
    name: "Orange",
    l: ["#c2410c", "#ffffff", "#fff7ed"],
    d: ["#fb923c", NEAR, "#431407"],
    acc: "#0ea5e9",
  },
};
const ownBrand = (s) => {
  const p = s.workspace.brand?.primary || "#9f1239";
  return {
    name: "Own",
    l: [p, "#ffffff", `color-mix(in oklch, ${p} 8%, white)`],
    d: [
      `color-mix(in oklch, ${p} 55%, white)`,
      NEAR,
      `color-mix(in oklch, ${p} 30%, black)`,
    ],
    acc: s.workspace.brand?.accent || "#f59e0b",
  };
};

export const st = {
  id: "dashboard",
  params: {},
  device: "web",
  theme: "light",
  brand: "own",
  role: "owner",
  state: 0,
};
const uiBy = {};
const navState = (() => {
  try {
    return JSON.parse(sessionStorage.getItem("b4k-nav")) || {};
  } catch {
    return {};
  }
})();
const saveNav = () => {
  try {
    sessionStorage.setItem("b4k-nav", JSON.stringify(navState));
  } catch {}
};
let seenOutbox = 0;
export let checking = false;
export const setChecking = (v) => (checking = v);

/* ---------- context passed to screens ---------- */
const uiKey = () => `${st.id}|${st.params.id || ""}`;
export function makeCtx(
  s = store.get(),
  id = st.id,
  role = st.role,
  params = st.params,
  ui = (uiBy[`${id}|${params.id || ""}`] ??= {})
) {
  const memberId = s.meta.people?.[role] || null;
  const me = memberId ? byId(s.members, memberId) : null;
  const sc = screenById(id);
  return {
    s,
    role,
    memberId,
    me,
    today: s.meta.today,
    params,
    ui,
    nav: navState,
    screen: sc,
    customer: sc?.area === "Portal",
    counts: {
      leads: biz.leads.toAnswer(s).length,
      overdue: biz.sel.overdue(s).length,
      approvals: biz.payments.pending(s).length,
      inbox: Math.max(0, s.outbox.length - seenOutbox),
    },
    biz,
    /* Sign-in screens switch who is viewing. */
    setRole: (r) => (st.role = r),
  };
}
const actCtx = (ctx) => ({
  role: ctx.role,
  memberId: ctx.memberId,
  customer: ctx.customer,
});

/* ---------- hash ---------- */
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (screenById(p.get("screen"))) st.id = p.get("screen");
  if (["mob", "tab", "web"].includes(p.get("device")))
    st.device = p.get("device");
  st.theme = ["light", "dark"].includes(p.get("theme"))
    ? p.get("theme")
    : matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  if (BRANDS[p.get("brand")] || p.get("brand") === "own")
    st.brand = p.get("brand");
  if (ROLES[p.get("role")]) st.role = p.get("role");
  st.state = +p.get("state") || 0;
  st.params = {};
  for (const [k, v] of p)
    if (
      ![
        "screen",
        "device",
        "theme",
        "brand",
        "role",
        "state",
        "check",
      ].includes(k)
    )
      st.params[k] = v;
}
const hashOf = () =>
  `#screen=${st.id}${Object.entries(st.params)
    .map(([k, v]) => `&${k}=${encodeURIComponent(v)}`)
    .join(
      ""
    )}&device=${st.device}&theme=${st.theme}&brand=${st.brand}&state=${st.state}&role=${st.role}`;

/* ---------- render ---------- */
export function renderScreen(ctx) {
  const sc = ctx.screen;
  const states = sc.states || null;
  if (states) return states[Math.min(st.state, states.length - 1)][1](ctx);
  return sc.render(ctx);
}

let openDlg = null;
export function render(push = false) {
  const s = store.get();
  biz.leads.wake(s);
  const sc = screenById(st.id) || SCREENS[0];
  st.id = sc.id;
  const ctx = makeCtx(s);
  const focus = rememberFocus();
  let html;
  try {
    html = renderScreen(ctx);
  } catch (e) {
    console.error(e);
    html = `<div class="p-page text-destructive"><p class="font-semibold">This screen failed to render.</p><pre class="mt-2 text-caption whitespace-pre-wrap">${esc(e.stack || e.message)}</pre></div>`;
  }
  const b = st.brand === "own" ? ownBrand(s) : BRANDS[st.brand];
  const cur = st.theme === "dark" ? b.d : b.l;
  const vars = `--biz:${cur[0]};--biz-foreground:${cur[1]};--biz-soft:${cur[2]};--biz-accent:${b.acc};--biz-l:${b.l[0]};--biz-l-fg:${b.l[1]};--biz-l-soft:${b.l[2]}`;
  document.documentElement.classList.toggle("dark", st.theme === "dark");
  const frame =
    st.device === "web"
      ? "w-full h-full"
      : `dev ${st.device === "tab" ? "dev-tab" : "dev-mob"} rounded-xl border border-border shadow-lg overflow-hidden`;
  stage.innerHTML = `<div class="@container ${frame} bg-background" style="${vars}">${html}</div>`;
  topBar(ctx);
  if (!checking)
    history[push ? "pushState" : "replaceState"](null, "", hashOf());
  applyRole(ctx);
  if (openDlg)
    stage.querySelector(`[data-dialog="${openDlg}"]`)?.classList.add("open");
  if (window.lucide) lucide.createIcons();
  if (!checking) {
    wireDrag(ctx);
    restoreFocus(focus);
  }
}

/* Buttons tagged data-need stay only for roles that may use them; Super-admin sees them disabled. */
function applyRole(ctx) {
  for (const el of stage.querySelectorAll("[data-app] [data-need]")) {
    if (ctx.role === "superadmin") {
      el.setAttribute("aria-disabled", "true");
      if ("disabled" in el) el.disabled = true;
      el.title = "Support view is read-only";
      el.classList.add("opacity-50", "cursor-not-allowed");
    } else if (!biz.perms.can(ctx.role, el.dataset.need)) el.remove();
  }
}

function topBar(ctx) {
  const sc = ctx.screen;
  $("pick").innerHTML = [...new Set(SCREENS.map((x) => x.area))]
    .map(
      (a) =>
        `<optgroup label="${a}">${SCREENS.map((x, i) => (x.area === a ? `<option value="${x.id}">${String(i + 1).padStart(2, "0")}  ${esc(x.name)}</option>` : "")).join("")}</optgroup>`
    )
    .join("");
  $("pick").value = sc.id;
  const states = sc.states || null;
  $("states").innerHTML = states
    ? states
        .map(
          (x, i) =>
            `<button data-i="${i}" class="${i === st.state ? "on" : ""}">${x[0]}</button>`
        )
        .join("")
    : "";
  $("states").style.display = states ? "" : "none";
  $("brands").innerHTML = [["own", ownBrand(ctx.s)], ...Object.entries(BRANDS)]
    .map(
      ([k, b]) =>
        `<button data-v="${k}" class="${st.brand === k ? "on" : ""}" title="${k === "own" ? "The business's own brand (Settings → Brand)" : `Sample brand: ${b.name}`}"><span class="size-3 rounded-pill" style="background:${b.l[0]}"></span>${b.name}</button>`
    )
    .join("");
  for (const [id, key] of [
    ["devices", "device"],
    ["themes", "theme"],
  ])
    for (const x of $(id).querySelectorAll("button"))
      x.classList.toggle("on", x.dataset.v === st[key]);
  $("role").value = st.role;
  const i = SCREENS.indexOf(sc);
  $("info").innerHTML =
    `<span class="code text-foreground">${String(i + 1).padStart(2, "0")}/${SCREENS.length}</span><span class="font-medium text-foreground">${esc(sc.name)}</span><span class="chip">${esc(sc.area)}</span><span class="chip">${I("user", "size-icon-sm")}${ROLES[st.role]}</span><span class="code">${esc(sc.route)}</span><span>·</span><span>Primary: <span class="text-foreground">${esc(sc.action)}</span></span><span>·</span><span>Who: <span class="text-foreground">${esc(sc.who)}</span></span><span>·</span><span>${esc(sc.notes || "")}</span>`;
}

/* Keep the caret in a search box or form field across a re-render. */
function rememberFocus() {
  const a = document.activeElement;
  if (!a || !stage.contains(a) || !("value" in a)) return null;
  return {
    name: a.name,
    ui: a.dataset.ui,
    form: a.form?.dataset.draft,
    start: a.selectionStart,
    end: a.selectionEnd,
  };
}
function restoreFocus(f) {
  if (!f) return;
  const sel = f.ui
    ? `[data-ui="${f.ui}"]`
    : f.name
      ? `${f.form ? `form[data-draft="${f.form}"] ` : ""}[name="${CSS.escape(f.name)}"]`
      : null;
  const el = sel && stage.querySelector(sel);
  if (!el) return;
  el.focus();
  try {
    el.setSelectionRange(f.start, f.end);
  } catch {}
}

/* ---------- navigation ---------- */
export function open(id, params = {}, push = true) {
  if (!screenById(id)) return;
  st.id = id;
  st.params = params;
  st.state = 0;
  openDlg = null;
  render(push);
  stage.scrollTop = 0;
}
const go = (d) => {
  const i = SCREENS.findIndex((x) => x.id === st.id);
  open(SCREENS[(i + d + SCREENS.length) % SCREENS.length].id, {}, false);
};
const paramsOf = (el) => {
  const p = {};
  for (const [k, v] of Object.entries(el.dataset))
    if (k.startsWith("p") && k.length > 1 && k[1] === k[1].toUpperCase())
      p[k[1].toLowerCase() + k.slice(2)] = v;
  return p;
};

/* ---------- dialogs ---------- */
let opener = null;
function openDialog(id, from) {
  const d = stage.querySelector(`[data-dialog="${id}"]`);
  if (!d) return toast(`No dialog "${id}" on this screen.`, "bad");
  opener = from;
  openDlg = id;
  for (const x of stage.querySelectorAll(".dlg.open"))
    x.classList.remove("open");
  d.classList.add("open");
  (
    d.querySelector("input:not([type=hidden]),select,textarea") ||
    d.querySelector("[data-close]")
  )?.focus();
}
function closeDialogs() {
  for (const d of stage.querySelectorAll(".dlg.open"))
    d.classList.remove("open");
  openDlg = null;
  opener?.focus?.();
  opener = null;
}
const closeMenus = (keep = null) => {
  for (const d of document.querySelectorAll(
    "details[data-menu][open], details#tools[open]"
  ))
    if (d !== keep && !d.contains(keep)) d.removeAttribute("open");
};

/* ---------- toasts ---------- */
export function toast(text, tone = "ok") {
  if (checking) return;
  const t = document.createElement("div");
  t.className = `pointer-events-auto max-w-md rounded-control px-4 py-2.5 shadow-lg text-body-sm flex items-start gap-2 ${tone === "bad" ? "bg-destructive text-destructive-foreground" : tone === "warn" ? "bg-warning text-warning-foreground" : "bg-foreground text-background"}`;
  t.innerHTML = `${I(tone === "bad" ? "circle-x" : tone === "warn" ? "triangle-alert" : "circle-check", "size-icon-sm mt-0.5")}<span>${esc(text)}</span>`;
  $("toasts").append(t);
  lucide.createIcons({ nodes: [t] });
  setTimeout(() => t.remove(), tone === "bad" ? 6000 : 3500);
}

/* ---------- actions ---------- */
function doAction(name, args, el) {
  const ctx = makeCtx();
  const out = run(
    name,
    args,
    actCtx(ctx),
    ctx.screen.actions ? wrapHandlers(ctx) : {}
  );
  if (!out.ok) {
    toast(out.error, "bad");
    render();
    return out;
  }
  const v = out.value || {};
  const keepOpen =
    el?.closest("form")?.dataset.keepOpen !== undefined ||
    el?.dataset.keepOpen !== undefined;
  if (!keepOpen) openDlg = null;
  /* data-then-open="dialog" on the button: open a follow-up dialog for the new record (ui["dialog:id"]). */
  if (el?.dataset.thenOpen) {
    makeCtx().ui[`${el.dataset.thenOpen}:id`] = v.recordId || "";
    openDlg = el.dataset.thenOpen;
  }
  const form = el?.closest("form");
  if (form?.dataset.draft) delete makeCtx().ui[form.dataset.draft];
  /* messages.send returns the outbox record itself */
  const sent = v.message || (v.channel && "body" in v ? v : null);
  if (sent && sent.channel !== "email")
    copy(
      sent.body,
      `${sent.channel === "sms" ? "SMS" : "WhatsApp"} text copied. Paste it in the app.`
    );
  else
    toast(
      v.text || (sent ? `Email sent to ${sent.to || "the customer"}` : "Done")
    );
  if (v.warning) toast(v.warning, "warn");
  const goTo = el?.dataset.after || form?.dataset.after;
  if (v.go) return (open(v.go[0], v.go[1] || {}), out);
  if (goTo) return (open(goTo, { id: v.recordId || st.params.id || "" }), out);
  render();
  return out;
}
/* Screen handlers get (args, actCtx) and may use ctx.call(label, fn). */
const wrapHandlers = (ctx) =>
  Object.fromEntries(
    Object.entries(ctx.screen.actions).map(([k, f]) => [
      k,
      (args, a) => f({ ...ctx, ...a }, args),
    ])
  );

function copy(text, msg = "Copied") {
  navigator.clipboard?.writeText(text).then(
    () => toast(msg),
    () =>
      toast("Copy blocked by the browser. Select the text and copy it.", "warn")
  );
}

/* ---------- drag and drop (SortableJS): lists with data-sortable, board columns with data-board-col ---------- */
function wireDrag(ctx) {
  if (!window.Sortable) return;
  const ro = ctx.role === "superadmin" || ctx.role === "accountant";
  for (const list of stage.querySelectorAll("[data-sortable]")) {
    Sortable.create(list, {
      handle: "[data-handle]",
      animation: 150,
      disabled: ro,
      onEnd: () =>
        doAction(
          list.dataset.sortable,
          {
            ...dataArgs(list),
            ids: [...list.children].map((c) => c.dataset.id).filter(Boolean),
          },
          list
        ),
    });
  }
  for (const col of stage.querySelectorAll("[data-board-col]")) {
    Sortable.create(col, {
      group: "board",
      animation: 150,
      disabled: ro,
      sort: false,
      draggable: "[data-card]",
      onAdd: (e) =>
        doAction(
          "board.move",
          { id: e.item.dataset.card, to: col.dataset.boardCol },
          col
        ),
    });
  }
}

/* ---------- tester tools ---------- */
function panel(title, body) {
  const p = $("panel");
  p.hidden = false;
  p.innerHTML = `<div class="flex items-center gap-2 h-header px-4 border-b border-border">${I("panel-right", "size-icon")}<h2 class="text-title font-semibold">${title}</h2><button class="ml-auto btn btn-ghost btn-sm btn-icon" data-x aria-label="Close">${I("x")}</button></div><div class="flex-1 overflow-y-auto p-4 space-y-2">${body}</div>`;
  p.querySelector("[data-x]").onclick = () => (p.hidden = true);
  lucide.createIcons({ nodes: [p] });
}
function tool(name) {
  const s = store.get();
  if (name === "reset") {
    if (
      !confirm(
        "Reset all data in this tab to the default sample? Your changes are lost."
      )
    )
      return;
    store.reset();
    for (const k of Object.keys(uiBy)) delete uiBy[k];
    seenOutbox = 0;
    toast("Data reset to the default sample.");
    return render();
  }
  if (name === "export") {
    const blob = new Blob([store.exportJSON()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `biz4kit-data-${s.meta.today}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    return toast("Data exported.");
  }
  if (name === "log")
    return panel(
      "Activity log",
      s.activity.length
        ? s.activity
            .map(
              (a) =>
                `<div class="rounded-control border border-border p-2.5"><div class="flex gap-2 text-caption text-muted-foreground"><span class="code">${esc(a.at.replace("T", " "))}</span><span>${esc(byId(s.members, a.by)?.name || "Customer / system")}</span><span class="ml-auto">${esc(a.action)}</span></div><p class="mt-1">${esc(a.text)}</p>${a.recordId ? `<p class="text-caption">${C(a.recordId)}</p>` : ""}</div>`
            )
            .join("")
        : `<p class="text-muted-foreground">Nothing yet. Every change you make is listed here.</p>`
    );
  if (name === "outbox") {
    seenOutbox = s.outbox.length;
    render();
    return panel(
      "Outbox (simulated)",
      `<p class="hint">Nothing leaves the browser. Email is shown as sent by ${esc(s.workspace.name)} (D35); SMS and WhatsApp were copied for you to paste (D67).</p>${
        s.outbox.length
          ? s.outbox
              .map(
                (m) =>
                  `<div class="rounded-control border border-border p-2.5"><div class="flex flex-wrap items-center gap-2 text-caption text-muted-foreground"><span class="chip">${m.channel === "email" ? "Email · sent" : m.channel === "sms" ? "SMS · copied" : "WhatsApp · copied"}</span><span>to ${esc(m.to || "—")}</span><span class="ml-auto code">${esc(m.at.replace("T", " "))}</span></div>${m.subject && m.channel === "email" ? `<p class="mt-1 font-medium">${esc(m.subject)}</p>` : ""}<p class="mt-1 whitespace-pre-line">${esc(m.body)}</p><button class="mt-1 btn btn-ghost btn-sm" data-copy-text="${esc(m.body)}">${I("copy", "size-icon-sm")}Copy</button></div>`
              )
              .join("")
          : `<p class="text-muted-foreground">No messages yet.</p>`
      }`
    );
  }
}

/* ---------- global search (header) ---------- */
function globalResults(q) {
  const s = store.get();
  q = q.trim().toLowerCase();
  if (q.length < 2) return [];
  const hit = (t) =>
    String(t || "")
      .toLowerCase()
      .includes(q);
  return [
    ...s.customers
      .filter((c) => hit(c.name) || hit(c.phone))
      .map((c) => ["customer", { id: c.id }, c.name, c.phone, "user"]),
    ...s.leads
      .filter((l) => hit(byId(s.customers, l.customerId)?.name) || hit(l.brief))
      .map((l) => [
        "lead",
        { id: l.id },
        byId(s.customers, l.customerId)?.name,
        l.brief,
        "inbox",
      ]),
    ...s.invoices
      .filter(
        (i) =>
          hit(i.piNumber) ||
          hit(i.invNumber) ||
          hit(byId(s.customers, i.customerId)?.name)
      )
      .map((i) => [
        "invoice",
        { id: i.id },
        i.invNumber || i.piNumber || "Draft",
        byId(s.customers, i.customerId)?.name,
        "receipt",
      ]),
    /* serial numbers (D85): scan or type one to find the invoice */
    ...(biz.serials.on(s)
      ? biz.serials
          .find(s, q)
          .filter((r) => r.line.serial)
          .map((r) => [
            "invoice",
            { id: r.inv.id },
            r.line.serial,
            `${r.line.name} · ${r.customer?.name || ""}`,
            "scan-barcode",
          ])
      : []),
  ].slice(0, 8);
}
function showGlobal(input) {
  let box = $("gsearch");
  const res = globalResults(input.value);
  if (!res.length) return box?.remove();
  if (!box) {
    box = document.createElement("div");
    box.id = "gsearch";
    box.className = "menu w-80 fixed z-50";
    document.body.append(box);
  }
  const r = input.getBoundingClientRect();
  box.style.left = `${r.left}px`;
  box.style.top = `${r.bottom + 4}px`;
  box.innerHTML = res
    .map(
      ([id, p, t, sub, ic]) =>
        `<a href="#" data-gs="${id}" data-gs-id="${p.id}">${I(ic, "size-icon-sm")}<span class="truncate">${esc(t)}</span><span class="ml-auto text-caption text-muted-foreground truncate">${esc(sub || "")}</span></a>`
    )
    .join("");
  lucide.createIcons({ nodes: [box] });
}

/* ---------- events ---------- */
let typing = null;
export function start() {
  readHash();
  $("role").innerHTML = Object.entries(ROLES)
    .map(([k, v]) => `<option value="${k}">${v}</option>`)
    .join("");
  $("role").onchange = (e) => {
    st.role = e.target.value;
    render();
  };
  $("prev").onclick = () => go(-1);
  $("next").onclick = () => go(1);
  $("pick").onchange = (e) => open(e.target.value, {}, false);
  $("states").onclick = (e) => {
    const b = e.target.closest("button");
    if (b) {
      st.state = +b.dataset.i;
      render();
    }
  };
  for (const [id, key] of [
    ["devices", "device"],
    ["themes", "theme"],
    ["brands", "brand"],
  ])
    $(id).onclick = (e) => {
      const b = e.target.closest("button");
      if (b) {
        st[key] = b.dataset.v;
        render();
      }
    };
  $("tools").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tool]");
    if (b) {
      $("tools").removeAttribute("open");
      tool(b.dataset.tool);
    }
  });
  $("import").onchange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      store.importJSON(await f.text());
      toast(`Imported ${f.name}.`);
      render();
    } catch (err) {
      toast(err.message, "bad");
    }
    e.target.value = "";
    $("tools").removeAttribute("open");
  };
  addEventListener("popstate", () => {
    readHash();
    render();
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenus();
      $("gsearch")?.remove();
      if (openDlg) closeDialogs();
      return;
    }
    if (["SELECT", "INPUT", "TEXTAREA"].includes(e.target.tagName) || openDlg)
      return;
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  });
  document.addEventListener("click", (e) => {
    const gs = e.target.closest("[data-gs]");
    if (gs) {
      e.preventDefault();
      $("gsearch")?.remove();
      return open(gs.dataset.gs, { id: gs.dataset.gsId });
    }
    const cp = e.target.closest("[data-copy-text]");
    if (cp) return copy(cp.dataset.copyText);
    if (!e.target.closest("#gsearch, [data-global-search]"))
      $("gsearch")?.remove();
    if (!e.target.closest("details[data-menu], details#tools")) closeMenus();
  });

  stage.addEventListener("click", (e) => {
    const t = e.target;
    if (t.closest('[aria-disabled="true"]')) return e.preventDefault();
    if (t.classList.contains("dlg")) return closeDialogs();
    closeMenus(t.closest("details[data-menu]"));
    if (t.closest("label, input, select, textarea") && !t.closest("button, a"))
      return;
    const el = t.closest(
      "[data-go], [data-open], [data-close], [data-act], [data-do], [data-ui], [data-copy], [data-tool], a, button"
    );
    if (!el) return;
    /* Real links (tel:, mailto:, upi://, https://, downloads) keep their normal behaviour. */
    const href = el.tagName === "A" ? el.getAttribute("href") || "" : "";
    if (href && !href.startsWith("#") && !Object.keys(el.dataset).some((k) => ["go", "open", "do", "act", "close", "copy", "tool", "ui"].includes(k))) return;
    if (el.tagName === "A" || (el.tagName === "BUTTON" && el.type !== "submit"))
      e.preventDefault();
    if (t.closest("[data-stop]") && !el.closest("[data-stop]")) return;
    const d = el.dataset;
    if ("tool" in d) return tool(d.tool);
    if ("go" in d) {
      if (d.navOpen) navState[d.navOpen] = true;
      open(d.go, paramsOf(el));
      if (d.then) openDialog(d.then, null);
      return;
    }
    if ("open" in d) {
      if (d.openArgs) Object.assign(makeCtx().ui, JSON.parse(d.openArgs));
      if (d.openArgs) render();
      return openDialog(d.open, el);
    }
    if ("close" in d) return closeDialogs();
    if ("copy" in d) {
      const src = d.copy
        ? stage.querySelector(d.copy)
        : el
            .closest(".dlg-panel, [data-copy-scope]")
            ?.querySelector("[data-msg]");
      return copy(src?.innerText || "", "Copied");
    }
    if ("ui" in d && "v" in d) {
      const ui = makeCtx().ui;
      ui[d.ui] = d.v;
      if (!d.ui.endsWith(":pg"))
        for (const k of Object.keys(ui))
          if (k.endsWith(":pg") && d.ui.startsWith(k.split(":")[0])) ui[k] = 1;
      return render();
    }
    if (d.act === "theme") {
      st.theme = st.theme === "dark" ? "light" : "dark";
      return render();
    }
    if (d.act === "sidebar") {
      navState.sidebar = !el.closest(".sb").classList.toggle("is-collapsed");
      return saveNav();
    }
    if (d.act === "nav-toggle") {
      const g = d.grp;
      const wasOpen = el.getAttribute("aria-expanded") === "true";
      navState[g] = !wasOpen;
      saveNav();
      return render();
    }
    if ("do" in d && el.type !== "submit")
      return doAction(d.do, dataArgs(el), el);
  });

  stage.addEventListener("submit", (e) => {
    const f = e.target.closest("form[data-do]");
    if (!f) return;
    e.preventDefault();
    doAction(
      f.dataset.do,
      {
        ...dataArgs(f),
        ...formArgs(f),
        ...(e.submitter?.name ? { [e.submitter.name]: e.submitter.value } : {}),
      },
      e.submitter || f
    );
  });

  stage.addEventListener("input", (e) => {
    const el = e.target;
    if (el.matches("[data-global-search]")) return showGlobal(el);
    if (el.dataset.ui && el.type === "search") {
      clearTimeout(typing);
      typing = setTimeout(() => {
        const ui = makeCtx().ui;
        ui[el.dataset.ui] = el.value;
        ui[`${el.dataset.ui.split(":")[0]}:pg`] = 1;
        render();
      }, 200);
      return;
    }
    const form = el.closest("form[data-draft]");
    if (form && !el.matches("[type=file]")) {
      clearTimeout(typing);
      typing = setTimeout(() => {
        makeCtx().ui[form.dataset.draft] = formArgs(form);
        render();
      }, 250);
    }
  });

  stage.addEventListener("change", (e) => {
    const el = e.target;
    if (el.matches("[data-toggle]"))
      el.nextElementSibling?.classList.toggle("on", el.checked);
    if (el.matches("[data-check]")) {
      const box = el.nextElementSibling;
      box.classList.toggle("bg-primary", el.checked);
      box.classList.toggle("border-primary", el.checked);
      box.classList.toggle("text-primary-foreground", el.checked);
      box.innerHTML = el.checked
        ? `<i data-lucide="check" class="size-3 shrink-0"></i>`
        : "";
      lucide.createIcons({ nodes: [box] });
    }
    if (el.matches("[data-radio]"))
      for (const l of el.closest(".seg").children)
        l.classList.toggle("on", l.contains(el) && el.checked);
    const ui = makeCtx().ui;
    if (el.dataset.pick) {
      const k = `${el.dataset.pick}:sel`;
      const set = new Set(ui[k] || []);
      el.checked ? set.add(el.dataset.id) : set.delete(el.dataset.id);
      ui[k] = [...set];
      return render();
    }
    if (el.dataset.pickAll) {
      const k = `${el.dataset.pickAll}:sel`;
      const ids = [
        ...stage.querySelectorAll(`[data-pick="${el.dataset.pickAll}"]`),
      ].map((x) => x.dataset.id);
      ui[k] = el.checked ? ids : [];
      return render();
    }
    if (el.tagName === "SELECT" && el.dataset.ui) {
      ui[el.dataset.ui] = el.value;
      if (!el.dataset.ui.endsWith(":pg"))
        ui[`${el.dataset.ui.split(":")[0]}:pg`] = 1;
      return render();
    }
    if (el.type === "file" && el.dataset.preview) {
      const f = el.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        el.dataset.url = r.result;
        const out = stage.querySelector(el.dataset.preview);
        if (out)
          out.textContent = `${f.name} · ${Math.round(f.size / 1024)} KB`;
      };
      r.readAsDataURL(f);
    }
    const form = el.closest("form[data-draft]");
    if (
      form &&
      (el.tagName === "SELECT" ||
        el.type === "checkbox" ||
        el.type === "radio" ||
        el.type === "date")
    ) {
      ui[form.dataset.draft] = formArgs(form);
      render();
    }
    const auto = el.closest("form[data-autosubmit]");
    if (auto) auto.requestSubmit();
  });
  store.subscribe(() => {});
  render();
}

export { inr, fmtDate };
