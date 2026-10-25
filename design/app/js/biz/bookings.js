/* Bookings and jobs. Booking: To confirm (tentative) → Agreed (confirmed) → in progress → completed, or
   cancelled / no-show (D68, D69). A started booking opens its Job; a Job done gets its bill (a PI- that
   becomes INV- on approval, D71), and the Job turns Invoiced once that bill is paid. Conflict check on
   member + time. */
import { byId, fail, nextId, nowStamp, today } from "../core/util.js";
import * as inv from "./invoices.js";
import { T, addressOf, send, varsFor } from "./messages.js";
import { need } from "./perms.js";

const plusMinutes = (isoStamp, min) => {
  const d = new Date(isoStamp);
  d.setMinutes(d.getMinutes() + min);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
/* Compare "YYYY-MM-DDTHH:MM" only: the data mixes "…T10:00:00+05:30" and "…T10:00" (all IST). */
const t16 = (x) => String(x || "").slice(0, 16);
const overlaps = (a, b) =>
  t16(a.start) < t16(b.end) && t16(b.start) < t16(a.end);

export function clash(s, { memberId, start, end, ignoreId }) {
  if (!memberId) return null;
  return s.bookings.find(
    (b) =>
      b.id !== ignoreId &&
      b.memberId === memberId &&
      !["cancelled", "no_show", "completed"].includes(b.status) &&
      overlaps(b, { start, end })
  );
}

export function create(
  s,
  {
    leadId = null,
    customerId,
    packageId = null,
    memberId = null,
    start,
    minutes,
    notes = "",
  },
  ctx
) {
  if (!ctx.internal && !ctx.customer) need(ctx, "write");
  if (!customerId) fail("Pick a customer.");
  const pkg = packageId ? byId(s.packages, packageId) : null;
  const begin = start || `${today(s)}T10:00`;
  const end = plusMinutes(begin, +minutes || pkg?.durationMin || 60);
  const c = clash(s, { memberId, start: begin, end });
  if (c)
    fail(
      `${byId(s.members, memberId)?.name} already has a booking at that time.`
    );
  const b = {
    id: nextId(s, "B"),
    customerId,
    leadId,
    packageId,
    memberId,
    start: begin,
    end,
    status: "tentative",
    notes,
  };
  s.bookings.unshift(b);
  return {
    recordId: b.id,
    text: `Booking ${b.start.slice(0, 10)} ${b.start.slice(11)} (To confirm)`,
    booking: b,
  };
}

export function move(s, { id, start, memberId }, ctx) {
  need(ctx, "write");
  const b = byId(s.bookings, id) || fail("Booking not found.");
  if (!["tentative", "confirmed"].includes(b.status))
    fail("Only an upcoming booking can move.");
  const len = (new Date(b.end) - new Date(b.start)) / 60000;
  const next = {
    start: start || b.start,
    end: plusMinutes(start || b.start, len),
    memberId: memberId ?? b.memberId,
  };
  const c = clash(s, { ...next, ignoreId: id });
  if (c)
    fail(
      `${byId(s.members, next.memberId)?.name} already has a booking at that time.`
    );
  Object.assign(b, next);
  return {
    recordId: id,
    text: `Booking moved to ${b.start.replace("T", " ")}`,
  };
}

export function confirm(s, { id, channel = "email" }, ctx) {
  need(ctx, "write");
  const b = byId(s.bookings, id) || fail("Booking not found.");
  if (b.status !== "tentative") fail("This booking is already agreed.");
  if (!b.memberId) fail("Assign a staff member first.");
  b.status = "confirmed";
  const c = byId(s.customers, b.customerId);
  const pkg = byId(s.packages, b.packageId);
  const msg = send(
    s,
    {
      channel,
      templateId: T.bookingConfirmed,
      vars: varsFor(s, {
        booking: b,
        extra: { service: pkg?.name || "your booking" },
      }),
      to: addressOf(c, channel),
      recordId: b.id,
    },
    ctx
  );
  return {
    recordId: b.id,
    text: `Booking agreed with ${c?.name}`,
    booking: b,
    message: msg,
  };
}

export function setStatus(s, { id, status }, ctx) {
  need(ctx, "write");
  const b = byId(s.bookings, id) || fail("Booking not found.");
  if (!["cancelled", "no_show"].includes(status))
    fail("Use Start or Done for the job.");
  b.status = status;
  return {
    recordId: id,
    text: status === "cancelled" ? "Booking cancelled" : "Marked no-show",
  };
}

/* ---------- jobs ---------- */
export function start(s, { bookingId, jobId }, ctx) {
  need(ctx, "write");
  let job = jobId
    ? byId(s.jobs, jobId)
    : s.jobs.find((j) => j.bookingId === bookingId);
  const b = bookingId
    ? byId(s.bookings, bookingId)
    : job?.bookingId
      ? byId(s.bookings, job.bookingId)
      : null;
  if (b && b.status === "tentative")
    fail("Confirm the booking before starting.");
  if (!job) {
    if (!b) fail("Booking not found.");
    const pkg = byId(s.packages, b.packageId);
    job = {
      id: nextId(s, "J"),
      bookingId: b.id,
      leadId: b.leadId,
      customerId: b.customerId,
      assigneeId: b.memberId,
      title: pkg?.name || "Service",
      checklist: [],
      status: "open",
      start: b.start,
      completedAt: null,
      invoiceId: null,
    };
    s.jobs.unshift(job);
  }
  if (job.status !== "open") fail("This job has already started.");
  job.status = "in_progress";
  if (b) b.status = "in_progress";
  return { recordId: job.id, text: `Job started: ${job.title}`, job };
}

export function tick(s, { jobId, index }, ctx) {
  need(ctx, "write");
  const job = byId(s.jobs, jobId) || fail("Job not found.");
  const item = job.checklist[+index] || fail("Checklist item not found.");
  item.done = !item.done;
  return {
    recordId: jobId,
    text: `${item.done ? "Done" : "Not done"}: ${item.t}`,
  };
}

/* Job photos (before / after) and materials used (D87). Materials have no price (not decided). Both can
   change until the job is invoiced. */
const editableJob = (s, jobId, ctx) => {
  need(ctx, "write");
  const job = byId(s.jobs, jobId) || fail("Job not found.");
  if (job.status === "invoiced")
    fail("This job is invoiced and cannot change.");
  job.photos ??= [];
  job.materials ??= [];
  return job;
};
/* ids unique inside the job's own list (nextId only scans top-level records) */
const localId = (list, prefix) =>
  prefix + (list.reduce((m, x) => Math.max(m, +String(x.id).slice(1) || 0), 0) + 1);
export const MAX_PHOTOS = 6;
export function addPhoto(s, { jobId, tag = "before", photo }, ctx) {
  const job = editableJob(s, jobId, ctx);
  if (!photo?.name) fail("Pick a photo first.");
  if (!["before", "after"].includes(tag)) fail("A photo is Before or After.");
  if (job.photos.length >= MAX_PHOTOS)
    fail(`Up to ${MAX_PHOTOS} photos per job. Remove one first.`);
  job.photos.push({
    id: localId(job.photos, "P"),
    tag,
    name: String(photo.name),
    url: photo.url || null,
  });
  return {
    recordId: jobId,
    text: `${tag === "after" ? "After" : "Before"} photo added`,
  };
}
export function removePhoto(s, { jobId, id }, ctx) {
  const job = editableJob(s, jobId, ctx);
  if (!job.photos.some((p) => p.id === id)) fail("Photo not found.");
  job.photos = job.photos.filter((p) => p.id !== id);
  return { recordId: jobId, text: "Photo removed" };
}
export function addMaterial(
  s,
  { jobId, name, qty, unit = "", note = "" },
  ctx
) {
  const job = editableJob(s, jobId, ctx);
  const n = String(name ?? "").trim();
  if (!n) fail("Name the material.");
  const q = +qty;
  if (!(q > 0)) fail("Enter a quantity above 0.");
  job.materials.push({
    id: localId(job.materials, "X"),
    name: n,
    qty: q,
    unit: String(unit).trim(),
    note: String(note).trim(),
  });
  return { recordId: jobId, text: `Material added: ${n}` };
}
export function removeMaterial(s, { jobId, id }, ctx) {
  const job = editableJob(s, jobId, ctx);
  const m =
    job.materials.find((x) => x.id === id) || fail("Material not found.");
  job.materials = job.materials.filter((x) => x.id !== id);
  return { recordId: jobId, text: `Material removed: ${m.name}` };
}

/* Done: checklist must be complete; sends message 17 and makes the draft invoice at once (D88). */
export function done(s, { jobId }, ctx) {
  need(ctx, "write");
  const job = byId(s.jobs, jobId) || fail("Job not found.");
  if (job.status !== "in_progress")
    fail(
      job.status === "open"
        ? "Start the job first."
        : "This job is already done."
    );
  if (job.checklist.some((c) => !c.done))
    fail("Tick every checklist item first.");
  job.status = "done";
  job.completedAt = nowStamp(s);
  const b = byId(s.bookings, job.bookingId);
  if (b) b.status = "completed";
  const c = byId(s.customers, job.customerId);
  send(
    s,
    {
      channel: "email",
      templateId: T.jobCompleted,
      vars: varsFor(s, {
        customerId: job.customerId,
        extra: { service: job.title },
      }),
      to: addressOf(c, "email"),
      recordId: job.id,
    },
    ctx
  );
  const draft = job.invoiceId ? null : draftFor(s, job, null, ctx);
  return {
    recordId: jobId,
    text: `Job done: ${job.title}${draft ? `; draft ${draft.kind === "balance" ? "balance" : "bill"} ready to review` : ""}`,
    job,
    invoice: draft,
  };
}

/* A quoted lead whose reply is already paid needs no bill after the service (D60, D72). */
export const paidUpfront = (s, job) =>
  job.leadId
    ? inv
        .ofLead(s, job.leadId)
        .find((i) => i.kind === "reply" && inv.statusOf(s, i) === "paid") ||
      null
    : null;

/* The lines a job is billed with: given lines, else the rest after an advance (D70), else the package, else
   the lead's lines. */
function billOf(s, job, lines) {
  const b = byId(s.bookings, job.bookingId);
  const pkg = b ? byId(s.packages, b.packageId) : null;
  const lead = job.leadId ? byId(s.leads, job.leadId) : null;
  const advance = lead
    ? inv.ofLead(s, lead.id).find((i) => i.kind === "advance")
    : null;
  /* The advance's taxable value (before GST): the balance is the price less this, then GST on the rest (D70). */
  const advTaxable = advance
    ? (() => {
        const t = inv.totals(s, advance);
        return t.subtotal - t.discount;
      })()
    : 0;
  const fromAdvance =
    advance && advance.lines.some((l) => l.fullRate !== undefined)
      ? advance.lines.map(({ fullRate, ...l }) => ({
          ...l,
          name: l.name.replace(/ · advance \d+%$/, ""),
          rate: (fullRate ?? l.rate) - l.rate,
        }))
      : null;
  const base =
    lines ||
    fromAdvance ||
    (pkg
      ? [
          {
            itemId: null,
            name: pkg.name,
            desc: pkg.desc || "",
            qty: 1,
            unit: "visit",
            rate: pkg.price - advTaxable,
            gst: inv.pkgGst(s, pkg),
            optional: false,
            selected: true,
          },
        ]
      : lead?.lines.map((l) => ({
          name: l.name,
          desc: l.note || "",
          qty: l.qty,
          rate: l.rate,
          gst: inv.gstFor(s, l),
          unit: "visit",
          optional: false,
          selected: true,
        })) || []);
  return {
    kind: advance ? "balance" : "bill",
    lead,
    lines: base,
    /* the rest of a reply's discount goes on the balance */
    discount:
      fromAdvance && !lines
        ? Math.max(0, (advance.fullDiscount || 0) - (advance.discount || 0))
        : 0,
  };
}

/* The draft (unshared) bill or balance for a done job (D88). null when there is nothing to bill: the reply
   was paid upfront, or the job has no package and no lines (the job screen then picks lines). */
function draftFor(s, job, lines, ctx) {
  if (!lines && paidUpfront(s, job)) return null;
  const x = billOf(s, job, lines);
  if (!x.lines.some((l) => l.name && (l.qty || 0) > 0)) return null;
  const draft = inv.create(
    s,
    {
      kind: x.kind,
      leadId: x.lead?.id,
      customerId: job.customerId,
      bookingId: job.bookingId,
      jobId: job.id,
      lines: x.lines,
      discount: x.discount,
    },
    ctx
  );
  job.invoiceId = draft.id;
  return draft;
}

/* Review and send (D88): share the job's draft (made when it was marked done), or make it from the given
   lines first. Lines given for an existing draft replace its lines. */
export function bill(s, { jobId, lines, channel = "email" }, ctx) {
  need(ctx, "write");
  const job = byId(s.jobs, jobId) || fail("Job not found.");
  if (job.status !== "done") fail("Mark the job done before billing.");
  let draft = job.invoiceId ? byId(s.invoices, job.invoiceId) : null;
  if (draft?.sharedAt) fail("This job is already billed.");
  if (draft && lines) inv.revise(s, { id: draft.id, lines }, ctx);
  if (!draft) draft = draftFor(s, job, lines || null, ctx);
  if (!draft) fail("Add at least one line to bill.");
  const out = inv.share(s, { id: draft.id, channel }, ctx);
  return {
    recordId: draft.id,
    text: `${draft.kind === "balance" ? "Balance" : "Bill"} ${draft.piNumber} for ${job.title}`,
    invoice: draft,
    message: out.message,
  };
}
