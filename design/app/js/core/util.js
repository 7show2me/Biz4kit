/* Small pure helpers shared by the business layer and the UI. No DOM. */

export class BizError extends Error {
  constructor(message) {
    super(message);
    this.name = "BizError";
  }
}
export const fail = (message) => {
  throw new BizError(message);
};

/* Money: whole rupees, Indian grouping. */
export const inr = (n) =>
  `${n < 0 ? "−" : ""}₹${Math.abs(Math.round(n || 0)).toLocaleString("en-IN")}`;

export const esc = (t) =>
  String(t ?? "").replaceAll(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

export const initials = (n = "") =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/* ---------- dates: the sample clock is state.meta.today (YYYY-MM-DD) ---------- */
export const today = (s) => s.meta.today;
const D = (iso) => new Date(`${String(iso).slice(0, 10)}T00:00:00`);
const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (isoDate, n) => {
  const d = D(isoDate);
  d.setDate(d.getDate() + n);
  return iso(d);
};
/* Same day n months later; a day the month lacks falls back to its last day (31 Jan + 1 → 28 Feb). */
export const addMonths = (isoDate, n) => {
  const d = D(isoDate);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  d.setDate(
    Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())
  );
  return iso(d);
};
/* Whole days from a to b (b − a). */
export const daysBetween = (a, b) => Math.round((D(b) - D(a)) / 86_400_000);
/* "now" for timestamps: the sample day at the current wall-clock time. */
export const nowStamp = (s) => {
  const t = new Date();
  return `${today(s)}T${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
};
const MON = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/* "Mon 19 Oct" */
export const fmtDate = (x) => {
  if (!x) {
    return "";
  }
  const d = D(x);
  return `${DAY[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
};
/* "19 Oct 2026" */
export const fmtLong = (x) => {
  if (!x) {
    return "";
  }
  const d = D(x);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
};
/* "10:30" from an ISO timestamp */
export const fmtTime = (x) => (x && x.length > 10 ? x.slice(11, 16) : "");
/* "Today", "Yesterday", "3 days ago", or the date */
export const ago = (s, x) => {
  if (!x) {
    return "";
  }
  const n = daysBetween(x, today(s));
  if (n === 0) {
    return `Today ${fmtTime(x)}`.trim();
  }
  if (n === 1) {
    return "Yesterday";
  }
  if (n > 1 && n < 7) {
    return `${n} days ago`;
  }
  return fmtDate(x);
};

/* Indian financial year (April–March) as "2627" for 2026-27. */
export const fyCode = (isoDate) => {
  const d = D(isoDate);
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${String(y).slice(2)}${String(y + 1).slice(2)}`;
};

/* ---------- ids ---------- */
export const nextId = (s, prefix) => {
  const all = [
    s.members,
    s.items,
    s.packages,
    s.customers,
    s.leads,
    s.invoices,
    s.payments,
    s.bookings,
    s.jobs,
    s.devices,
    s.outbox,
  ]
    .flat()
    .map((r) => r?.id)
    .filter(
      (id) =>
        typeof id === "string" &&
        id.startsWith(prefix) &&
        /^\d+$/.test(id.slice(prefix.length))
    );
  const n = all.reduce((m, id) => Math.max(m, +id.slice(prefix.length)), 0);
  return prefix + (n + 1);
};
export const token = (p) => `${p}-${Math.random().toString(36).slice(2, 10)}`;

export const byId = (list, id) => list.find((r) => r.id === id);
export const sum = (xs, f = (x) => x) =>
  xs.reduce((t, x) => t + (f(x) || 0), 0);
