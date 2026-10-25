/* Ready messages and the simulated outbox. D67: Phase 1 sends email only; SMS and WhatsApp are text to
   copy. D35: the sender is the business name, reply-to the Owner. Nothing leaves the browser. */
import {
  byId,
  fmtDate,
  fmtLong,
  fmtTime,
  inr,
  nextId,
  nowStamp,
} from "../core/util.js";

export const T = {
  priceList: 1,
  requestReceived: 2,
  needDetails: 3,
  replyShared: 4,
  replyRevised: 5,
  replyFollowUp: 6,
  replyExpiring: 7,
  bookingConfirmed: 10,
  bookingReminder: 11,
  invoiceShared: 12,
  reminderEarly: 13,
  reminderLate: 14,
  paymentReceived: 15,
  proofRejected: 16,
  jobCompleted: 17,
  requestDeclined: 18,
};

export const fill = (body, vars) =>
  String(body ?? "").replace(/\{(\w+)\}/g, (m, k) =>
    (vars[k] ?? vars[k] === 0) ? String(vars[k]) : m
  );

/* Placeholder values for a record. Accepts any of { customer, invoice, booking, lead, member, extra }. */
export function varsFor(
  s,
  { customerId, invoice, booking, member, extra = {} } = {}
) {
  const ws = s.workspace;
  const c =
    byId(
      s.customers,
      customerId || invoice?.customerId || booking?.customerId
    ) || {};
  const owner = s.members.find((m) => m.role === "owner");
  const no = invoice ? invoice.invNumber || invoice.piNumber || "" : "";
  return {
    business: ws.name,
    customer: c.name || "",
    customer_first: (c.name || "").split(" ")[0],
    link: invoice?.token
      ? `${ws.slug}.biz4kit.com/i/${String(invoice.token).replace(/^i-/, "")}`
      : `${ws.slug}.biz4kit.com`,
    upi: ws.upi,
    upi_id: ws.upi,
    phone: ws.phone,
    sender: (member?.name || owner?.name || "").split(" ")[0],
    days: invoice?.dueDate
      ? Math.max(
          0,
          Math.round(
            (new Date(`${s.meta.today}T00:00:00`) -
              new Date(`${String(invoice.dueDate).slice(0, 10)}T00:00:00`)) /
              86_400_000
          )
        )
      : "",
    doc_no: no,
    quote_no: no, // older saved templates (D93 renamed it doc_no)
    invoice_no: no,
    amount: invoice ? inr(extra.amount ?? invoice._total ?? 0) : "",
    valid_until: invoice?.payBy ? fmtLong(invoice.payBy) : "",
    due_date: invoice?.dueDate ? fmtLong(invoice.dueDate) : "",
    date: booking ? fmtDate(booking.start) : "",
    time: booking ? fmtTime(booking.start) : "",
    staff: booking
      ? byId(s.members, booking.memberId)?.name || ""
      : member?.name || "",
    owner: owner?.name || "",
    ...extra,
  };
}

export const template = (s, id) =>
  s.templates.find((t) => t.id === id) || {
    id,
    name: `Message ${id}`,
    subject: null,
    body: "",
  };

/* Put a message in the outbox. channel: email (sent), sms / whatsapp (ready to copy). */
export function send(
  s,
  {
    channel = "email",
    templateId,
    vars = {},
    to = "",
    recordId = null,
    subject,
    body,
  },
  ctx = {}
) {
  const t = templateId ? template(s, templateId) : null;
  const msg = {
    id: nextId(s, "O"),
    at: nowStamp(s),
    channel,
    status: channel === "email" ? "sent" : "copied",
    from: s.workspace.name,
    replyTo: s.members.find((m) => m.role === "owner")?.email || "",
    to,
    subject:
      subject ??
      (t?.subject
        ? fill(t.subject, vars)
        : t
          ? `${t.name} · ${s.workspace.name}`
          : ""),
    body: body ?? fill(t?.body, vars),
    templateId: templateId || null,
    recordId,
    by: ctx.memberId || null,
  };
  s.outbox.unshift(msg);
  return msg;
}

/* Address for a channel from a customer record. */
export const addressOf = (c, channel) =>
  channel === "email" ? c?.email || "" : c?.phone || "";
