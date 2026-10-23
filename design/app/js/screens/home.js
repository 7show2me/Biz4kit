/* HOME: Today (every role), Board and Reports. Same look as design/screens-v2.html (n9, n10, n28); every
   figure comes from the business layer (biz.sel, biz.leads, biz.board), so the same number shows the same
   on every page (D77: money in only). */
import { SOURCES, isHigh } from "../biz/leads.js";
import { METHODS } from "../biz/payments.js";
import * as store from "../core/store.js";
import {
  BizError,
  addDays,
  ago,
  byId,
  daysBetween,
  fmtDate,
  fmtLong,
  fmtTime,
  initials,
  sum,
} from "../core/util.js";
import { run } from "../ui/actions.js";
import {
  I,
  C,
  M,
  av,
  chip,
  dataTable,
  esc,
  inr,
  kpis,
  link,
  page,
  pill,
  seg,
  toolbar,
  uiv, bookingPill
} from "../ui/kit.js";
import { app } from "../ui/shell.js";
import { checking } from "../ui/viewer.js";
import { shareCatalogDialog } from "./catalog.js";
import { newInvoiceDialogs } from "./payments.js";

/* ---------- small helpers ---------- */
const day = (stamp) => String(stamp || "").slice(0, 10);
const dm = (iso) => fmtLong(iso).replace(/ \d{4}$/, "");
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const first = (n) => String(n || "").split(" ")[0];
const custName = (s, id) => byId(s.customers, id)?.name || "Customer";
const memberName = (s, id) => byId(s.members, id)?.name || "";
const who = (n) =>
  n
    ? `<span class="flex items-center gap-2">${av(initials(n))}${esc(n)}</span>`
    : `<span class="text-muted-foreground">Not assigned</span>`;
const name = (x) => `<span class="font-medium">${esc(x)}</span>`;
const typeChip = (t) =>
  t === "booked"
    ? chip("Booked", "calendar-check")
    : chip("Quoted", "indian-rupee");
const dot = (c) => `<span class="size-2 rounded-pill ${c}"></span>`;
const short = (v) =>
  v >= 100_000
    ? `₹${(v / 100_000).toFixed(2)}L`
    : v >= 1000
      ? `₹${Math.round(v / 1000)}k`
      : inr(v);
const LIVE_BOOKING = (b) => !["cancelled", "no_show"].includes(b.status);
const approvedIn = (s, from, to) =>
  s.payments.filter(
    (p) =>
      p.status === "approved" &&
      p.decidedAt &&
      day(p.decidedAt) > from &&
      day(p.decidedAt) <= to
  );
const methodName = (m) => METHODS[m] || "Not recorded";
const METHOD_TONE = [
  ["text-chart-1", "bg-chart-1"],
  ["text-teal", "bg-teal"],
  ["text-violet", "bg-violet"],
  ["text-muted-foreground", "bg-muted-foreground"],
];
const waitDays = (n) => (n <= 0 ? "today" : plural(n, "day"));
const change = (now, prev) =>
  prev ? Math.round(((now - prev) / prev) * 1000) / 10 : null;
const trend = (c, upGood = true) =>
  c === null
    ? { tone: "text-muted-foreground", icon2: "" }
    : {
        tone:
          c >= 0 === upGood ? "text-success" : c === 0 ? "" : "text-warning",
        icon2: c >= 0 ? "trending-up" : "trending-down",
      };

/* ---------- charts (no library, same markup as v2) ---------- */
const smooth = (pts) => {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i],
      p1 = pts[i],
      p2 = pts[i + 1],
      p3 = pts[i + 2] || p2;
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
};
const areaChart = (series, labels, { unit = "", h = "h-64" } = {}) => {
  const W = 1000,
    H = 300;
  const max = Math.max(1, ...series.flatMap((x) => x.values)) * 1.15;
  const fmt = (v) =>
    unit === "₹" ? `₹${Math.round(v / 1000)}k` : String(Math.round(v));
  const paths = series
    .map((x) => {
      const pts = x.values.map((v, i) => [
        Math.round((i / Math.max(1, x.values.length - 1)) * W),
        Math.round(H - (v / max) * H),
      ]);
      const line = smooth(pts);
      return `<path d="${line} L${W},${H} L0,${H} Z" fill="currentColor" class="${x.color}" opacity="${x.fill ?? 0.18}"/><path d="${line}" fill="none" stroke="currentColor" class="${x.color}" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
    })
    .join("");
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map(
      (g) =>
        `<div class="absolute left-0 right-0 border-t border-border ${g ? "border-dashed" : ""}" style="bottom:${g * 100}%"><span class="absolute -top-2 right-full mr-2 code text-muted-foreground">${fmt(g * max)}</span></div>`
    )
    .join("");
  return `<div class="relative ${h} mt-5 ml-10">${grid}<svg class="absolute inset-0 w-full h-full" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${paths}</svg></div>
      <div class="flex justify-between ml-10 mt-2 text-caption text-muted-foreground">${labels.map((l) => `<span>${l}</span>`).join("")}</div>`;
};
const donut = (parts, centre, sub) => {
  const t = parts.reduce((a, p) => a + p[1], 0);
  let at = 0;
  const rings = t
    ? parts
        .map((p) => {
          const len = (p[1] / t) * 100;
          const seg = `<circle cx="21" cy="21" r="15.915" fill="none" stroke="currentColor" class="${p[2]}" stroke-width="6" stroke-dasharray="${Math.max(0, len - 1).toFixed(2)} ${(100 - Math.max(0, len - 1)).toFixed(2)}" stroke-dashoffset="${(25 - at).toFixed(2)}"/>`;
          at += len;
          return seg;
        })
        .join("")
    : `<circle cx="21" cy="21" r="15.915" fill="none" stroke="currentColor" class="text-muted" stroke-width="6"/>`;
  return `<div class="relative size-32 shrink-0"><svg viewBox="0 0 42 42" class="size-32" aria-hidden="true">${rings}</svg><div class="absolute inset-0 flex flex-col items-center justify-center"><span class="money font-semibold">${centre}</span><span class="text-caption text-muted-foreground">${sub}</span></div></div>`;
};
/* Weekly buckets ending today: k = 0 is the week up to today. */
const weekly = (t, n, count) => {
  const out = [];
  for (let k = n - 1; k >= 0; k--) {
    const to = addDays(t, -7 * k);
    out.push(count(addDays(to, -7), to));
  }
  return out;
};
const weekLabels = (t, n) =>
  Array.from({ length: n }, (_, i) => dm(addDays(t, -7 * (n - 1 - i))));

/* ---------- shared reads ---------- */
const bookingsOn = (s, d) =>
  s.bookings
    .filter((b) => day(b.start) === d && LIVE_BOOKING(b))
    .sort((a, b) => a.start.localeCompare(b.start));
const serviceOf = (s, b) =>
  s.jobs.find((j) => j.bookingId === b.id)?.title ||
  byId(s.packages, b.packageId)?.name ||
  byId(s.leads, b.leadId)?.brief ||
  `Booking · ${first(custName(s, b.customerId))}`;

/* ---------- CSV export (Reports and the Accountant's Today) ---------- */
const q = (v) => {
  const t = String(v ?? "");
  return /[",\n]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t;
};
const row = (xs) => xs.map(q).join(",");
/* days: only records of the last n days (invoices by shared date, payments by upload or decision date). */
export function csvOf(s, days = null) {
  const t = s.meta.today;
  const from = days ? addDays(t, -days) : "";
  const inPeriod = (d) => !days || (day(d) > from && day(d) <= t);
  const I_ = s.invoices.filter(
    (i) => !i.cancelled && inPeriod(i.sharedAt || i.createdAt)
  );
  const P_ = s.payments.filter((p) => inPeriod(p.decidedAt || p.uploadedAt));
  return { I_, P_, from, t };
}
function buildCsv(ctx, days) {
  const s = ctx.s;
  const B = ctx.biz;
  const { I_, P_ } = csvOf(s, days);
  const lines = [
    "Invoices",
    row([
      "Number",
      "Kind",
      "Customer",
      "Status",
      "Total",
      "Paid",
      "Open",
      "Due or pay by",
      "Shared",
    ]),
    ...I_.map((i) =>
      row([
        B.invoices.numberOf(i),
        i.invNumber ? "Tax invoice" : B.invoices.KIND[i.kind] || i.kind,
        custName(s, i.customerId),
        B.invoices.statusOf(s, i),
        B.invoices.total(s, i),
        B.invoices.paid(s, i),
        B.invoices.open(s, i),
        i.dueDate || i.payBy || "",
        day(i.sharedAt),
      ])
    ),
    "",
    "Payments",
    row([
      "Payment",
      "Invoice",
      "Customer",
      "Amount",
      "Method",
      "Status",
      "Uploaded",
      "Decided",
      "Reference",
    ]),
    ...P_.map((p) => {
      const i = byId(s.invoices, p.invoiceId);
      return row([
        p.id,
        i ? B.invoices.numberOf(i) : "",
        i ? custName(s, i.customerId) : "",
        p.amount,
        methodName(p.method),
        p.status,
        day(p.uploadedAt),
        day(p.decidedAt),
        p.reference || "",
      ]);
    }),
  ];
  return { text: lines.join("\n"), invoices: I_.length, payments: P_.length };
}
function exportCsv(ctx, args) {
  if (ctx.role === "superadmin")
    throw new BizError("Support view is read-only.");
  if (!ctx.biz.perms.can(ctx.role, "export"))
    throw new BizError("Only the Owner or the Accountant can export.");
  const days = args.days ? +args.days : null;
  const out = buildCsv(ctx, days);
  if (!checking) {
    const blob = new Blob([`﻿${out.text}`], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${ctx.s.workspace.slug || "biz4kit"}-invoices-payments-${ctx.s.meta.today}${days ? `-last-${days}-days` : ""}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  return {
    text: `Exported ${plural(out.invoices, "invoice")} and ${plural(out.payments, "payment")} as CSV`,
  };
}

/* ---------- TODAY ---------- */
function myDay(ctx) {
  const s = ctx.s;
  const t = ctx.today;
  const me = ctx.memberId;
  const list = bookingsOn(s, t).filter((b) => b.memberId === me);
  const jobsToday = s.jobs.filter(
    (j) =>
      j.assigneeId === me &&
      day(j.start) === t &&
      !list.some((b) => b.id === j.bookingId)
  );
  const items = [
    ...list.map((b) => {
      const j = s.jobs.find((x) => x.bookingId === b.id);
      return {
        time: fmtTime(b.start),
        title: serviceOf(s, b),
        cust: custName(s, b.customerId),
        status: j ? j.status : b.status,
        go: j ? ["job", { id: j.id }] : ["bookings", {}],
      };
    }),
    ...jobsToday.map((j) => ({
      time: fmtTime(j.start),
      title: j.title,
      cust: custName(s, j.customerId),
      status: j.status,
      go: ["job", { id: j.id }],
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));
  const doneWeek = s.jobs.filter(
    (j) =>
      j.assigneeId === me &&
      j.completedAt &&
      day(j.completedAt) > addDays(t, -7) &&
      day(j.completedAt) <= t
  ).length;
  const D = new Date(`${t}T00:00:00`);
  const long = `${D.toLocaleDateString("en-GB", { weekday: "long" })} ${D.getDate()} ${D.toLocaleDateString("en-GB", { month: "long" })}`;
  return `<div><h1 class="font-serif text-heading font-semibold">My day</h1><p class="text-muted-foreground">${esc(first(ctx.me?.name) || "You")} · ${long}</p></div>
    <div class="grid @tab:grid-cols-2 gap-2" data-myday>${
      items.length
        ? items
            .map(
              (j) =>
                `<a ${link(j.go[0], j.go[1])} class="card px-3 py-2.5 min-h-touch flex items-center gap-3 hover:bg-muted">${C(j.time)}<div class="min-w-0"><p class="font-medium truncate">${esc(j.title)}</p><p class="text-caption text-muted-foreground">${esc(j.cust)}</p></div><span class="ml-auto">${pill(j.status)}</span></a>`
            )
            .join("")
        : `<div class="card px-3 py-2.5 text-muted-foreground">Nothing booked for you today.</div>`
    }</div>
    <div class="card p-card-sm"><p class="label">Done this week</p><p class="font-mono text-money-lg">${doneWeek}</p><p class="text-caption text-muted-foreground">${plural(doneWeek, "job")} completed in the last 7 days</p></div>`;
}

/* ---------- first-run checklist (Design inputs Flow 1 step 7, WBS 3.9, D87) ---------- */
/* Where each step is done. */
const SETUP_GO = {
  details: link("settings", { tab: "business" }),
  brand: link("settings", { tab: "brand" }),
  catalog: link("catalog"),
  team: link("settings", { tab: "team" }),
  share: 'data-need="catalog" data-open="share-catalog"',
  reply: `${link("leads")} data-then="price-reply"`,
};
/* A brand-new workspace as the checklist sees it (the sample is an established business). */
export const freshView = (s) => {
  const owner = s.members.find((m) => m.role === "owner");
  return {
    ...s,
    workspace: {
      ...s.workspace,
      address: "",
      upi: "",
      bank: null,
      brand: {},
      setupDismissed: false,
    },
    items: s.items.slice(0, 1),
    members: owner ? [owner] : [],
    outbox: [],
    invoices: [],
  };
};
function setupCard(ctx, view = ctx.s) {
  if (ctx.role !== "owner" && ctx.role !== "superadmin") return "";
  const { steps, count, show } = ctx.biz.settings.setupSteps(view);
  if (!show) return "";
  const nextKey = steps.find((x) => !x.done)?.key;
  return `<div class="card p-card-sm @tab:p-card" data-setup>
    <div class="flex items-center gap-2"><h2 class="text-title font-semibold">Get set up</h2><span class="count" data-setup-count>${count} of ${steps.length}</span>
      <button type="button" data-need="settings" class="ml-auto btn btn-ghost btn-sm" data-do="settings.dismissSetup">${I("x", "size-icon-sm")}Hide</button></div>
    <div class="mt-2 h-1.5 rounded-pill bg-muted overflow-hidden"><div class="h-full bg-primary" style="width:${Math.round((count / steps.length) * 100)}%"></div></div>
    <ol class="mt-3 grid gap-2 @tab:grid-cols-2 @web:grid-cols-3">${steps
      .map(
        (x) =>
          `<li data-step="${x.key}" data-done="${x.done}"><a ${SETUP_GO[x.key]} class="flex items-start gap-2 rounded-control border border-border p-2.5 hover:bg-muted ${x.key === nextKey ? "ring-2 ring-ring" : ""}">${I(x.done ? "circle-check" : "circle", `size-icon mt-0.5 ${x.done ? "text-success" : "text-muted-foreground"}`)}<span class="min-w-0"><span class="block font-medium ${x.done ? "line-through text-muted-foreground" : ""}">${esc(x.label)}</span><span class="block text-caption text-muted-foreground">${esc(x.sub)}</span></span></a></li>`
      )
      .join("")}</ol>
    <p class="mt-2 text-caption text-muted-foreground">Stays until your first reply is shared. <span class="italic">[Draft wording, owner to approve]</span></p>
  </div>`;
}

function dashboard(ctx, view = null) {
  const s = ctx.s;
  const B = ctx.biz;
  const r = ctx.role;
  const t = ctx.today;
  const money = r !== "manager";
  const acct = r === "accountant";
  const k = B.sel.kpis(s);
  const toAnswer = B.leads.toAnswer(s);
  const pend = B.payments.pending(s);
  const today = bookingsOn(s, t);
  const firstName =
    r === "superadmin" ? "support" : first(ctx.me?.name) || "there";

  /* Welcome header: what is waiting today, the quick jobs on the right (D77). */
  const btn = (icon, label, attrs, primary = false) =>
    `<${attrs.startsWith("href") ? "a" : 'button type="button"'} ${attrs} class="btn ${primary ? "btn-primary" : "btn-outline"}">${I(icon, "size-icon-sm")}${label}</${attrs.startsWith("href") ? "a" : "button"}>`;
  const actions = acct
    ? [
        btn("download", "Export", 'data-need="export" data-do="exportCsv"'),
        btn("badge-check", "Review proofs", link("approvals"), true),
      ]
    : [
        btn(
          "link",
          "Share price list",
          'data-need="catalog" data-open="share-catalog"'
        ),
        btn("send", "Send reply", `${link("leads")} data-then="price-reply"`),
        money
          ? btn(
              "plus",
              "New invoice",
              'data-need="write" data-open="new-invoice"',
              true
            )
          : btn(
              "plus",
              "New lead",
              `${link("leads")} data-then="new-lead" data-need="write"`,
              true
            ),
      ];
  const b = (x) => `<b class="text-foreground">${x}</b>`;
  const waiting = acct
    ? `Today you have ${b(plural(k.approve.count, "proof"))} to approve and ${b(plural(k.overdue.count, "bill"))} overdue`
    : money
      ? `Today you have ${b(plural(k.leadsToAnswer, "lead"))} to answer, ${b(plural(k.approve.count, "proof"))} to approve and ${b(inr(k.collect.amount))} to collect this week`
      : `Today you have ${b(plural(k.leadsToAnswer, "lead"))} to answer and ${b(plural(today.length, "booking"))}`;
  const date = `<div class="flex flex-wrap items-end gap-3"><div class="min-w-0"><h2 class="font-serif text-heading font-semibold">Welcome back, ${esc(firstName)}!</h2><p class="mt-1 text-body text-muted-foreground" data-waiting>${waiting}.</p></div><div class="w-full @tab:w-auto @tab:ml-auto flex flex-wrap gap-2">${actions.join("")}</div></div>`;

  /* KPI strip: one source (biz.sel.kpis). */
  const p30 = k.paid30;
  const tr = trend(p30.change);
  const inService = s.jobs.filter((j) => j.status === "in_progress");
  const bySvc = {};
  for (const j of inService) {
    const n = first(memberName(s, j.assigneeId)) || "Unassigned";
    bySvc[n] = (bySvc[n] || 0) + 1;
  }
  const svcParts = Object.entries(bySvc).map(([n, c]) => `${n} ${c}`);
  const stats = money
    ? [
        {
          key: "collect",
          icon: "wallet",
          t: "To collect this week",
          v: inr(k.collect.amount),
          foot: plural(k.collect.count, "bill"),
          sub: `${k.collect.late} already late`,
          go: "invoices",
        },
        {
          key: "overdue",
          icon: "circle-alert",
          t: "Overdue",
          v: inr(k.overdue.amount),
          vTone: "text-destructive",
          foot: plural(k.overdue.count, "bill"),
          sub: k.overdue.count
            ? `oldest ${plural(k.overdue.oldest, "day")}`
            : "none late",
          go: "overdue",
        },
        {
          key: "approve",
          icon: "hourglass",
          t: "To approve",
          v: inr(k.approve.amount),
          foot: plural(k.approve.count, "proof"),
          sub: k.approve.count
            ? `oldest ${waitDays(k.approve.oldest)}`
            : "nothing waiting",
          go: "approvals",
        },
        {
          key: "paid30",
          icon: "circle-check",
          t: "Paid, last 30 days",
          v: inr(p30.amount),
          tone: tr.tone,
          icon2: tr.icon2,
          foot:
            p30.change === null
              ? "no payments before"
              : `${p30.change >= 0 ? "+" : ""}${p30.change}% (${p30.diff >= 0 ? "+" : ""}${inr(p30.diff)})`,
          sub: "vs previous 30 days",
          go: acct ? "invoices" : "reports",
        },
      ]
    : [
        {
          key: "bookings",
          icon: "calendar",
          t: "Bookings today",
          v: String(today.length),
          foot: `${today.filter((x) => x.status !== "tentative").length} agreed`,
          sub: `${today.filter((x) => x.status === "tentative").length} to confirm`,
          go: "bookings",
        },
        {
          key: "leads",
          icon: "sparkle",
          t: "New leads",
          v: String(toAnswer.length),
          foot: `${toAnswer.filter((l) => l.type !== "booked").length} quoted`,
          sub: `${toAnswer.filter((l) => l.type === "booked").length} booked`,
          go: "leads",
        },
        {
          key: "service",
          icon: "loader",
          t: "In service",
          v: String(inService.length),
          foot: svcParts[0] || "nobody yet",
          sub: svcParts.slice(1).join(", ") || "jobs started",
          go: "jobs",
        },
        {
          key: "approveCount",
          icon: "hourglass",
          t: "To approve",
          v: String(pend.length),
          foot: "proofs",
          sub: pend.length
            ? `oldest ${waitDays(k.approve.oldest)}`
            : "nothing waiting",
          go: "approvals",
        },
      ];
  const strip = `<div class="card grid grid-cols-2 @web:grid-cols-4 overflow-hidden">${stats
    .map(
      (
        x,
        i
      ) => `<a ${link(x.go)} data-kpi="${x.key}" class="kpi block p-card-sm @tab:p-card min-w-0 border-border hover:bg-muted/40 ${i % 2 ? "border-l" : ""} ${i > 1 ? "border-t @web:border-t-0" : ""} ${i === 2 ? "@web:border-l" : ""}">
  <div class="flex items-center gap-2 text-muted-foreground">${I(x.icon, "size-icon-sm")}<span class="truncate">${x.t}</span></div>
  <div class="mt-3 font-mono text-money-lg ${x.vTone || ""}" data-v>${x.v}</div>
  <div class="mt-2 flex items-center gap-1.5 text-caption truncate"><span class="${x.tone || "text-muted-foreground"} flex items-center gap-1">${x.icon2 ? I(x.icon2, "size-icon-sm") : ""}${x.foot}</span><span class="text-muted-foreground">• ${x.sub}</span></div></a>`
    )
    .join("")}</div>`;

  /* Area chart: these 6 weeks vs the 6 before. */
  const legend = (a, c) =>
    `<div class="ml-auto flex items-center gap-4 text-caption text-muted-foreground"><span class="flex items-center gap-1.5">${dot("bg-chart-1")}${a}</span><span class="flex items-center gap-1.5">${dot("bg-teal")}${c}</span></div>`;
  let chart;
  if (money) {
    const w = B.sel.paidWeeks(s, 6);
    chart = `<div class="card p-card-sm @tab:p-card chart-big h-full" data-chart="paid"><div class="flex flex-wrap items-start gap-3"><div><p class="font-mono text-money-lg">${inr(w.total)}</p><p class="text-caption text-muted-foreground">Paid (last 6 weeks · this week so far)</p></div>${legend("These 6 weeks", "6 weeks before")}</div>${areaChart(
      [
        { color: "text-teal", values: w.before, fill: 0.12 },
        { color: "text-chart-1", values: w.now, fill: 0.2 },
      ],
      weekLabels(t, 6),
      { unit: "₹" }
    )}</div>`;
  } else {
    const count = (from, to) =>
      s.bookings.filter(
        (x) => LIVE_BOOKING(x) && day(x.start) > from && day(x.start) <= to
      ).length;
    const now = weekly(t, 6, count);
    const before = weekly(addDays(t, -42), 6, count);
    chart = `<div class="card p-card-sm @tab:p-card chart-big h-full" data-chart="bookings"><div class="flex flex-wrap items-start gap-3"><div><p class="font-mono text-money-lg">${sum(now)}</p><p class="text-caption text-muted-foreground">Bookings (last 6 weeks)</p></div>${legend("These 6 weeks", "6 weeks before")}</div>${areaChart(
      [
        { color: "text-teal", values: before, fill: 0.12 },
        { color: "text-chart-1", values: now, fill: 0.2 },
      ],
      weekLabels(t, 6)
    )}</div>`;
  }

  /* Right column. */
  const head = (icon, title, sub, go = "") =>
    `<div class="flex items-start gap-3"><span class="size-control-md shrink-0 rounded-control border border-border flex items-center justify-center text-muted-foreground">${I(icon, "size-icon-sm")}</span><div class="min-w-0"><p class="text-title font-semibold">${title}</p><p class="text-caption text-muted-foreground">${sub}</p></div>${go ? `<a ${link(go)} class="ml-auto btn btn-ghost btn-sm btn-icon" aria-label="Open ${esc(title)}">${I("arrow-right", "size-icon-sm")}</a>` : ""}</div>`;
  const owed = B.sel.owed(s);
  const st = (i) => B.invoices.statusOf(s, i);
  const buckets = [
    ["Not yet due", owed.filter((i) => ["due", "part_paid"].includes(st(i))), "bg-chart-1"],
    ["Late", owed.filter((i) => st(i) === "overdue"), "bg-destructive"],
    ["To approve", owed.filter((i) => st(i) === "pending"), "bg-violet"],
  ].map(([l, list, c]) => [l, sum(list, (i) => B.invoices.open(s, i)), c]);
  const owedTotal = sum(buckets, (x) => x[1]);
  const owedCard = `<div class="card p-card-sm @tab:p-card" data-owed="${owedTotal}">${head("layers", "Money owed", `${inr(owedTotal)} · ${plural(owed.length, "bill")} · bills only (D75)`, "invoices")}
          <div class="mt-4 flex h-2.5 rounded-pill overflow-hidden bg-muted">${buckets.map((x) => `<div class="${x[2]}" style="width:${pct(x[1], owedTotal)}%" title="${x[0]}: ${inr(x[1])}"></div>`).join("")}</div>
          <div class="mt-2 grid grid-cols-3 text-caption text-muted-foreground">${buckets.map((x, i) => `<span class="${i === 1 ? "text-center" : i === 2 ? "text-right" : ""}">${pct(x[1], owedTotal)}%</span>`).join("")}</div>
          <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-caption">${buckets.map((x) => `<span class="flex items-center gap-1.5">${dot(x[2])}${x[0]} ${M(x[1])}</span>`).join("")}</div></div>`;
  const bm = B.sel.byMethod(s, 30);
  const methods = Object.entries(bm)
    .sort((a, c) => c[1] - a[1])
    .map(([m, v], i) => [
      methodName(m === "null" ? null : m),
      v,
      ...METHOD_TONE[Math.min(i, METHOD_TONE.length - 1)],
    ]);
  const mTotal = sum(methods, (m) => m[1]);
  const methodCard = `<div class="card p-card-sm @tab:p-card">${head("chart-pie", "Collected by method", `${inr(mTotal)} in the last 30 days`, ctx.biz.perms.can(r, "export") || r === "superadmin" ? "reports" : "")}
          <div class="mt-4 flex items-center gap-5">${donut(methods, short(mTotal), "Total")}<div class="flex-1 min-w-0 space-y-2">${
            methods.length
              ? methods
                  .map(
                    (m) =>
                      `<div class="flex items-center gap-2 text-body-sm">${dot(m[3])}<span class="flex-1 truncate text-muted-foreground">${m[0]}</span><span class="font-mono">${inr(m[1])}</span><span class="w-9 text-right text-muted-foreground">${pct(m[1], mTotal)}%</span></div>`
                  )
                  .join("")
              : `<p class="text-caption text-muted-foreground">No payments approved in the last 30 days.</p>`
          }</div></div></div>`;
  const team = (() => {
    const by = {};
    for (const x of today)
      by[x.memberId || ""] = (by[x.memberId || ""] || 0) + 1;
    const rows = Object.entries(by).sort((a, c) => c[1] - a[1]);
    const max = Math.max(1, ...rows.map((x) => x[1]));
    return `<div class="card p-card-sm @tab:p-card">${head("users", "Team today", `${plural(today.length, "booking")} across ${plural(rows.length, "person", "people")}`, "bookings")}<ul class="mt-4 space-y-2.5">${
      rows.length
        ? rows
            .map(
              ([m, c]) =>
                `<li class="flex items-center gap-2"><span class="min-w-0 flex-1 truncate">${who(memberName(s, m))}</span><span class="code">${plural(c, "booking")}</span><div class="w-20 h-1.5 rounded-pill bg-muted"><div class="h-full rounded-pill bg-chart-1" style="width:${pct(c, max)}%"></div></div></li>`
            )
            .join("")
        : `<li class="text-muted-foreground">No bookings today.</li>`
    }</ul></div>`;
  })();
  const leadMix = (() => {
    const month = t.slice(0, 7);
    const ls = s.leads.filter((l) => day(l.createdAt).slice(0, 7) === month);
    const parts = [
      [
        "New",
        ls.filter((l) => ["new", "contacted"].includes(l.status)).length,
        "bg-info",
      ],
      ["Replied", ls.filter((l) => l.status === "replied").length, "bg-violet"],
      [
        "Snoozed",
        ls.filter((l) => l.status === "snoozed").length,
        "bg-warning",
      ],
      ["Paid", ls.filter((l) => l.status === "paid").length, "bg-success"],
      [
        "Rejected",
        ls.filter((l) => l.status === "rejected").length,
        "bg-muted-foreground",
      ],
    ];
    return `<div class="card p-card-sm @tab:p-card">${head("list-filter", "Leads this month", plural(ls.length, "request"), "leads")}
          <div class="mt-4 flex h-2.5 rounded-pill overflow-hidden bg-muted">${parts.map((x) => `<div class="${x[2]}" style="width:${pct(x[1], ls.length)}%"></div>`).join("")}</div>
          <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-caption">${parts.map((x) => `<span class="flex items-center gap-1.5">${dot(x[2])}${x[0]} ${x[1]}</span>`).join("")}</div></div>`;
  })();
  const side = money
    ? `<div class="grid gap-6 h-full content-start">${owedCard}${methodCard}</div>`
    : `<div class="grid gap-6 h-full content-start">${leadMix}${team}</div>`;

  /* Tables and Recent activity. */
  const leadsT = {
    key: "dash-leads",
    icon: "inbox",
    title: "Leads to answer",
    all: "leads",
    go: "lead",
    compact: true,
    cols: [
      { t: "Customer", role: "title" },
      { t: "Request", m: 1, role: "sub" },
      { t: "Type", web: 1 },
      { t: "Status", role: "status" },
      { t: "Age", r: 1, m: 1, role: "end" },
    ],
    rows: toAnswer.map((l) => ({
      id: l.id,
      cells: [
        name(custName(s, l.customerId)),
        `<span class="block max-w-48 truncate">${esc(l.brief)}</span>`,
        typeChip(l.type),
        pill(l.status),
        C(ago(s, l.createdAt)),
      ],
    })),
  };
  const ownedRows = () => {
    const by = {};
    for (const i of owed) (by[i.customerId] ??= []).push(i);
    return B.sel.whoOwes(s).map((w) => {
      const list = by[w.customer?.id] || [];
      const status = list.some((i) => st(i) === "overdue")
        ? "overdue"
        : list.some((i) => ["due", "part_paid"].includes(st(i)))
          ? "due"
          : "pending";
      const next = list
        .map((i) => i.dueDate)
        .filter(Boolean)
        .sort()[0];
      return {
        id: w.customer?.id,
        cells: [
          name(w.customer?.name || "Customer"),
          plural(w.count, "bill"),
          next ? fmtDate(next) : "—",
          pill(status),
          M(w.amount),
        ],
      };
    });
  };
  const collectT = {
    key: "dash-owes",
    icon: "receipt",
    title: "Who owes me",
    all: "invoices",
    go: "customer",
    compact: true,
    cols: [
      { t: "Customer", role: "title" },
      { t: "Bills", m: 1, role: "sub" },
      { t: "First due", m: 1, web: 1 },
      { t: "Status", role: "status" },
      { t: "Amount", r: 1, role: "end" },
    ],
    rows: ownedRows(),
  };
  const paidT = {
    key: "dash-paid7",
    icon: "circle-check",
    title: "Paid, last 7 days",
    all: "invoices",
    go: "invoice",
    compact: true,
    cols: [
      { t: "Customer", role: "title" },
      { t: "Invoice", m: 1, role: "sub" },
      { t: "Paid on", m: 1, web: 1 },
      { t: "Status", role: "status" },
      { t: "Amount", r: 1, role: "end" },
    ],
    rows: approvedIn(s, addDays(t, -7), t)
      .sort((a, c) => c.decidedAt.localeCompare(a.decidedAt))
      .map((p) => {
        const i = byId(s.invoices, p.invoiceId);
        return {
          id: p.invoiceId,
          cells: [
            name(custName(s, i?.customerId)),
            C(i ? B.invoices.numberOf(i) : ""),
            fmtDate(p.decidedAt),
            pill(i ? st(i) : "approved"),
            M(p.amount),
          ],
        };
      }),
  };
  const jobsT = {
    key: "dash-jobs",
    icon: "briefcase",
    title: "Jobs in service",
    all: "jobs",
    go: "job",
    compact: true,
    cols: [
      { t: "Job", role: "title" },
      { t: "Customer", m: 1, role: "sub" },
      { t: "Staff", web: 1 },
      { t: "Status", role: "status" },
      { t: "Started", r: 1, m: 1, role: "end" },
    ],
    rows: s.jobs
      .filter(
        (j) =>
          j.status === "in_progress" ||
          (j.status === "open" && day(j.start) === t)
      )
      .sort((a, c) => String(a.start).localeCompare(String(c.start)))
      .map((j) => ({
        id: j.id,
        cells: [
          name(j.title),
          esc(custName(s, j.customerId)),
          who(first(memberName(s, j.assigneeId))),
          pill(j.status),
          C(fmtTime(j.start) || fmtDate(j.start)),
        ],
      })),
  };
  const recentT = {
    key: "dash-recent",
    icon: "receipt",
    title: "Recent invoices",
    all: "invoices",
    go: "invoice",
    compact: true,
    per: 6,
    cols: [
      { t: "Number", m: 1, role: "sub" },
      { t: "Customer", role: "title" },
      { t: "Kind", web: 1 },
      { t: "Status", role: "status" },
      { t: "Amount", r: 1, role: "end" },
    ],
    rows: B.invoices
      .live(s)
      .filter((i) => i.sharedAt)
      .sort((a, c) => String(c.sharedAt).localeCompare(String(a.sharedAt)))
      .map((i) => ({
        id: i.id,
        cells: [
          C(B.invoices.numberOf(i)),
          name(custName(s, i.customerId)),
          chip(i.invNumber ? "Tax invoice" : B.invoices.KIND[i.kind]),
          pill(st(i)),
          M(B.invoices.total(s, i)),
        ],
      })),
  };
  const narrow = acct
    ? dataTable(ctx, {
        key: "dash-approve",
        icon: "hourglass",
        title: "To approve",
        all: "approvals",
        go: "approvals",
        compact: true,
        cols: [
          { t: "Customer", role: "title" },
          { t: "Waiting", m: 1, role: "sub" },
          { t: "Amount", r: 1, role: "end" },
        ],
        rows: [...pend]
          .sort((a, c) =>
            String(a.uploadedAt).localeCompare(String(c.uploadedAt))
          )
          .map((p) => ({
            id: p.id,
            cells: [
              name(custName(s, byId(s.invoices, p.invoiceId)?.customerId)),
              waitDays(daysBetween(day(p.uploadedAt), t)),
              M(p.amount),
            ],
          })),
      })
    : dataTable(ctx, {
        key: "dash-work",
        icon: "clock",
        title: "Today work",
        all: "bookings",
        compact: true,
        cols: [
          { t: "Time", m: 1, role: "sub" },
          { t: "Service", role: "title" },
          { t: "Status", role: "status" },
        ],
        rows: today.map((x) => {
          const j = s.jobs.find((y) => y.bookingId === x.id);
          return {
            id: j ? j.id : x.id,
            go: j ? "job" : "bookings",
            cells: [
              C(fmtTime(x.start)),
              `<span class="block truncate max-w-28">${esc(serviceOf(s, x))}</span>`,
              pill(x.status),
            ],
          };
        }),
      });
  const acts = s.activity.slice(0, 5);
  const actCard = `<div class="card p-card-sm @tab:p-card h-full"><div class="flex items-center gap-3 mb-1"><span class="size-control-md shrink-0 rounded-control border border-border flex items-center justify-center text-muted-foreground">${I("bell", "size-icon-sm")}</span><span class="text-title font-semibold">Recent activity</span></div><ul class="divide-y divide-border" data-activity>${
    acts.length
      ? acts
          .map((a) => {
            const [what, ...rest] = String(a.text).split(" · ");
            const by = memberName(s, a.by);
            const sub = rest.join(" · ") || by || "Customer or system";
            return `<li class="flex items-start gap-3 py-2.5"><div class="min-w-0 flex-1"><p class="font-medium truncate">${esc(what)}</p><p class="text-caption text-muted-foreground truncate">${esc(sub)}</p></div><span class="shrink-0 text-caption text-muted-foreground">${esc(ago(s, a.at))}</span></li>`;
          })
          .join("")
      : `<li class="py-2.5 text-muted-foreground">Nothing yet.</li>`
  }</ul></div>`;

  const rows = acct
    ? [dataTable(ctx, collectT), narrow, dataTable(ctx, paidT), actCard]
    : r === "manager"
      ? [dataTable(ctx, leadsT), narrow, dataTable(ctx, jobsT), actCard]
      : [dataTable(ctx, leadsT), narrow, dataTable(ctx, recentT), actCard];
  const wide = "@min-[1100px]/dash:col-span-8";
  const slim = "@min-[1100px]/dash:col-span-4";
  return `<div class="@container/dash p-4 @tab:p-page space-y-6">
    ${setupCard(ctx, view || s)}
    ${date}
    ${strip}
    <div class="grid gap-6 @min-[1100px]/dash:grid-cols-12">
      <div class="min-w-0 ${wide}">${chart}</div>
      <div class="min-w-0 ${slim}">${side}</div>
      <div class="min-w-0 ${wide}">${rows[0]}</div>
      <div class="min-w-0 ${slim}">${rows[1]}</div>
      <div class="min-w-0 ${wide}">${rows[2]}</div>
      <div class="min-w-0 ${slim}">${rows[3]}</div>
    </div>
  </div>`;
}

/* ---------- BOARD ---------- */
/* What each column holds (D65), shown under the column name. */
const HINT = {
  new: "Lead new or contacted",
  replied: "Reply shared, not paid yet",
  booked: "Booking agreed",
  in_service: "Job in progress",
  invoiced: "Bill due, overdue or to approve",
  paid: "Every invoice paid (D72)",
};
function cardOf(ctx, lead, col) {
  const s = ctx.s;
  const B = ctx.biz;
  const invs = B.invoices.ofLead(s, lead.id).filter((i) => i.sharedAt);
  const reply = invs.find((i) => B.invoices.isReplyLike(i));
  const bill = invs.find(
    (i) =>
      !B.invoices.isReplyLike(i) &&
      ["due", "part_paid", "overdue", "pending"].includes(
        B.invoices.statusOf(s, i)
      )
  );
  const bk = s.bookings.find((x) => x.leadId === lead.id && LIVE_BOOKING(x));
  const job = s.jobs.find((j) => j.leadId === lead.id);
  const assignee = memberName(
    s,
    lead.assigneeId || bk?.memberId || job?.assigneeId
  );
  let sub = esc(lead.brief),
    mono = false,
    left = "",
    right = assignee ? av(initials(assignee)) : "";
  if (col === "new") {
    sub = `${esc(lead.brief)} · ${lead.type}`;
    left = chip(SOURCES[lead.source] || lead.source || "Lead");
  } else if (col === "replied" && reply) {
    sub = esc(B.invoices.numberOf(reply));
    mono = true;
    left = M(B.invoices.total(s, reply));
    right = pill(B.invoices.statusOf(s, reply));
  } else if (col === "booked" && bk) {
    sub = `${esc(serviceOf(s, bk))} · ${day(bk.start) === ctx.today ? "Today" : fmtDate(bk.start)} ${fmtTime(bk.start)}`;
    right = bookingPill(bk.status);
  } else if (col === "in_service" && job) {
    sub = `${esc(job.title)} · ${esc(first(memberName(s, job.assigneeId)))}`;
    right = pill(job.status);
  } else if (col === "invoiced" && bill) {
    sub = esc(B.invoices.numberOf(bill));
    mono = true;
    left = M(B.invoices.open(s, bill));
    right = pill(B.invoices.statusOf(s, bill));
  } else if (col === "paid") {
    const last = invs.find((i) => i.invNumber) || invs[0];
    if (last) {
      sub = esc(B.invoices.numberOf(last));
      mono = true;
    }
    left = M(sum(invs, (i) => B.invoices.paid(s, i)));
    right = pill("paid");
  }
  return `<div data-card="${lead.id}" ${link("lead", { id: lead.id })} role="link" tabindex="0" aria-label="${esc(custName(s, lead.customerId))}" class="block bg-card rounded-control border border-border p-2.5 cursor-grab hover:border-ring">
        <div class="flex items-center gap-1.5">${isHigh(lead) ? `<span data-priority="high" title="High priority">${I("flag", "size-icon-sm")}<span class="sr-only">High priority</span></span>` : ""}<span class="font-medium">${esc(custName(s, lead.customerId))}</span>${I("grip-vertical", "size-icon-sm ml-auto text-muted-foreground")}</div>
        <div class="text-caption text-muted-foreground truncate ${mono ? "font-mono" : ""}">${sub}</div>
        <div class="flex items-center gap-2 mt-2">${left}<span class="ml-auto">${right}</span></div>
      </div>`;
}
function board(ctx) {
  const s = ctx.s;
  const B = ctx.biz;
  if (s.workspace.modules?.board === false) {
    const owner = ctx.role === "owner" || ctx.role === "superadmin";
    return page(
      `<div class="card" data-lite>${`<div class="flex flex-col items-center justify-center gap-2 p-8 text-center"><span class="size-control-lg rounded-pill bg-muted text-muted-foreground flex items-center justify-center">${I("square-kanban")}</span><p class="text-title font-semibold">The Board is switched off</p><p class="text-muted-foreground max-w-sm">${esc(s.workspace.name)} runs in Lite mode: leads, quick replies and invoices only. The Board is an extra (D63). ${owner ? "Switch it on here or in Settings, under Extras." : "Ask the Owner to switch it on in Settings."}</p>${owner ? `<div class="mt-2 flex flex-wrap gap-2 justify-center"><button type="button" class="btn btn-primary" data-need="settings" data-do="settings.saveModules" data-a-board="true">${I("toggle-right", "size-icon-sm")}Switch the Board on</button><a ${link("settings")} class="btn btn-outline">${I("settings", "size-icon-sm")}Open Settings</a></div>` : ""}</div>`}</div>`
    );
  }
  const mine = uiv(ctx, "who", "all") === "mine";
  const me = ctx.memberId;
  const isMine = (l) =>
    l.assigneeId === me ||
    s.bookings.some((x) => x.leadId === l.id && x.memberId === me) ||
    s.jobs.some((j) => j.leadId === l.id && j.assigneeId === me);
  const cards = B.board.cards(s).filter((c) => !mine || isMine(c.lead));
  const cols = B.board.COLUMNS.map(([key, label]) => {
    const list = cards
      .filter((c) => c.col === key)
      .sort((a, c) =>
        String(c.lead.createdAt).localeCompare(String(a.lead.createdAt))
      );
    return `<div class="w-72 @tab:w-60 shrink-0 snap-start flex flex-col rounded-card bg-muted p-2">
      <div class="flex items-center gap-2 px-1.5 h-control-md"><span class="label">${label}</span><span class="count bg-card">${list.length}</span>${key === "new" ? `<a ${link("leads")} data-then="new-lead" data-need="write" class="ml-auto btn btn-ghost btn-sm btn-icon" aria-label="New lead">${I("plus", "size-icon-sm")}</a>` : ""}</div>
      <p class="px-1.5 pb-2 text-caption text-muted-foreground truncate" title="${HINT[key]}">${HINT[key]}</p>
      <div class="flex-1 space-y-2 min-h-24" data-board-col="${key}">${list.map((c) => cardOf(ctx, c.lead, key)).join("")}</div></div>`;
  }).join("");
  return `<div class="h-full flex flex-col p-4 @tab:p-page gap-4">
    ${toolbar(
      seg(ctx, "who", [
        ["all", "Everyone"],
        ["mine", "Mine"],
      ]),
      `<a ${link("leads")} data-then="new-lead" data-need="write" class="btn btn-primary">${I("plus")}New lead</a>`
    )}
    <p class="hint -mt-2">Drag a card to the next stage. Only moves the app can do for you are allowed; anything else snaps back with the reason. Open a card for everything else.</p>
    <div class="flex-1 min-h-0 flex gap-3 overflow-x-auto snap-x">${cols}</div>
  </div>`;
}

/* ---------- REPORTS ---------- */
function reports(ctx) {
  const s = ctx.s;
  const B = ctx.biz;
  const t = ctx.today;
  const d = +uiv(ctx, "period", "30");
  const from = addDays(t, -d);
  const prevFrom = addDays(t, -2 * d);
  const paidNow = approvedIn(s, from, t);
  const paidPrev = approvedIn(s, prevFrom, from);
  const paidAmt = sum(paidNow, (p) => p.amount);
  const prevAmt = sum(paidPrev, (p) => p.amount);
  const cPaid = change(paidAmt, prevAmt);
  const owed = B.sel.owed(s);
  const owedAmt = sum(owed, (i) => B.invoices.open(s, i));
  const od = B.sel.overdue(s);
  const leadsIn = (a, b) =>
    s.leads.filter((l) => day(l.createdAt) > a && day(l.createdAt) <= b);
  const lNow = leadsIn(from, t);
  const lPrev = leadsIn(prevFrom, from);
  const conv = (ls) =>
    pct(ls.filter((l) => l.status === "paid").length, ls.length);
  const avgOf = (ps) => {
    const n = new Set(ps.map((p) => p.invoiceId)).size;
    return n ? Math.round(sum(ps, (p) => p.amount) / n) : 0;
  };
  const avgNow = avgOf(paidNow),
    avgPrev = avgOf(paidPrev);
  const vsFoot = (c) =>
    c === null ? "no earlier data" : `${c >= 0 ? "+" : ""}${c}% vs previous`;
  const prevLbl = `previous ${d} days`;

  /* Paid chart: per day for 7 and 30 days, per week for 90 days. */
  let series;
  if (d === 90) {
    const w = B.sel.paidWeeks(s, 13).now;
    series = w.map((v, i) => [dm(addDays(t, -7 * (12 - i))), v]);
  } else
    series = B.sel
      .paidDays(s, d)
      .map((x) => [
        d === 7 ? fmtDate(x.date).slice(0, 3) : dm(x.date),
        x.amount,
      ]);
  const every = series.length > 14 ? 5 : series.length > 8 ? 2 : 1;
  const max = Math.max(1, ...series.map((x) => x[1])) * 1.1;
  const peak = series.reduce((m, x, i) => (x[1] > series[m][1] ? i : m), 0);
  const tbl = uiv(ctx, "table", "0") === "1";
  const chartTitle =
    d === 90
      ? "Paid per week · last 13 weeks"
      : `Paid per day · last ${d} days`;
  const chart = tbl
    ? `<div class="mt-4 max-h-64 overflow-y-auto border-t border-border"><table class="tbl w-full"><thead><tr><th class="th">${d === 90 ? "Week to" : "Day"}</th><th class="th text-right">Paid</th></tr></thead><tbody>${series.map((x) => `<tr><td class="td">${x[0]}</td><td class="td text-right">${M(x[1])}</td></tr>`).join("")}</tbody></table></div>`
    : `<div class="mt-4 h-48 flex items-end gap-1 @tab:gap-2 border-b border-border relative ml-8">
          ${[0, 0.5, 1].map((g) => `<div class="absolute left-0 right-0 border-t border-border" style="bottom:${(g / 1.1) * 100}%"><span class="absolute -top-2 -left-8 code text-muted-foreground">${g ? `${Math.round((g * max) / 1.1 / 1000)}k` : "0"}</span></div>`).join("")}
          ${series.map((w, i) => `<div class="relative flex-1 flex flex-col items-center justify-end h-full" title="${esc(w[0])}: ${inr(w[1])}">${i === peak && w[1] ? `<span class="hidden @tab:inline code mb-1">${inr(w[1])}</span>` : ""}<div class="w-full max-w-10 rounded-t-xs bg-chart-1 ${i === series.length - 1 ? "opacity-50" : ""}" style="height:${w[1] ? Math.max(2, (w[1] / max) * 100) : 0}%"></div></div>`).join("")}
        </div>
        ${
          every === 1
            ? `<div class="flex gap-1 @tab:gap-2 mt-1 ml-8">${series.map((w) => `<span class="flex-1 text-center text-caption text-muted-foreground truncate">${w[0]}</span>`).join("")}</div>`
            : `<div class="flex justify-between mt-1 ml-8 text-caption text-muted-foreground">${series
                .filter((_, i) => (series.length - 1 - i) % every === 0)
                .map((w) => `<span>${w[0]}</span>`)
                .join("")}</div>`
        }`;

  /* Lead → paid funnel for leads that came in during the period. */
  const has = (l, f) => B.invoices.ofLead(s, l.id).some(f);
  const funnel = [
    ["Leads", lNow.length],
    [
      "Replied",
      lNow.filter(
        (l) =>
          ["replied", "paid"].includes(l.status) || has(l, (i) => i.sharedAt)
      ).length,
    ],
    [
      "Agreed",
      lNow.filter((l) =>
        s.bookings.some(
          (x) =>
            x.leadId === l.id &&
            ["confirmed", "in_progress", "completed"].includes(x.status)
        )
      ).length,
    ],
    [
      "Invoiced",
      lNow.filter(
        (l) =>
          l.status === "paid" ||
          has(l, (i) => i.sharedAt && !B.invoices.isReplyLike(i))
      ).length,
    ],
    ["Paid", lNow.filter((l) => l.status === "paid").length],
  ];

  /* Top items: lines of invoices paid in the period (before GST). */
  const paidInv = [...new Set(paidNow.map((p) => p.invoiceId))]
    .map((id) => byId(s.invoices, id))
    .filter((i) => i && B.invoices.statusOf(s, i) === "paid");
  const items = {};
  for (const i of paidInv)
    for (const l of i.lines) {
      if (l.optional && !l.selected) continue;
      const k = l.name;
      items[k] ??= [k, 0, 0];
      items[k][1] += l.qty || 0;
      items[k][2] += (l.qty || 0) * (l.rate || 0);
    }
  const top = Object.values(items).sort((a, c) => c[2] - a[2]);

  const bm = B.sel.byMethod(s, d);
  const methods = Object.entries(bm)
    .sort((a, c) => c[1] - a[1])
    .map(([m, v], i) => [
      methodName(m === "null" ? null : m),
      v,
      ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4"][Math.min(i, 3)],
    ]);
  const mTotal = sum(methods, (m) => m[1]);

  /* Staff time booked in the period (hours of live bookings). */
  const mins = {};
  for (const b of s.bookings)
    if (
      LIVE_BOOKING(b) &&
      b.end &&
      b.memberId &&
      day(b.start) > from &&
      day(b.start) <= t
    )
      mins[b.memberId] =
        (mins[b.memberId] || 0) +
        Math.max(0, (new Date(b.end) - new Date(b.start)) / 60000);
  const staff = Object.entries(mins).sort((a, c) => c[1] - a[1]);
  const maxMin = Math.max(1, ...staff.map((x) => x[1]));

  return page(`
    ${toolbar(
      seg(ctx, "period", [
        ["7", "7 days"],
        ["30", "30 days"],
        ["90", "90 days"],
      ], "30"),
      `<button type="button" data-need="export" data-do="exportCsv" data-a-days="${d}" class="btn btn-outline">${I("download")}Export CSV</button>`
    )}
    <div data-rep-kpis>${kpis([
      {
        icon: "indian-rupee",
        t: "Paid",
        sub: `${inr(prevAmt)} ${prevLbl}`,
        v: inr(paidAmt),
        foot: vsFoot(cPaid),
        ...trend(cPaid),
      },
      {
        icon: "clock",
        t: "Money owed",
        sub: `${od.length} overdue`,
        v: inr(owedAmt),
        foot: `${plural(owed.length, "bill")} now`,
        tone: "text-warning",
      },
      {
        icon: "list-filter",
        t: "Lead → paid",
        sub: `${conv(lPrev)}% ${prevLbl}`,
        v: `${conv(lNow)}%`,
        foot: lNow.length && lPrev.length
          ? `${conv(lNow) - conv(lPrev) >= 0 ? "+" : ""}${conv(lNow) - conv(lPrev)} pts`
          : lNow.length ? "no earlier data" : "no leads",
        ...trend(lNow.length && lPrev.length ? conv(lNow) - conv(lPrev) : null),
      },
      {
        icon: "file-text",
        t: "Average invoice",
        sub: `${inr(avgPrev)} ${prevLbl}`,
        v: inr(avgNow),
        foot: vsFoot(change(avgNow, avgPrev)),
        ...trend(change(avgNow, avgPrev)),
      },
    ])}</div>
    <div class="flex justify-end -mt-2 @tab:hidden"><button type="button" data-need="export" data-do="exportCsv" data-a-days="${d}" class="btn btn-outline btn-sm">${I("download", "size-icon-sm")}Export CSV</button></div>
    <div class="grid @web:grid-cols-[1.4fr_1fr] gap-4">
      <div class="card p-card-sm @tab:p-card" data-rep-chart><p class="text-muted-foreground">${chartTitle}</p><p class="font-mono text-money-lg">${inr(sum(series, (x) => x[1]))}</p>
        ${chart}
        <p class="hint">${tbl ? "" : "The last bar is today so far. "}<button type="button" class="underline" data-ui="table" data-v="${tbl ? "0" : "1"}">${tbl ? "Show as chart" : "Show as table"}</button></p>
      </div>
      <div class="card p-card-sm @tab:p-card"><p class="text-muted-foreground">Lead → paid</p><p class="font-mono text-money-lg">${funnel[4][1]} <span class="text-caption text-muted-foreground font-sans">of ${plural(lNow.length, "lead")}</span></p>
        <div class="mt-4 space-y-2.5">${funnel.map((f) => `<div><div class="flex"><span>${f[0]}</span><span class="ml-auto code">${f[1]}</span></div><div class="mt-1 h-2 rounded-xs bg-muted"><div class="h-full rounded-xs bg-chart-1" style="width:${pct(f[1], lNow.length)}%"></div></div></div>`).join("")}</div>
      </div>
      ${dataTable(ctx, {
        key: "rep-top",
        icon: "trophy",
        title: "Top items",
        all: "catalog",
        compact: true,
        per: 5,
        cols: [
          { t: "Item", role: "title" },
          { t: "Sold", r: 1, m: 1, role: "sub" },
          { t: "Value before GST", r: 1, role: "end" },
        ],
        rows: top.map((x) => ({
          id: x[0],
          cells: [esc(x[0]), C(`${x[1]}×`), M(x[2])],
        })),
      })}
      <div class="card p-card-sm @tab:p-card"><p class="text-muted-foreground">Collected by method</p><p class="font-mono text-money-lg">${inr(mTotal)}</p>
        <div class="mt-3">${
          methods.length
            ? methods
                .map(
                  (m) =>
                    `<div class="flex items-center gap-3 h-row-sm"><span class="size-2 rounded-xs ${m[2]}"></span><span class="w-28">${m[0]}</span><div class="flex-1 h-2 rounded-xs bg-muted"><div class="h-full rounded-xs ${m[2]}" style="width:${pct(m[1], mTotal)}%"></div></div><span class="w-20 text-right">${M(m[1])}</span></div>`
                )
                .join("")
            : `<p class="text-muted-foreground">No payments approved in this period.</p>`
        }</div><p class="hint">Money in only in Phase 1; no expenses (D77). "Not recorded": older payments imported without a method.</p>
      </div>
      <div class="card p-card-sm @tab:p-card"><p class="text-muted-foreground mb-3">Staff time booked</p>
        ${
          staff.length
            ? staff
                .map(([m, v]) => {
                  const n = memberName(s, m);
                  return `<div class="flex items-center gap-3 h-row-sm">${av(initials(n))}<span class="w-16 truncate">${esc(first(n))}</span><div class="flex-1 h-2 rounded-xs bg-muted"><div class="h-full rounded-xs bg-chart-1" style="width:${pct(v, maxMin)}%"></div></div>${C(`${Math.round((v / 60) * 10) / 10} h`)}</div>`;
                })
                .join("")
            : `<p class="text-muted-foreground">No bookings in this period.</p>`
        }
        <p class="hint">Hours of bookings in the period. Share of working time needs the opening hours, which are not set yet.</p>
      </div>
    </div>`);
}

/* ---------- screens ---------- */
const owner = (ctx) => ctx.role === "owner" || ctx.role === "superadmin";

function todayPage(ctx, view = null) {
  const r = ctx.role;
  const staff = r === "staff";
  const dialogs =
    r === "accountant" || staff
      ? ""
      : shareCatalogDialog(ctx) +
        (owner(ctx) ? newInvoiceDialogs(ctx) : "");
  return app(
    ctx,
    "dashboard",
    {
      icon: staff ? "sun" : "layout-dashboard",
      title: staff ? "My day" : "Today",
      fab: owner(ctx) ? `${I("plus")}New invoice` : "",
      fabOpen: owner(ctx) ? "new-invoice" : "",
      dialogs,
    },
    staff ? page(myDay(ctx)) : dashboard(ctx, view)
  );
}

export default [
  {
    n: 9,
    area: "Workspace",
    id: "dashboard",
    name: "Today",
    route: "/w/:slug",
    action: "Today: numbers, chart, tables, action items",
    who: "All",
    notes:
      "Four KPI cards, paid chart beside Money owed, Leads to answer beside Today work, Recent invoices beside Recent activity. Owner: money. Manager: counts only, Team today, Jobs in service. Accountant: Who owes me, To approve, Paid in the last 7 days, Export. Staff: My day. Money in only (D77); every figure from biz.sel.",
    states: [
      ["Default", (ctx) => todayPage(ctx)],
      /* the first-run checklist against a brand-new workspace (D87) */
      ["First run", (ctx) => todayPage(ctx, freshView(ctx.s))],
    ],
    actions: { exportCsv },
    checks: [
      (t, h) => {
        const s = store.get();
        const fresh = freshView(s);
        const st = h.biz.settings.setupSteps(fresh);
        t(
          st.show &&
            st.count === 0 &&
            st.steps.length === 6 &&
            st.steps.every((x) => !x.done),
          "a brand-new workspace shows the checklist with nothing done"
        );
        fresh.items = s.items.slice(0, 3);
        fresh.workspace.address = "1 Main Road";
        fresh.workspace.upi = "shop@upi";
        const st2 = h.biz.settings.setupSteps(fresh);
        t(
          st2.steps.find((x) => x.key === "catalog").done &&
            st2.steps.find((x) => x.key === "details").done &&
            st2.count === 2,
          "steps are derived from the data (3 items, details with UPI)"
        );
        t(
          !h.biz.settings.setupSteps(s).show,
          "the sample (a reply already shared) has no checklist"
        );
        const f = h.at("dashboard", {}, "owner", "web", 1);
        t(
          f.querySelectorAll("[data-setup] [data-step]").length === 6 &&
            f.querySelector("[data-setup-count]")?.textContent.includes("0 of 6"),
          "First run state shows 6 steps, 0 of 6"
        );
        t(
          !h.at("dashboard", {}, "manager", "web", 1).querySelector("[data-setup]"),
          "only the Owner sees the checklist"
        );
        const own = { role: "owner", memberId: s.meta.people.owner };
        let refused = false;
        try {
          h.biz.settings.dismissSetup(s, {}, {
            role: "manager",
            memberId: s.meta.people.manager,
          });
        } catch {
          refused = true;
        }
        h.biz.settings.dismissSetup(s, {}, own);
        t(
          refused &&
            !h.biz.settings.setupSteps({ ...fresh, workspace: { ...fresh.workspace, setupDismissed: true } }).show &&
            s.workspace.setupDismissed === true,
          "Hide is Owner only and keeps it hidden"
        );
      },
      (t, h) => {
        const s = store.get();
        const own = { role: "owner", memberId: s.meta.people.owner };
        const waiting = h.biz.leads.toAnswer(s);
        const last = waiting[waiting.length - 1];
        h.biz.leads.setPriority(s, { id: last.id, priority: "high" }, own);
        t(
          h.biz.leads.toAnswer(s)[0].id === last.id,
          "a high-priority lead comes first in Leads to answer"
        );
        t(
          Boolean(
            h.at("dashboard").querySelector(
              `[data-table="dash-leads"] tr[data-row="${last.id}"]`
            )
          ),
          "it shows on Today"
        );
      },
      (t, h) => {
        const f = h.at("dashboard");
        const k = h.biz.sel.kpis(store.get());
        for (const key of ["collect", "overdue", "approve", "paid30"])
          t(
            f
              .querySelector(`[data-kpi="${key}"] [data-v]`)
              ?.textContent.trim() === inr(k[key].amount),
            `Today KPI "${key}" equals biz.sel.kpis (${inr(k[key].amount)})`
          );
        t(
          f
            .querySelector("[data-waiting]")
            ?.textContent.includes(plural(k.leadsToAnswer, "lead")),
          "greeting counts the leads to answer"
        );
        t(
          f.querySelectorAll('[data-table="dash-leads"] tr[data-row]')
            .length === Math.min(10, h.biz.leads.toAnswer(store.get()).length),
          "Leads to answer lists every lead to answer"
        );
        t(
          Boolean(
            f.querySelector('main [data-open="share-catalog"]') &&
            f.querySelector('main [data-open="new-invoice"]') &&
            f.querySelector('main [data-go="leads"][data-then="price-reply"]')
          ),
          "greeting quick jobs: share catalog, new invoice, send reply"
        );
        t(
          f
            .querySelector('[data-chart="paid"]')
            ?.textContent.includes(
              inr(h.biz.sel.paidWeeks(store.get(), 6).total)
            ),
          "chart total equals biz.sel.paidWeeks"
        );
      },
      (t, h) => {
        const m = h.at("dashboard", {}, "manager");
        t(
          !m.querySelector("[data-kpi=collect]") &&
            m
              .querySelector("[data-kpi=bookings] [data-v]")
              ?.textContent.trim() ===
              String(bookingsOn(store.get(), store.get().meta.today).length),
          "Manager sees counts only (bookings today from the data)"
        );
        const a = h.at("dashboard", {}, "accountant");
        t(
          Boolean(a.querySelector('[data-do="exportCsv"]')) &&
            a.querySelectorAll('[data-table="dash-owes"] tr[data-row]')
              .length === Math.min(10, h.biz.sel.whoOwes(store.get()).length),
          "Accountant sees Who owes me and Export"
        );
        const st = h.at("dashboard", {}, "staff");
        t(
          st.textContent.includes("My day") && !st.querySelector("[data-kpi]"),
          "Staff sees My day"
        );
      },
      (t, h) => {
        const s = store.get();
        const out = buildCsv({ s, biz: h.biz }, null);
        const lines = out.text.split("\n");
        t(
          out.invoices === s.invoices.filter((i) => !i.cancelled).length &&
            out.payments === s.payments.length &&
            lines.length === out.invoices + out.payments + 5 &&
            lines[1].startsWith("Number,Kind,Customer"),
          "Export CSV has a row for every invoice and payment"
        );
        const r = run(
          "exportCsv",
          {},
          { role: "staff", memberId: s.meta.people.staff },
          {
            exportCsv: (args, c) => exportCsv({ ...c, s, biz: h.biz }, args),
          }
        );
        t(!r.ok, "Staff cannot export");
      },
    ],
  },
  {
    n: 10,
    area: "Workspace",
    id: "board",
    name: "Board",
    route: "/w/:slug/pipeline",
    action: "Drag record between stages",
    who: "Owner, Manager, Staff",
    notes:
      "New → Replied → Booked → In service → Invoiced → Paid (D65). Drag runs the real action when one action can do it (booked lead → Booked confirms it, Booked → In service starts the job, In service → Invoiced bills it); any other move snaps back with the reason. An extra, switched on in Settings (D63, Lite mode). Phone scrolls one column at a time.",
    render: (ctx) =>
      app(ctx, "board", { icon: "square-kanban", title: "Board" }, board(ctx)),
    checks: [
      (t, h) => {
        const f = h.at("board");
        const s = store.get();
        const cards = h.biz.board.cards(s);
        t(
          h.biz.board.COLUMNS.every(
            ([key]) =>
              f.querySelectorAll(`[data-board-col="${key}"] > [data-card]`)
                .length === cards.filter((c) => c.col === key).length
          ),
          "every lead card sits in its D65 column"
        );
        const ctxOwner = { role: "owner", memberId: s.meta.people.owner };
        const quoted = cards.find(
          (c) => c.col === "new" && c.lead.type === "quoted"
        )?.lead;
        if (quoted) {
          const r = run("board.move", { id: quoted.id, to: "paid" }, ctxOwner);
          const g = h.at("board");
          t(
            !r.ok &&
              Boolean(
                g.querySelector(
                  `[data-board-col="new"] [data-card="${quoted.id}"]`
                )
              ),
            "a refused drag leaves the card in its column"
          );
        } else t(false, "sample has a quoted lead in New");
        const booked = h.biz.board
          .cards(store.get())
          .find(
            (c) =>
              c.col === "new" && c.lead.type === "booked" && c.lead.assigneeId
          )?.lead;
        if (booked) {
          const r = run(
            "board.move",
            { id: booked.id, to: "booked" },
            ctxOwner
          );
          const g = h.at("board");
          t(
            r.ok &&
              Boolean(
                g.querySelector(
                  `[data-board-col="booked"] [data-card="${booked.id}"]`
                )
              ) &&
              !g.querySelector(
                `[data-board-col="new"] [data-card="${booked.id}"]`
              ),
            "an allowed move (booked lead with an assignee, New → Booked) changes its column"
          );
        } else t(false, "sample has a booked lead with an assignee in New");
      },
      (t, h) => {
        h.at("board", {}, "staff");
        const ui = h.makeCtx(store.get(), "board", "staff", {}).ui;
        ui.who = "mine";
        const f = h.at("board", {}, "staff");
        const s = store.get();
        const me = s.meta.people.staff;
        const shown = [...f.querySelectorAll("[data-card]")].map(
          (x) => x.dataset.card
        );
        t(
          shown.length > 0 &&
            shown.every((id) => {
              const l = byId(s.leads, id);
              return (
                l.assigneeId === me ||
                s.bookings.some((x) => x.leadId === id && x.memberId === me) ||
                s.jobs.some((j) => j.leadId === id && j.assigneeId === me)
              );
            }) &&
            shown.length < h.biz.board.cards(s).length,
          "Mine shows only my cards"
        );
        ui.who = "all";
        run(
          "settings.saveModules",
          { board: false },
          { role: "owner", memberId: s.meta.people.owner }
        );
        const lite = h.at("board");
        t(
          Boolean(lite.querySelector("[data-lite]")) &&
            !lite.querySelector("[data-board-col]") &&
            Boolean(lite.querySelector('[data-do="settings.saveModules"]')),
          "Lite mode: the Board explains how to switch it on"
        );
        run(
          "settings.saveModules",
          { board: true },
          { role: "owner", memberId: s.meta.people.owner }
        );
        t(
          Boolean(h.at("board").querySelector("[data-board-col]")),
          "switching the Board on shows the columns again"
        );
      },
    ],
  },
  {
    n: 28,
    area: "Reports",
    id: "reports",
    name: "Reports",
    route: "/w/:slug/reports",
    action: "Export CSV",
    who: "Owner, Accountant",
    notes:
      "Paid, money owed, lead → paid, average invoice, paid per day or week, top items, collected by method, staff time booked (3.6). Period 7, 30 or 90 days. Export CSV downloads the invoices and payments of the period. Money in only (D77).",
    render: (ctx) =>
      app(
        ctx,
        "reports",
        { icon: "chart-column", title: "Reports" },
        reports(ctx)
      ),
    actions: { exportCsv },
    checks: [
      (t, h) => {
        const s = store.get();
        const owedAmt = sum(h.biz.sel.owed(s), (i) =>
          h.biz.invoices.open(s, i)
        );
        const f = h.at("reports");
        t(
          f
            .querySelector("[data-rep-kpis]")
            ?.textContent.includes(inr(owedAmt)),
          "Reports money owed equals biz.sel.owed"
        );
        const ui = h.makeCtx(s, "reports", "owner", {}).ui;
        for (const d of [7, 30, 90]) {
          ui.period = String(d);
          const g = h.at("reports");
          const paid = sum(
            approvedIn(s, addDays(s.meta.today, -d), s.meta.today),
            (p) => p.amount
          );
          t(
            g
              .querySelector("[data-rep-kpis] .kpi-std .font-mono")
              ?.textContent.trim() === inr(paid) &&
              g.querySelector(`[data-do="exportCsv"][data-a-days="${d}"]`),
            `period ${d} days: Paid is ${inr(paid)} and Export uses the period`
          );
        }
        ui.table = "1";
        t(
          Boolean(h.at("reports").querySelector("[data-rep-chart] table")),
          "Show as table shows the figures as a table"
        );
        ui.table = "0";
        ui.period = "30";
      },
    ],
  },
];
