/* Board (an extra, D63). One card per lead. Columns (D65): New (lead new / contacted) → Replied (reply
   shared, unpaid) → Booked (booking agreed) → In service (job in progress) → Invoiced (bill after the
   service: due / overdue / waiting for approval) → Paid (D72).
   Dragging a card runs the real action when one action can do it (owner, 22 Oct: "only allowed moves");
   any other move snaps back with the reason. */
import { byId, fail } from "../core/util.js";
import * as bk from "./bookings.js";
import * as inv from "./invoices.js";
import * as leads from "./leads.js";

export const COLUMNS = [
  ["new", "New"],
  ["replied", "Replied"],
  ["booked", "Booked"],
  ["in_service", "In service"],
  ["invoiced", "Invoiced"],
  ["paid", "Paid"],
];

const bookingOf = (s, lead) =>
  s.bookings.find(
    (b) => b.leadId === lead.id && !["cancelled", "no_show"].includes(b.status)
  );
const jobOf = (s, lead) => s.jobs.find((j) => j.leadId === lead.id);

export function columnOf(s, lead) {
  if (lead.status === "paid") return "paid";
  const invs = inv.ofLead(s, lead.id);
  if (
    invs.some(
      (i) =>
        !inv.isReplyLike(i) &&
        ["due", "part_paid", "overdue", "pending"].includes(inv.statusOf(s, i))
    )
  )
    return "invoiced";
  const job = jobOf(s, lead);
  if (job && (job.status === "in_progress" || job.status === "done"))
    return "in_service";
  const b = bookingOf(s, lead);
  if (b && ["confirmed", "in_progress"].includes(b.status)) return "booked";
  if (lead.status === "replied") return "replied";
  return "new";
}

export const cards = (s) =>
  s.leads
    .filter((l) => l.status !== "rejected")
    .map((l) => ({ lead: l, col: columnOf(s, l) }));

const ORDER = Object.fromEntries(COLUMNS.map(([k], i) => [k, i]));

/* Move a lead's card. Returns the action's result or throws a BizError with the reason. */
export function move(s, { id, to }, ctx) {
  const lead = byId(s.leads, id) || fail("Lead not found.");
  const from = columnOf(s, lead);
  if (from === to) return { recordId: id, text: "No change" };
  if (ORDER[to] < ORDER[from])
    fail("A card cannot move back. Open the lead to change it.");
  if (to === "paid")
    fail(
      "Paid needs an approved payment. Record it, then approve it in Approvals."
    );
  if (to === "replied") {
    if (lead.type === "booked")
      fail("A booked lead is confirmed, not replied to. Drag it to Booked.");
    fail(
      "Open the lead and Accept it with a price: the reply is the proforma."
    );
  }
  if (to === "booked") {
    if (lead.type !== "booked")
      fail(
        "Only a booked lead goes to Booked. A quoted lead needs a reply first."
      );
    if (!lead.assigneeId && !bookingOf(s, lead)?.memberId)
      fail("Assign a staff member first (open the lead).");
    return leads.confirm(
      s,
      { id, memberId: lead.assigneeId || undefined },
      ctx
    );
  }
  const b = bookingOf(s, lead);
  if (to === "in_service") {
    if (!b || b.status !== "confirmed")
      fail("Only an Agreed booking can start.");
    return bk.start(s, { bookingId: b.id }, ctx);
  }
  if (to === "invoiced") {
    const job = jobOf(s, lead);
    if (!job || job.status !== "in_progress")
      fail("Only a job in service can be billed.");
    for (const c of job.checklist) c.done = true;
    bk.done(s, { jobId: job.id }, ctx);
    return bk.bill(s, { jobId: job.id }, ctx);
  }
  fail("That move is not possible.");
}
