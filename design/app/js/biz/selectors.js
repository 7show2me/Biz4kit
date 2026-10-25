/* Read-only figures for Today, Overdue, Approvals and Reports. Money in only (D77); every figure comes from
   the same data, so the same number shows the same on every page. */
import { addDays, byId, daysBetween, sum, today } from "../core/util.js";
import * as inv from "./invoices.js";
import * as leads from "./leads.js";
import * as pay from "./payments.js";

const day = (stamp) => String(stamp || "").slice(0, 10);

/* Bills owed now (D75: replies are not money owed). */
export const owed = (s) => inv.live(s).filter((i) => inv.isOwed(s, i));
export const overdue = (s) =>
  owed(s)
    .filter((i) => inv.statusOf(s, i) === "overdue")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

export function kpis(s) {
  const t = today(s);
  const week = addDays(t, 7);
  const collect = owed(s).filter(
    (i) => inv.statusOf(s, i) !== "pending" && i.dueDate && i.dueDate <= week
  );
  const od = overdue(s);
  const pend = pay.pending(s);
  const approved = s.payments.filter(
    (p) => p.status === "approved" && p.decidedAt
  );
  const inRange = (p, from, to) =>
    day(p.decidedAt) > from && day(p.decidedAt) <= to;
  const last30 = approved.filter((p) => inRange(p, addDays(t, -30), t));
  const prev30 = approved.filter((p) =>
    inRange(p, addDays(t, -60), addDays(t, -30))
  );
  const paid30 = sum(last30, (p) => p.amount);
  const paidPrev = sum(prev30, (p) => p.amount);
  return {
    collect: {
      amount: sum(collect, (i) => inv.open(s, i)),
      count: collect.length,
      late: collect.filter((i) => inv.statusOf(s, i) === "overdue").length,
    },
    overdue: {
      amount: sum(od, (i) => inv.open(s, i)),
      count: od.length,
      oldest: od.length ? inv.daysOverdue(s, od[0]) : 0,
    },
    approve: {
      amount: sum(pend, (p) => p.amount),
      count: pend.length,
      oldest: pend.length
        ? Math.max(...pend.map((p) => daysBetween(day(p.uploadedAt), t)))
        : 0,
    },
    paid30: {
      amount: paid30,
      count: last30.length,
      prev: paidPrev,
      change: paidPrev
        ? Math.round(((paid30 - paidPrev) / paidPrev) * 1000) / 10
        : null,
      diff: paid30 - paidPrev,
    },
    leadsToAnswer: leads.toAnswer(s).length,
  };
}

/* Paid per week for the last n weeks and the n weeks before (Today chart). */
export function paidWeeks(s, n = 6) {
  const t = today(s);
  const approved = s.payments.filter(
    (p) => p.status === "approved" && p.decidedAt
  );
  const bucket = (k) => {
    const to = addDays(t, -7 * k);
    const from = addDays(to, -7);
    return sum(
      approved.filter((p) => day(p.decidedAt) > from && day(p.decidedAt) <= to),
      (p) => p.amount
    );
  };
  const now = [],
    before = [];
  for (let k = n - 1; k >= 0; k--) now.push(bucket(k));
  for (let k = 2 * n - 1; k >= n; k--) before.push(bucket(k));
  return { now, before, total: sum(now) };
}

/* Paid per day for the last n days (bar chart). */
export function paidDays(s, n = 14) {
  const t = today(s);
  const approved = s.payments.filter(
    (p) => p.status === "approved" && p.decidedAt
  );
  const out = [];
  for (let k = n - 1; k >= 0; k--) {
    const d = addDays(t, -k);
    out.push({
      date: d,
      amount: sum(
        approved.filter((p) => day(p.decidedAt) === d),
        (p) => p.amount
      ),
    });
  }
  return out;
}

/* Who owes what (customer totals of owed bills). */
export function whoOwes(s) {
  const by = {};
  for (const i of owed(s)) {
    by[i.customerId] ??= {
      customer: byId(s.customers, i.customerId),
      amount: 0,
      count: 0,
      overdue: 0,
    };
    by[i.customerId].amount += inv.open(s, i);
    by[i.customerId].count += 1;
    if (inv.statusOf(s, i) === "overdue") by[i.customerId].overdue += 1;
  }
  return Object.values(by).sort((a, b) => b.amount - a.amount);
}

/* Paid by method over a period (Reports). */
export function byMethod(s, days = 30) {
  const t = today(s);
  const out = {};
  for (const p of s.payments.filter(
    (x) => x.status === "approved" && day(x.decidedAt) > addDays(t, -days)
  ))
    out[p.method] = (out[p.method] || 0) + p.amount;
  return out;
}

/* Customer totals for the customer list and timeline. */
export function customerStats(s, c) {
  const list = inv.ofCustomer(s, c.id);
  return {
    invoices: list.length,
    owed: sum(
      list.filter((i) => inv.isOwed(s, i)),
      (i) => inv.open(s, i)
    ),
    paid: sum(list, (i) => inv.paid(s, i)),
    leads: s.leads.filter((l) => l.customerId === c.id).length,
    last:
      [
        ...s.leads.filter((l) => l.customerId === c.id).map((l) => l.createdAt),
        ...list.map((i) => i.createdAt),
      ]
        .sort()
        .pop() || c.createdAt,
  };
}
