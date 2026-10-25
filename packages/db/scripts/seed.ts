// Seeds Neon dev with the prototype's sample salon (design/app/data/default.json)
// as one workspace. Rupees become paise; phones and emails are replaced by
// generated ones (Workflow §PII). Runs as the app role, inside the workspace's
// own RLS context, like the API.
// Usage: pnpm --filter @Biz4kit/db db:seed [--reset]
/* oxlint-disable typescript/no-explicit-any -- the prototype JSON is untyped sample data, read once */
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

import { eq } from "drizzle-orm";

import { createDb, withWorkspace } from "../src/index";
import type { Transaction } from "../src/index";
import {
  activityLog,
  booking,
  catalogItem,
  catalogPackage,
  customer,
  invoice,
  invoiceLine,
  job,
  lead,
  member,
  messageTemplate,
  numberingCounter,
  payment,
  workspace,
} from "../src/schema";

// Fixed, so a re-run finds the same workspace.
const SEED_WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";
const ROOT = path.resolve(import.meta.dirname, "../../..");

type Row = Record<string, any>;
const data = JSON.parse(
  readFileSync(path.join(ROOT, "design/app/data/default.json"), "utf-8")
) as Record<string, any>;

const env = parseEnv(
  readFileSync(path.resolve(import.meta.dirname, "../.env.local"), "utf-8")
);
if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL missing; run pnpm env:pull");
}
if (/neondb_owner/u.test(env.DATABASE_URL)) {
  throw new Error("DATABASE_URL must be the app role (biz4kit_app)");
}

const paise = (rupees: number | null | undefined) =>
  rupees === null || rupees === undefined
    ? null
    : BigInt(Math.round(rupees * 100));
const when = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }
  return new Date(value.length === 10 ? `${value}T00:00:00+05:30` : value);
};
const day = (value: string | null | undefined) => value?.slice(0, 10) ?? null;
const time = (value: string | null | undefined) =>
  value && value.length > 10 ? value.slice(11, 16) : null;

// Prototype ids (C1, I12) → UUIDs; generated contact details per person.
const ids = new Map<string, string>();
const uuidOf = (key: string | null | undefined) => {
  if (!key) {
    return null;
  }
  let id = ids.get(key);
  if (!id) {
    id = crypto.randomUUID();
    ids.set(key, id);
  }
  return id;
};
const need = (key: string) => uuidOf(key) ?? "";
const phone = (n: number) => `+919000000${String(n).padStart(3, "0")}`;
const email = (prefix: string, n: number) => `${prefix}${n}@example.com`;

const BOOKING_STATUS: Record<string, string> = {
  tentative: "to_confirm",
  confirmed: "agreed",
};

async function seed(tx: Transaction) {
  const w = data.workspace;
  await tx.insert(workspace).values({
    id: SEED_WORKSPACE_ID,
    name: w.name,
    slug: w.slug,
    vertical: w.vertical,
    address: w.address,
    city: w.city,
    pin: w.pin,
    state: w.state,
    stateCode: w.stateCode,
    phone: phone(0),
    email: email("studio", 0),
    gstin: w.gstin,
    upi: "seed@upi",
    bank: { name: "Test Bank", account: "000000000000", ifsc: "TEST0000001" },
    brand: w.brand,
    numbering: { PI: { prefix: "PI" }, INV: { prefix: "INV" } },
    replyValidDays: w.replyValidDays,
    billDueDays: w.billDueDays,
    managerApprovalsEnabled: w.approvals.managerEnabled,
    managerLimitPaise: paise(w.approvals.managerLimit),
    modules: w.modules,
    openingHours: w.hours,
    terms: w.terms,
  });

  await tx.insert(numberingCounter).values([
    { series: "PI", fy: "2627", next: w.numbering.PI.next },
    { series: "INV", fy: "2627", next: w.numbering.INV.next },
  ]);

  await tx.insert(member).values(
    data.members.map((m: Row, n: number) => ({
      id: need(m.id),
      name: m.name || "Accountant",
      email: email("member", n + 1),
      role: m.role,
      status: m.status,
    }))
  );

  await tx.insert(catalogItem).values(
    data.items.map((i: Row) => ({
      id: need(i.id),
      name: i.name,
      category: i.category,
      unit: i.unit,
      pricePaise: paise(i.price) ?? 0n,
      gstRate: i.gst === null ? null : String(i.gst),
      hsn: i.hsn || null,
      description: i.desc || null,
      showPrice: i.showPrice,
      active: i.active,
      sort: i.sort,
    }))
  );

  await tx.insert(catalogPackage).values(
    data.packages.map((p: Row) => ({
      id: need(p.id),
      name: p.name,
      tier: p.tier,
      items: p.items.map((it: Row) => ({
        itemId: uuidOf(it.itemId),
        ...(it.name ? { name: it.name } : {}),
        qty: it.qty,
      })),
      pricePaise: paise(p.price) ?? 0n,
      billing: p.billing,
      bookable: p.bookable,
      durationMin: p.durationMin,
      advancePct: p.advancePct === null ? null : String(p.advancePct),
      description: p.desc || null,
      active: p.active,
      sort: p.sort,
    }))
  );

  await tx.insert(customer).values(
    data.customers.map((c: Row, n: number) => ({
      id: need(c.id),
      name: c.name,
      phone: phone(n + 1),
      email: c.email ? email("customer", n + 1) : null,
      company: c.company,
      gstin: c.gstin,
      stateCode: c.gstin ? c.gstin.slice(0, 2) : null,
      address: c.address,
      tags: c.tags,
      notes: c.notes || null,
      createdAt: when(c.createdAt) ?? new Date(),
    }))
  );

  await tx.insert(lead).values(
    data.leads.map((l: Row) => ({
      id: need(l.id),
      customerId: need(l.customerId),
      type: l.type,
      source: l.source,
      brief: l.brief,
      lines: l.lines.map((x: Row) => ({
        name: x.name,
        note: x.note,
        qty: x.qty,
        ratePaise: String(paise(x.rate) ?? 0n),
      })),
      preferredDate: day(l.preferredDate),
      preferredTime: time(l.preferredDate),
      packageId: uuidOf(l.packageId),
      assigneeId: uuidOf(l.assigneeId),
      status: l.status,
      priority: l.priority ?? "normal",
      snoozedUntil: when(l.snoozedUntil),
      rejectReason: l.rejectReason,
      createdAt: when(l.createdAt) ?? new Date(),
    }))
  );

  await tx.insert(booking).values(
    data.bookings.map((b: Row) => ({
      id: need(b.id),
      customerId: need(b.customerId),
      leadId: uuidOf(b.leadId),
      packageId: uuidOf(b.packageId),
      memberId: uuidOf(b.memberId),
      startAt: when(b.start) ?? new Date(),
      endAt: when(b.end),
      status: (BOOKING_STATUS[b.status] ?? b.status) as "to_confirm",
      notes: b.notes || null,
    }))
  );

  // Invoices first without the job link; jobs point back after.
  await tx.insert(invoice).values(
    data.invoices.map((i: Row) => ({
      id: need(i.id),
      kind: i.kind,
      piNumber: i.piNumber,
      invNumber: i.invNumber,
      leadId: uuidOf(i.leadId),
      customerId: need(i.customerId),
      bookingId: uuidOf(i.bookingId),
      version: i.version,
      history: i.history,
      discountPaise: paise(i.discount) ?? 0n,
      payBy: day(i.payBy),
      dueDate: day(i.dueDate),
      sharedAt: when(i.sharedAt),
      cancelled: i.cancelled,
      reminders: i.reminders,
      createdAt: when(i.createdAt) ?? new Date(),
    }))
  );

  await tx.insert(job).values(
    data.jobs.map((j: Row) => ({
      id: need(j.id),
      bookingId: uuidOf(j.bookingId),
      leadId: uuidOf(j.leadId),
      customerId: need(j.customerId),
      assigneeId: uuidOf(j.assigneeId),
      title: j.title,
      checklist: j.checklist,
      status: j.status,
      startAt: when(j.start),
      completedAt: when(j.completedAt),
      invoiceId: uuidOf(j.invoiceId),
    }))
  );
  await Promise.all(
    data.invoices
      .filter((i: Row) => i.jobId)
      .map((i: Row) =>
        tx
          .update(invoice)
          .set({ jobId: need(i.jobId) })
          .where(eq(invoice.id, need(i.id)))
      )
  );

  await tx.insert(invoiceLine).values(
    data.invoices.flatMap((i: Row) =>
      i.lines.map((l: Row, sort: number) => ({
        invoiceId: need(i.id),
        itemId: uuidOf(l.itemId),
        name: l.name,
        description: l.desc || null,
        qty: String(l.qty),
        unit: l.unit,
        ratePaise: paise(l.rate) ?? 0n,
        gstRate: l.gst === null ? null : String(l.gst),
        optional: l.optional,
        selected: l.selected,
        sort,
      }))
    )
  );

  await tx.insert(payment).values(
    data.payments.map((p: Row) => ({
      id: need(p.id),
      invoiceId: need(p.invoiceId),
      amountPaise: paise(p.amount) ?? 0n,
      method: p.method,
      reference: p.reference || null,
      proof: p.proof
        ? { key: `seed/${p.proof.name}`, name: p.proof.name }
        : null,
      uploadedById: uuidOf(p.uploadedBy),
      uploadedAt: when(p.uploadedAt),
      status: p.status,
      decidedById: uuidOf(p.decidedBy),
      decidedAt: when(p.decidedAt),
      note: p.note || null,
      selfApproved: p.selfApproved,
      version: p.version,
    }))
  );

  await tx.insert(messageTemplate).values(
    data.templates.map((t: Row) => ({
      number: t.id,
      event: t.event,
      name: t.name,
      trigger: t.trigger,
      audience: t.audience,
      subject: t.subject,
      body: t.body,
    }))
  );

  await tx.insert(activityLog).values(
    data.activity.map((a: Row) => ({
      at: when(a.at) ?? new Date(),
      byMemberId: uuidOf(a.by),
      action: a.action,
      recordType: a.action.split(".")[0],
      recordId: ids.get(a.recordId) ?? null,
      // Prototype lines name sample people; keep the action, not the names.
      text: a.action,
    }))
  );
}

const db = createDb({ DATABASE_URL: env.DATABASE_URL });
try {
  const existing = await withWorkspace(db, SEED_WORKSPACE_ID, (tx) =>
    tx.select({ id: workspace.id }).from(workspace)
  );
  if (existing.length > 0 && !process.argv.includes("--reset")) {
    console.log("Seed workspace already there; pass --reset to re-create it.");
  } else {
    await withWorkspace(db, SEED_WORKSPACE_ID, async (tx) => {
      await tx.delete(workspace).where(eq(workspace.id, SEED_WORKSPACE_ID));
      await seed(tx);
    });
    console.log(
      `Seeded workspace "${data.workspace.name}" with ${data.customers.length} customers, ${data.invoices.length} invoices, ${data.templates.length} ready messages.`
    );
  }
} finally {
  await db.$client.end();
}
