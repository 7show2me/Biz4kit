/* Payments and approvals. Approval is the only way to Paid in Phase 1.
   - proof file required for UPI and bank, optional for cash (Design inputs, business rules)
   - Owner approves; a Manager approves only when the Owner turned it on, strictly below the limit (D57, D74)
   - the approver is not the uploader, unless the Owner is the only one who can approve: then it is logged
     as self-approved (D74)
   - never above the open balance (D76); a payment made against an older version is applied to the latest
     version, with a note of the difference (D76)
   - a rejected lead or an expired reply cannot be paid; a snoozed lead can, with a warning (D73)
   - when approved payments cover the total, the proforma takes the next INV- number (D60, D71), and a lead
     whose invoices are all paid turns Paid (D72) */
import { byId, fail, inr, nextId, nowStamp } from "../core/util.js";
import * as inv from "./invoices.js";
import { T, addressOf, send, varsFor } from "./messages.js";
import { need, ROLES } from "./perms.js";

export const METHODS = {
  upi: "UPI",
  bank: "Bank transfer",
  cash: "Cash",
  card: "Card",
};

/* Can this invoice take a payment? Returns { ok, reason, warning }. Used by the portal pay page too. */
export function payable(s, invoice) {
  const st = inv.statusOf(s, invoice);
  const lead = invoice.leadId ? byId(s.leads, invoice.leadId) : null;
  if (invoice.cancelled)
    return { ok: false, reason: "This invoice was cancelled." };
  if (!invoice.sharedAt)
    return { ok: false, reason: "This invoice has not been shared yet." };
  if (st === "paid")
    return { ok: false, reason: "This invoice is already paid." };
  if (lead?.status === "rejected")
    return {
      ok: false,
      reason: "This request is no longer valid: the business declined it.",
    };
  if (st === "expired")
    return {
      ok: false,
      reason: `This request is no longer valid: it expired on ${invoice.payBy}.`,
    };
  const warning =
    lead?.status === "snoozed"
      ? "The lead is snoozed. The payment will still go to approval."
      : "";
  return { ok: true, warning };
}

/* Record a payment (staff with proof, or the customer on the pay page with ctx.customer = true). */
export function record(
  s,
  {
    invoiceId,
    amount,
    method = "upi",
    reference = "",
    proof = null,
    note = "",
  },
  ctx
) {
  if (!ctx.customer) need(ctx, "record");
  const invoice = byId(s.invoices, invoiceId) || fail("Invoice not found.");
  const p = payable(s, invoice);
  if (!p.ok) fail(p.reason);
  amount = Math.round(+amount);
  if (!(amount > 0)) fail("Enter the amount received.");
  const pendingSum = inv
    .pendingOf(s, invoice)
    .reduce((t, x) => t + x.amount, 0);
  const room = inv.open(s, invoice) - pendingSum;
  if (amount > room)
    fail(
      `That is more than is still open (${inr(Math.max(0, room))}). Overpayments are not accepted.`
    );
  if ((method === "upi" || method === "bank") && !proof)
    fail(`Attach the ${METHODS[method]} screenshot or receipt as proof.`);
  const pay = {
    id: nextId(s, "P"),
    invoiceId,
    amount,
    method,
    reference,
    proof,
    note,
    uploadedBy: ctx.customer ? null : ctx.memberId,
    byCustomer: Boolean(ctx.customer),
    uploadedAt: nowStamp(s),
    status: "pending",
    decidedBy: null,
    decidedAt: null,
    selfApproved: false,
    version: invoice.version,
  };
  s.payments.unshift(pay);
  return {
    recordId: pay.id,
    text: `${inr(amount)} for ${inv.numberOf(invoice)} waiting for approval`,
    payment: pay,
    warning: p.warning,
  };
}

/* Who could approve this payment (active members). */
export function approvers(s, pay) {
  const a = s.workspace.approvals || {};
  return s.members.filter(
    (m) =>
      m.status === "active" &&
      (m.role === "owner" ||
        (m.role === "manager" &&
          a.managerEnabled &&
          pay.amount < a.managerLimit))
  );
}

/* Why this member may not approve, or "" if they may. */
export function cannotApprove(s, pay, ctx) {
  if (ctx.role === "superadmin") return "Support view is read-only.";
  const a = s.workspace.approvals || {};
  if (ctx.role === "manager") {
    if (!a.managerEnabled)
      return "Payment approvals by Managers are off. The Owner approves.";
    if (!(pay.amount < a.managerLimit))
      return `Managers approve payments below ${inr(a.managerLimit)}. The Owner approves this one.`;
  } else if (ctx.role !== "owner")
    return `${ROLES[ctx.role]} cannot approve payments.`;
  if (
    pay.uploadedBy &&
    pay.uploadedBy === ctx.memberId &&
    approvers(s, pay).some((m) => m.id !== ctx.memberId)
  )
    return "You uploaded this proof. Someone else must approve it.";
  return "";
}

export function approve(s, { id }, ctx) {
  const pay = byId(s.payments, id) || fail("Payment not found.");
  if (pay.status !== "pending") fail("This payment is already decided.");
  const why = cannotApprove(s, pay, ctx);
  if (why) fail(why);
  const invoice = byId(s.invoices, pay.invoiceId);
  if (pay.amount > inv.open(s, invoice))
    fail(
      `This is more than the open balance (${inr(inv.open(s, invoice))}). It cannot be approved.`
    );
  pay.status = "approved";
  pay.decidedBy = ctx.memberId;
  pay.decidedAt = nowStamp(s);
  pay.selfApproved = pay.uploadedBy === ctx.memberId;
  if (pay.version < invoice.version) {
    const old = invoice.history.find((h) => h.version === pay.version);
    const diff = inv.total(s, invoice) - (old?.total ?? inv.total(s, invoice));
    pay.note = `Paid against version ${pay.version}; applied to version ${invoice.version}${diff ? ` (difference ${inr(diff)})` : ""}.`;
  }
  let text = `${inr(pay.amount)} approved for ${inv.numberOf(invoice)}`;
  if (inv.paid(s, invoice) >= inv.total(s, invoice) && !invoice.invNumber) {
    invoice.invNumber = inv.takeNumber(s, "INV");
    text += `; tax invoice ${invoice.invNumber}`;
    const c = byId(s.customers, invoice.customerId);
    invoice._total = pay.amount;
    send(
      s,
      {
        channel: "email",
        templateId: T.paymentReceived,
        vars: varsFor(s, { invoice }),
        to: addressOf(c, "email"),
        recordId: invoice.id,
      },
      ctx
    );
    delete invoice._total;
  }
  const lead = invoice.leadId ? byId(s.leads, invoice.leadId) : null;
  if (
    lead &&
    inv.ofLead(s, lead.id).every((i) => inv.statusOf(s, i) === "paid")
  )
    lead.status = "paid";
  if (invoice.jobId) {
    const job = byId(s.jobs, invoice.jobId);
    if (job && job.status === "done") job.status = "invoiced";
  }
  return {
    recordId: pay.id,
    text: text + (pay.selfApproved ? " (self-approved)" : ""),
    payment: pay,
  };
}

export function reject(s, { id, note = "" }, ctx) {
  const pay = byId(s.payments, id) || fail("Payment not found.");
  if (pay.status !== "pending") fail("This payment is already decided.");
  const why = cannotApprove(s, { ...pay, uploadedBy: null }, ctx);
  if (why) fail(why);
  if (!note.trim()) fail("Say why, so the uploader can fix it.");
  pay.status = "rejected";
  pay.decidedBy = ctx.memberId;
  pay.decidedAt = nowStamp(s);
  pay.note = note;
  const invoice = byId(s.invoices, pay.invoiceId);
  const up = byId(s.members, pay.uploadedBy);
  if (up)
    send(
      s,
      {
        channel: "email",
        templateId: T.proofRejected,
        vars: varsFor(s, { invoice, extra: { reject_note: note } }),
        to: up.email,
        recordId: invoice.id,
      },
      ctx
    );
  return {
    recordId: pay.id,
    text: `Proof for ${inv.numberOf(invoice)} rejected: ${note}`,
  };
}

export const pending = (s) => s.payments.filter((p) => p.status === "pending");

/* Record, and with approveNow approve at once (the Owner as the only approver, logged self-approved, D74). */
export function recordNow(s, args, ctx) {
  const out = record(s, args, ctx);
  if (!(args.approveNow === true || args.approveNow === "true")) return out;
  const a = approve(s, { id: out.payment.id }, ctx);
  return { ...a, warning: out.warning };
}
