/* Notifications (D87, WBS 2.9) and the approve-from-email link (D57, WBS 2.6).
   The inbox is DERIVED from the state, never a stored feed: each item points at a record that needs someone.
   Per member: seenAt (what "unread" is measured from) and mute { kind: true } (kinds hidden from list and count).
   The approver's email link lasts 48 h from the upload and works once (D57); its state is derived too. */
import { addDays, byId, fail, fmtDate, fmtTime, inr, today } from "../core/util.js";
import * as inv from "./invoices.js";
import { toAnswer } from "./leads.js";
import { cannotApprove, pending } from "./payments.js";
import { overdue } from "./selectors.js";

/* Kinds, in the order the mute panel lists them: [label, icon, roles that get them]. */
const ALL = ["superadmin", "owner", "manager", "staff", "accountant"];
export const KINDS = {
  lead: ["New leads to answer", "inbox", ALL],
  approval: [
    "Payments waiting for approval",
    "badge-check",
    ["superadmin", "owner", "manager"],
  ],
  overdue: [
    "Overdue bills",
    "circle-alert",
    ["superadmin", "owner", "manager", "accountant"],
  ],
  booking: ["Bookings to confirm", "calendar-clock", ALL],
  job: [
    "Jobs done, invoice to send",
    "wrench",
    ["superadmin", "owner", "manager", "staff"],
  ],
  expiring: [
    "Replies expiring in 2 days",
    "calendar-x",
    ["superadmin", "owner", "manager", "staff"],
  ],
};

/* Stamps compare as "YYYY-MM-DDTHH:MM"; a bare date is the start of that day. Nothing is later than today. */
const stamp = (x) => {
  const v = String(x || "");
  return v.length > 10 ? v.slice(0, 16) : `${v.slice(0, 10)}T00:00`;
};
const clamp = (s, x) => {
  const end = `${today(s)}T23:59`;
  const v = stamp(x);
  return v > end ? end : v;
};

/* Every item for this viewer, newest first, before mute: { key, kind, icon, text, at, go, id }. */
export function items(s, ctx) {
  const role = ctx.role;
  const out = [];
  const add = (kind, key, text, at, go, id) => {
    if (!KINDS[kind][2].includes(role)) return;
    out.push({
      key,
      kind,
      icon: KINDS[kind][1],
      text,
      at: clamp(s, at),
      go,
      id,
    });
  };
  const cust = (id) => byId(s.customers, id)?.name || "A customer";
  for (const l of toAnswer(s))
    add(
      "lead",
      `lead:${l.id}`,
      `${cust(l.customerId)}: ${l.brief || "new request"}`,
      l.createdAt,
      "lead",
      l.id
    );
  for (const p of pending(s)) {
    /* A Manager sees only what they could approve (below the limit, when turned on, D57). */
    if (role === "manager" && cannotApprove(s, { ...p, uploadedBy: null }, ctx))
      continue;
    const i = byId(s.invoices, p.invoiceId);
    add(
      "approval",
      `pay:${p.id}`,
      `${cust(i?.customerId)} paid ${inr(p.amount)} on ${inv.numberOf(i || {})}: check the proof`,
      p.uploadedAt,
      "approvals",
      p.id
    );
  }
  for (const i of overdue(s))
    add(
      "overdue",
      `od:${i.id}`,
      `${inv.numberOf(i)} for ${cust(i.customerId)} is ${inv.daysOverdue(s, i)} days overdue`,
      addDays(i.dueDate, 1),
      "invoice",
      i.id
    );
  for (const b of s.bookings.filter((x) => x.status === "tentative")) {
    const lead = b.leadId ? byId(s.leads, b.leadId) : null;
    add(
      "booking",
      `bk:${b.id}`,
      `${cust(b.customerId)} on ${fmtDate(b.start)}${fmtTime(b.start) ? ` ${fmtTime(b.start)}` : ""}: booking still To confirm`,
      lead?.createdAt || b.start,
      "bookings",
      b.id
    );
  }
  if (s.workspace.modules?.jobs !== false)
    for (const j of s.jobs.filter((x) => x.status === "done" && !x.invoiceId))
      add(
        "job",
        `job:${j.id}`,
        `${j.title} for ${cust(j.customerId)} is done: send the invoice`,
        j.completedAt,
        "job",
        j.id
      );
  const t = today(s);
  for (const i of inv
    .live(s)
    .filter(
      (x) =>
        inv.isReplyLike(x) &&
        inv.statusOf(s, x) === "awaiting" &&
        x.payBy &&
        x.payBy >= t &&
        x.payBy <= addDays(t, 2)
    ))
    add(
      "expiring",
      `exp:${i.id}`,
      `${inv.numberOf(i)} for ${cust(i.customerId)} expires ${i.payBy}`,
      addDays(i.payBy, -2),
      "invoice",
      i.id
    );
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

const memberOf = (s, ctx) =>
  ctx.memberId ? byId(s.members, ctx.memberId) : null;
/* The viewer's list after mute, each marked unread when newer than their seenAt. */
export function feed(s, ctx) {
  const m = memberOf(s, ctx);
  const mute = m?.mute || {};
  const seen = m?.seenAt ? stamp(m.seenAt) : "";
  return items(s, ctx)
    .filter((x) => !mute[x.kind])
    .map((x) => ({ ...x, unread: !seen || x.at > seen }));
}
export const unread = (s, ctx) => feed(s, ctx).filter((x) => x.unread).length;

const self = (s, ctx) => {
  if (ctx.role === "superadmin") fail("Support view is read-only.");
  return memberOf(s, ctx) || fail("Sign in first.");
};
/* Everything up to the end of today counts as seen (the sample clock is meta.today). */
export function markRead(s, _a, ctx) {
  const m = self(s, ctx);
  m.seenAt = `${today(s)}T23:59`;
  return { text: "All notifications marked as read" };
}
/* args: one flag per kind, true = show (toggle on), false = mute. */
export function saveMute(s, a, ctx) {
  const m = self(s, ctx);
  const mute = { ...(m.mute || {}) };
  for (const k of Object.keys(KINDS))
    if (a[k] !== undefined)
      mute[k] = !(a[k] === true || a[k] === "on" || a[k] === "true");
  m.mute = mute;
  const off = Object.keys(KINDS).filter((k) => mute[k]);
  return {
    text: off.length
      ? `Muted: ${off.map((k) => KINDS[k][0]).join(", ")}`
      : "All notifications on",
  };
}

/* ---------- approve-from-email link (D57: 48 h, single use) ---------- */
const ms = (x) => {
  const v = String(x || "");
  const iso = v.length > 10 ? v : `${v.slice(0, 10)}T00:00:00`;
  return Date.parse(/[+-]\d\d:\d\d$|Z$/.test(iso) ? iso : `${iso}+05:30`);
};
/* "ok", "used" (decided already) or "expired" (more than 48 h from the upload to the end of today). */
export function linkState(s, pay) {
  if (!pay) return "none";
  if (pay.status !== "pending") return "used";
  const end = ms(`${today(s)}T23:59:59`);
  return end - ms(pay.uploadedAt) > 48 * 3_600_000 ? "expired" : "ok";
}
