/* NOTIFY: Approve-from-email page (D57, D87, WBS 2.6) and the notification Inbox with per-user mute (D87,
   WBS 2.9). Both read biz.notify; approving and rejecting go through biz.payments, so every approval rule
   (D57, D73, D74, D76) applies here exactly as on the Approvals screen. */
import * as store from "../core/store.js";
import { byId, esc, fmtDate, fmtTime } from "../core/util.js";
import { call } from "../ui/actions.js";
import {
  I,
  C,
  M,
  empty,
  inr,
  link,
  lockup,
  page,
  pill,
  seg,
  textarea,
  toggle,
} from "../ui/kit.js";
import { app } from "../ui/shell.js";

const DRAFT = `<span class="italic">[Draft wording, owner to approve]</span>`;
const nameOf = (s, id) => byId(s.members, id)?.name || "";
const first = (n) => String(n || "").split(" ")[0];
const noOf = (i) => i?.invNumber || i?.piNumber || "Draft";
const payOf = (ctx) => {
  const s = ctx.s;
  return (
    byId(s.payments, ctx.params.id) || ctx.biz.payments.pending(s)[0] || null
  );
};
/* Minimal Biz4Kit chrome, as Sign in / Accept invite: no sidebar. */
const frame = (s, body) =>
  `<div class="h-full overflow-y-auto flex items-start @tab:items-center justify-center bg-sidebar p-4">
    <div class="card w-full max-w-md p-card @tab:p-page shadow-lg">
      <div class="flex items-center gap-2">${lockup("h-6")}<span class="ml-auto text-caption text-muted-foreground truncate">${esc(s.workspace.name)}</span></div>
      ${body}
    </div></div>`;

/* ---------- approve-from-email ---------- */
function linkPage(ctx) {
  const s = ctx.s;
  const B = ctx.biz;
  const pay = payOf(ctx);
  if (!pay)
    return frame(
      s,
      `<div data-link-state="none">${empty("badge-check", "Nothing waiting", "Every payment proof has been approved or rejected.", `<a ${link("approvals")} class="btn btn-outline">Open Approvals</a>`)}</div>`
    );
  const inv = byId(s.invoices, pay.invoiceId) || {};
  const c = byId(s.customers, inv.customerId);
  const state = B.notify.linkState(s, pay);
  const by = pay.byCustomer
    ? "the customer"
    : nameOf(s, pay.uploadedBy) || "recorded";
  const row = (k, v) =>
    `<div class="flex gap-3 py-2 border-b border-border last:border-0"><span class="w-28 shrink-0 text-muted-foreground">${k}</span><span class="ml-auto text-right font-medium min-w-0">${v}</span></div>`;
  const facts = `<div class="mt-3 rounded-control border border-border px-3">
      ${row("Customer", esc(c?.name || ""))}
      ${row("Invoice", C(noOf(inv)))}
      ${row("Amount", M(pay.amount))}
      ${row("Method", esc(B.payments.METHODS[pay.method] || "Payment"))}
      ${row("Reference", pay.reference ? C(pay.reference) : "—")}
      ${row("Proof", esc(pay.proof?.name || "No file"))}
      ${row("Uploaded", `${esc(by)}${pay.uploadedAt ? `, ${fmtDate(pay.uploadedAt)}${fmtTime(pay.uploadedAt) ? ` ${fmtTime(pay.uploadedAt)}` : ""}` : ""}`)}
      ${row("Open balance", M(B.invoices.open(s, inv)))}
    </div>`;
  let act;
  if (state === "used")
    act = `<div class="mt-4 p-3 rounded-control bg-muted flex items-start gap-2" data-link-state="used">${I("circle-check", "size-icon mt-0.5")}<div><p class="font-medium">Already decided</p><p class="text-caption text-muted-foreground">${pill(pay.status)} ${pay.decidedBy ? `by ${esc(first(nameOf(s, pay.decidedBy)))}` : ""}${pay.decidedAt ? `, ${fmtDate(pay.decidedAt)}` : ""}. This link works once (D57).</p></div></div>
      <a ${link("invoice", { id: inv.id })} class="mt-3 btn btn-outline w-full">${I("receipt")}Open ${esc(noOf(inv))}</a>`;
  else if (state === "expired")
    act = `<div class="mt-4 p-3 rounded-control bg-warning-soft text-warning flex items-start gap-2" data-link-state="expired">${I("clock", "size-icon mt-0.5")}<div><p class="font-medium">This link has expired</p><p class="text-caption">Email links last 48 hours from the upload (D57). The payment still waits in Approvals.</p></div></div>
      <a ${link("approvals", { id: pay.id })} class="mt-3 btn btn-primary w-full">${I("badge-check")}Open Approvals</a>`;
  else {
    const why = B.payments.cannotApprove(s, pay, ctx);
    const whyReject = B.payments.cannotApprove(
      s,
      { ...pay, uploadedBy: null },
      ctx
    );
    act = `<div data-link-state="ok">
      ${why ? `<p class="mt-4 p-3 rounded-control bg-muted flex gap-2" data-refusal>${I("info", "size-icon mt-0.5")}<span>${esc(why)}</span></p>` : `<button type="button" class="mt-4 btn btn-primary btn-lg w-full" data-do="linkApprove" data-a-id="${esc(pay.id)}">${I("badge-check")}Approve ${inr(pay.amount)}</button>`}
      ${whyReject ? "" : `<form data-do="linkReject" data-a-id="${esc(pay.id)}" class="mt-3"><label class="flabel" for="al-note">Or reject with a note</label>${textarea("note", { id: "al-note", rows: 2, placeholder: "What is wrong with the proof" })}<button type="submit" class="mt-2 btn btn-outline w-full text-destructive">${I("circle-x")}Reject</button></form>`}
      <p class="mt-3 hint">This link works once and lasts 48 hours from the upload (D57).</p></div>`;
  }
  return frame(
    s,
    `<h1 class="mt-4 font-sans text-heading font-semibold">Payment proof waiting</h1>
    <p class="text-muted-foreground">Check the proof, then approve or reject. Approved payments count as paid; the tax invoice number comes when the total is covered (D71).</p>
    ${facts}${act}`
  );
}

/* The email the approver gets (sender: the business name, D35). */
function emailPreview(ctx) {
  const s = ctx.s;
  const B = ctx.biz;
  const pay = payOf(ctx);
  if (!pay) return linkPage(ctx);
  const inv = byId(s.invoices, pay.invoiceId) || {};
  const c = byId(s.customers, inv.customerId);
  const to = B.payments.approvers(s, pay);
  const by = pay.byCustomer
    ? c?.name || "The customer"
    : nameOf(s, pay.uploadedBy) || "Someone";
  return `<div class="h-full overflow-y-auto bg-muted p-4 @tab:p-page"><div class="mx-auto max-w-xl card overflow-hidden" data-email>
    <div class="px-5 py-3 border-b border-border text-caption space-y-0.5">
      <p><span class="text-muted-foreground">From</span> ${esc(s.workspace.name)}</p>
      <p><span class="text-muted-foreground">To</span> ${esc(to.map((m) => m.email).join(", ") || "the Owner")}</p>
      <p><span class="text-muted-foreground">Subject</span> <span class="font-medium">Payment proof waiting: ${esc(noOf(inv))} · ${inr(pay.amount)}</span></p>
    </div>
    <div class="px-5 py-5 space-y-3">
      <p>Hi ${esc(first(to[0]?.name) || "there")},</p>
      <p>${esc(by)} recorded ${inr(pay.amount)} from ${esc(c?.name || "a customer")} on ${esc(noOf(inv))}. Check the proof and approve or reject it.</p>
      <div class="flex gap-2"><a ${link("approve-link", { id: pay.id })} class="btn btn-primary">${I("badge-check")}Approve or reject</a></div>
      <p class="text-caption text-muted-foreground">The link works once and lasts 48 hours (D57). ${DRAFT}</p>
    </div></div></div>`;
}

/* ---------- inbox ---------- */
function inboxPage(ctx) {
  const s = ctx.s;
  const N = ctx.biz.notify;
  const all = N.feed(s, ctx);
  const n = all.filter((x) => x.unread).length;
  const tab = ctx.ui.tab === "unread" ? "unread" : "all";
  const list = tab === "unread" ? all.filter((x) => x.unread) : all;
  const ro = ctx.role === "superadmin" || !ctx.memberId;
  const me = ctx.memberId ? byId(s.members, ctx.memberId) : null;
  const mine = Object.entries(N.KINDS).filter(([, k]) =>
    k[2].includes(ctx.role)
  );
  const items = list.length
    ? `<ul class="divide-y divide-border" data-inbox>${list
        .map(
          (x) =>
            `<li><a ${link(x.go, { id: x.id })} data-key="${esc(x.key)}" data-kind="${x.kind}" class="flex items-start gap-3 px-4 py-3 hover:bg-muted ${x.unread ? "" : "text-muted-foreground"}">${I(x.icon, "size-icon mt-0.5 shrink-0")}<span class="min-w-0 flex-1"><span class="block ${x.unread ? "font-medium text-foreground" : ""}">${esc(x.text)}</span><span class="block text-caption text-muted-foreground">${esc(N.KINDS[x.kind][0])} · ${fmtDate(x.at)}${x.at.slice(11) !== "00:00" && x.at.slice(11) !== "23:59" ? ` ${x.at.slice(11)}` : ""}</span></span>${x.unread ? `<span class="mt-1.5 size-2 rounded-pill bg-info shrink-0" aria-label="Unread"></span>` : ""}</a></li>`
        )
        .join("")}</ul>`
    : empty(
        "bell",
        tab === "unread" ? "Nothing unread" : "Nothing needs you",
        "New leads, payments to approve, overdue bills, bookings to confirm, finished jobs and expiring replies show here."
      );
  const mutePanel = ro
    ? ""
    : `<div class="card p-card-sm" data-mute><p class="font-medium">What shows here</p><p class="text-caption text-muted-foreground">Only for you. Off hides it from this list and the bell count.</p>
      <form data-do="notify.saveMute" data-autosubmit class="mt-2 divide-y divide-border">${mine
        .map(
          ([k, v]) =>
            `<label class="flex items-center gap-3 py-2">${I(v[1], "size-icon-sm text-muted-foreground")}<span class="flex-1">${esc(v[0])}</span>${toggle(k, !me?.mute?.[k], { label: v[0] })}</label>`
        )
        .join("")}</form></div>`;
  return page(`<div class="flex flex-wrap items-center gap-2">${seg(
    ctx,
    "tab",
    [
      ["all", `All (${all.length})`],
      ["unread", `Unread (${n})`],
    ],
    "all"
  )}${!ro && n ? `<button type="button" class="ml-auto btn btn-outline btn-sm" data-do="notify.markRead">${I("check-check", "size-icon-sm")}Mark all read</button>` : ""}</div>
    <div class="grid @web:grid-cols-[1fr_var(--size-aside)] gap-4 items-start"><div class="card overflow-hidden">${items}</div>${mutePanel}</div>`);
}

/* ---------- checks ---------- */
const OWNER = (s) => ({ role: "owner", memberId: s.meta.people.owner });
const STAFF = (s) => ({ role: "staff", memberId: s.meta.people.staff });

export default [
  {
    n: 37,
    area: "Payments",
    id: "approve-link",
    name: "Approve from email",
    route: "/a/:token",
    action: "Approve or reject a payment proof",
    who: "Owner, Manager",
    notes:
      "Landing page of the proof-waiting email (D57, D87): one payment, the same approval rules as the Approvals screen. The link lasts 48 h from the upload and works once; after that it says expired or already decided.",
    sample: { id: "P1" },
    states: [
      ["Link", (ctx) => linkPage(ctx)],
      ["Email", (ctx) => emailPreview(ctx)],
    ],
    actions: {
      linkApprove: (ctx, { id }) =>
        call(
          "Payments: approve (email link)",
          (s, c) => ctx.biz.payments.approve(s, { id }, c),
          ctx
        ),
      linkReject: (ctx, { id, note }) =>
        call(
          "Payments: reject (email link)",
          (s, c) => ctx.biz.payments.reject(s, { id, note: note || "" }, c),
          ctx
        ),
    },
    checks: [
      (t, h) => {
        const s = store.get();
        t(
          h
            .at("approve-link", { id: "P1" })
            .querySelector('[data-link-state="ok"]'),
          "a fresh link shows Approve / Reject"
        );
        const m = h.at("approve-link", { id: "P1" }, "manager");
        t(
          m
            .querySelector("[data-refusal]")
            ?.textContent.includes("Managers approve payments below") &&
            !m.querySelector('[data-do="linkApprove"]'),
          "a Manager at or above the limit sees the refusal, no Approve button"
        );
        const p2 = s.payments.find((p) => p.id === "P2");
        const keep = p2.uploadedAt;
        p2.uploadedAt = "2026-10-15T09:00:00+05:30";
        t(
          h
            .at("approve-link", { id: "P2" })
            .querySelector('[data-link-state="expired"]'),
          "an upload more than 48 h ago shows the link expired"
        );
        p2.uploadedAt = keep;
        h.at("approve-link", { id: "P1" })
          .querySelector('[data-do="linkApprove"]')
          .click();
        t(
          store.get().payments.find((p) => p.id === "P1").status === "approved",
          "Approve on the page approves the payment"
        );
        t(
          h
            .at("approve-link", { id: "P1" })
            .querySelector('[data-link-state="used"]'),
          "the link then says already decided (single use)"
        );
        const e = h.at("approve-link", { id: "P2" }, "owner", "web", 1);
        t(
          e
            .querySelector("[data-email]")
            ?.textContent.includes(store.get().workspace.name),
          "the email comes from the business name (D35)"
        );
      },
    ],
  },
  {
    n: 38,
    area: "Home",
    id: "inbox",
    name: "Notifications",
    route: "/w/:slug/inbox",
    action: "Open what needs you; mute a kind",
    who: "All",
    notes:
      "Derived from the data, not a stored feed (D87, WBS 2.9): new leads, payments to approve (only for those who may approve), overdue bills, bookings to confirm, jobs done without an invoice, replies expiring in 2 days. Unread since you last marked read; per-user mute hides a kind from the list and the bell.",
    render: (ctx) =>
      app(
        ctx,
        "inbox",
        { icon: "bell", title: "Notifications" },
        inboxPage(ctx)
      ),
    checks: [
      (t, h) => {
        const s = store.get();
        const N = h.biz.notify;
        t(
          h.at("inbox").querySelector('[data-key="pay:P1"]'),
          "the Owner sees the payment waiting for approval"
        );
        t(
          !h.at("inbox", {}, "staff").querySelector('[data-kind="approval"]'),
          "Staff do not get approval items"
        );
        t(N.unread(s, OWNER(s)) > 0, "the Owner starts with unread items");
        t(
          h.at("inbox").querySelector("[data-bell] .count"),
          "the bell shows the unread count"
        );
        N.saveMute(s, { approval: false }, OWNER(s));
        t(
          !h.at("inbox").querySelector('[data-kind="approval"]'),
          "muting a kind hides it"
        );
        t(
          N.feed(s, STAFF(s)).length > 0 &&
            !s.members.find((m) => m.id === s.meta.people.staff).mute,
          "mute is per person"
        );
        N.markRead(s, {}, OWNER(s));
        t(
          N.unread(s, OWNER(s)) === 0 &&
            !h.at("inbox").querySelector("[data-bell] .count"),
          "Mark all read clears the count"
        );
      },
    ],
  },
];
