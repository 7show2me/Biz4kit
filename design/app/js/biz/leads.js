/* Leads: anything a customer requested (D59). Type quoted (asked for a price) or booked (booked a slot for a
   bookable package). Statuses New, Contacted, Replied, Snoozed, Rejected, Paid (D66).
   Quoted: Accept (price it and share the proforma) / Edit (items, quantities, brief) / Reject (D61).
   Booked: assign staff, confirm by email or SMS (message 10), invoice after the service, or at booking when
   the package sets an advance % (D62). */
import {
  addDays,
  byId,
  fail,
  nextId,
  nowStamp,
  today,
  token,
} from "../core/util.js";
import * as bk from "./bookings.js";
import * as inv from "./invoices.js";
import { T, addressOf, send, varsFor } from "./messages.js";
import { need } from "./perms.js";

export const SOURCES = {
  qr: "QR",
  web: "Web",
  instagram: "Instagram",
  referral: "Referral",
  manual: "Added by staff",
  marketplace: "Marketplace",
};

/* Find a customer by phone (unique per workspace) or create one. */
export function findOrCreateCustomer(s, { name, phone, email = "", source }) {
  const p = String(phone || "").replace(/\s+/g, "");
  if (!name?.trim()) fail("Enter the customer's name.");
  if (!/^\+?\d{10,13}$/.test(p)) fail("Enter a 10-digit mobile number.");
  let c = s.customers.find(
    (x) =>
      String(x.phone).replace(/\s+/g, "") === p ||
      String(x.phone).replace(/\s+/g, "").endsWith(p.slice(-10))
  );
  if (!c) {
    c = {
      id: nextId(s, "C"),
      name: name.trim(),
      phone,
      email,
      company: "",
      gstin: "",
      address: "",
      tags: source ? [source] : [],
      token: token("c"),
      notes: "",
      createdAt: nowStamp(s),
    };
    s.customers.unshift(c);
  } else if (email && !c.email) c.email = email;
  return c;
}

/* New lead. From the portal (ctx.customer) or added by staff. */
export function create(s, args, ctx) {
  if (!ctx.customer) need(ctx, "write");
  const type = args.type === "booked" ? "booked" : "quoted";
  if (type === "booked" && !args.packageId) fail("Pick a package to book.");
  if (
    type === "quoted" &&
    !String(args.brief || "").trim() &&
    !(args.lines || []).length
  )
    fail("Say what you need.");
  const c = findOrCreateCustomer(s, { ...args, source: args.source });
  const lead = {
    id: nextId(s, "L"),
    customerId: c.id,
    type,
    source: args.source || (ctx.customer ? "web" : "manual"),
    brief: String(args.brief || "").trim(),
    lines: (args.lines || []).filter((l) => l.name),
    preferredDate: args.preferredDate || null,
    packageId: args.packageId || null,
    assigneeId: args.assigneeId || null,
    status: "new",
    snoozedUntil: null,
    rejectReason: null,
    createdAt: nowStamp(s),
  };
  s.leads.unshift(lead);
  if (type === "booked")
    bk.create(
      s,
      {
        leadId: lead.id,
        customerId: c.id,
        packageId: args.packageId,
        start: args.start,
        memberId: args.assigneeId || null,
      },
      { ...ctx, internal: true }
    );
  if (ctx.customer)
    send(
      s,
      {
        channel: "email",
        templateId: T.requestReceived,
        vars: varsFor(s, { customerId: c.id }),
        to: addressOf(c, "email"),
        recordId: lead.id,
      },
      ctx
    );
  return {
    recordId: lead.id,
    text: `New ${type} lead from ${c.name}`,
    lead,
    customer: c,
  };
}

const leadOf = (s, id) => byId(s.leads, id) || fail("Lead not found.");
const open = (lead) => {
  if (lead.status === "paid") fail("This lead is paid and closed.");
  if (lead.status === "rejected") fail("This lead was rejected.");
};

export function contacted(s, { id }, ctx) {
  need(ctx, "write");
  const lead = leadOf(s, id);
  open(lead);
  if (lead.status === "new" || lead.status === "snoozed")
    lead.status = "contacted";
  lead.snoozedUntil = null;
  return { recordId: id, text: "Marked contacted" };
}

export function snooze(s, { id, days = 3 }, ctx) {
  need(ctx, "write");
  const lead = leadOf(s, id);
  open(lead);
  lead.status = "snoozed";
  lead.snoozedUntil = addDays(today(s), +days || 3);
  return { recordId: id, text: `Snoozed until ${lead.snoozedUntil}` };
}

/* Priority (WBS 3.1, Design inputs Lead.priority, D87): normal or high; missing = normal. */
export const PRIORITY = { normal: "Normal", high: "High" };
export const isHigh = (lead) => lead.priority === "high";
export function setPriority(s, { id, priority }, ctx) {
  need(ctx, "write");
  const lead = leadOf(s, id);
  open(lead);
  if (!PRIORITY[priority]) fail("Pick Normal or High.");
  lead.priority = priority;
  return {
    recordId: id,
    text: `Priority ${PRIORITY[priority].toLowerCase()}`,
  };
}

export function assign(s, { id, memberId }, ctx) {
  need(ctx, "assign");
  const lead = leadOf(s, id);
  const m = memberId
    ? byId(s.members, memberId) || fail("Pick a team member.")
    : null;
  lead.assigneeId = m?.id || null;
  const b = s.bookings.find((x) => x.leadId === id && x.status === "tentative");
  if (b && m) b.memberId = m.id;
  return { recordId: id, text: m ? `Assigned to ${m.name}` : "Unassigned" };
}

/* Edit: items, quantities and brief before pricing (D61). */
export function edit(s, { id, brief, lines }, ctx) {
  need(ctx, "write");
  const lead = leadOf(s, id);
  open(lead);
  if (brief !== undefined) lead.brief = String(brief).trim();
  if (lines) lead.lines = lines.filter((l) => l.name && (l.qty || 0) > 0);
  return { recordId: id, text: "Request edited" };
}

/* Accept a quoted lead: price it as a reply (proforma PI-) and share it (D60, D61). */
export function accept(
  s,
  { id, lines, discount = 0, channel = "email", advancePct = null },
  ctx
) {
  need(ctx, "write");
  const lead = leadOf(s, id);
  open(lead);
  if (lead.type !== "quoted") fail("A booked lead is confirmed, not priced.");
  const full =
    lines ||
    lead.lines.map((l) => ({
      name: l.name,
      desc: l.note || "",
      qty: l.qty,
      rate: l.rate,
      gst: l.gst ?? inv.gstFor(s, l),
      unit: l.unit || "visit",
      optional: false,
      selected: true,
    }));
  /* With an advance %, the reply is the advance proforma (D70: two invoices): each line at pct of its rate,
     keeping its own GST rate; fullRate is kept so the balance after the job is the rest. */
  const pct = +advancePct || 0;
  if (pct && !(pct > 0 && pct < 100))
    fail("Advance is a percentage from 1 to 99.");
  const draft = inv.create(
    s,
    {
      kind: pct ? "advance" : "reply",
      leadId: id,
      lines: pct
        ? full.map((l) => ({
            ...l,
            name: `${l.name} · advance ${pct}%`,
            fullRate: +l.rate || 0,
            rate: Math.round(((+l.rate || 0) * pct) / 100),
          }))
        : full,
      discount: pct ? Math.round(((+discount || 0) * pct) / 100) : discount,
    },
    ctx
  );
  if (pct) {
    draft.advancePct = pct;
    draft.fullDiscount = +discount || 0;
  }
  const out = inv.share(s, { id: draft.id, channel }, ctx);
  return {
    recordId: id,
    text: `Reply ${draft.piNumber} shared with ${byId(s.customers, lead.customerId)?.name}`,
    invoice: draft,
    message: out.message,
  };
}

/* Reject with the Request declined message (18, wording still a draft, D61). */
export function reject(s, { id, reason = "", channel = "email" }, ctx) {
  need(ctx, "write");
  const lead = leadOf(s, id);
  open(lead);
  lead.status = "rejected";
  lead.rejectReason = reason || null;
  const c = byId(s.customers, lead.customerId);
  const msg = send(
    s,
    {
      channel,
      templateId: T.requestDeclined,
      vars: varsFor(s, { customerId: c.id }),
      to: addressOf(c, channel),
      recordId: id,
    },
    ctx
  );
  for (const b of s.bookings.filter(
    (x) => x.leadId === id && x.status === "tentative"
  ))
    b.status = "cancelled";
  return {
    recordId: id,
    text: `Rejected${reason ? `: ${reason}` : ""}`,
    message: msg,
  };
}

/* Booked lead: confirm the slot (To confirm → Agreed), message 10; advance invoice when the package asks
   for one (D62). Booked leads go New → Replied on confirm (D72). */
export function confirm(s, { id, memberId, channel = "email" }, ctx) {
  need(ctx, "write");
  const lead = leadOf(s, id);
  open(lead);
  if (lead.type !== "booked")
    fail("Only a booked lead is confirmed. Accept a quoted lead with a price.");
  const b =
    s.bookings.find((x) => x.leadId === id && x.status === "tentative") ||
    fail("This lead has no booking waiting to be confirmed.");
  if (memberId)
    assign(
      s,
      { id, memberId },
      { ...ctx, role: ctx.role === "staff" ? "manager" : ctx.role }
    );
  const out = bk.confirm(s, { id: b.id, channel }, ctx);
  lead.status = "replied";
  const pkg = byId(s.packages, lead.packageId);
  let advance = null;
  if (pkg?.advancePct) {
    advance = inv.create(
      s,
      {
        kind: "advance",
        leadId: id,
        bookingId: b.id,
        lines: [
          {
            itemId: null,
            name: `${pkg.name} · advance ${pkg.advancePct}%`,
            desc: "",
            qty: 1,
            unit: "visit",
            rate: Math.round((pkg.price * pkg.advancePct) / 100),
            gst: inv.pkgGst(s, pkg),
            optional: false,
            selected: true,
          },
        ],
      },
      ctx
    );
    inv.share(s, { id: advance.id, channel }, ctx);
  }
  return {
    recordId: id,
    text: `Booking agreed${advance ? `; advance ${advance.piNumber} shared` : ""}`,
    booking: out.booking,
    advance,
  };
}

/* Unsnooze leads whose date has passed (run on load and each render). */
export function wake(s) {
  for (const l of s.leads)
    if (l.status === "snoozed" && l.snoozedUntil && l.snoozedUntil <= today(s))
      l.status = "contacted";
}

export const typeOf = (lead) => (lead.type === "booked" ? "Booked" : "Quoted");
/* High priority first (WBS 3.1, D87); otherwise the stored order. */
export const toAnswer = (s) =>
  s.leads
    .filter((l) => l.status === "new" || l.status === "contacted")
    .sort((a, b) => (isHigh(b) ? 1 : 0) - (isHigh(a) ? 1 : 0));
