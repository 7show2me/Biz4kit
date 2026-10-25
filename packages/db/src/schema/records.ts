import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { PgTableExtraConfigValue } from "drizzle-orm/pg-core";

import { catalogPackage, coverKind } from "./catalog";
import {
  member,
  sameWorkspace,
  tenantColumns,
  tenantKey,
  tenantPolicy,
} from "./tenancy";

const at = (name: string) => timestamp(name, { withTimezone: true });
const paise = (name: string) => bigint(name, { mode: "bigint" });

export const leadType = pgEnum("lead_type", ["quoted", "booked"]);
export const leadStatus = pgEnum("lead_status", [
  "new",
  "contacted",
  "replied",
  "snoozed",
  "rejected",
  "paid",
]);
export const leadPriority = pgEnum("lead_priority", ["normal", "high"]);
export const invoiceKind = pgEnum("invoice_kind", [
  "reply",
  "advance",
  "balance",
  "bill",
]);
export const paymentMethod = pgEnum("payment_method", [
  "upi",
  "bank",
  "cash",
  "card",
]);
export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "approved",
  "rejected",
]);
// Shown as To confirm / Agreed / … / Cancelled / No-show (D68, D69, D100).
export const bookingStatus = pgEnum("booking_status", [
  "to_confirm",
  "agreed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
]);
export const jobStatus = pgEnum("job_status", [
  "open",
  "in_progress",
  "done",
  "invoiced",
]);

export const customer = pgTable.withRLS(
  "customer",
  {
    ...tenantColumns(),
    name: text("name").notNull(),
    // Normalised E.164 (+ and digits), unique per workspace.
    phone: text("phone"),
    email: text("email"),
    company: text("company"),
    gstin: text("gstin"),
    // Place of supply; from the GSTIN when there is one.
    stateCode: text("state_code"),
    address: text("address"),
    tags: text("tags").array().notNull().default([]),
    // Portal link token ("My orders").
    token: text("token").unique(),
    notes: text("notes"),
  },
  (t) => [
    tenantKey(t),
    tenantPolicy(),
    uniqueIndex("customer_workspace_phone_uq").on(t.workspaceId, t.phone),
    check("customer_phone_check", sql`phone ~ '^\\+[1-9][0-9]{6,14}$'`),
  ]
);

export const lead = pgTable.withRLS(
  "lead",
  {
    ...tenantColumns(),
    customerId: uuid("customer_id").notNull(),
    type: leadType("type").notNull(),
    source: text("source"),
    brief: text("brief"),
    // Requested rows before pricing: [{ name, note, qty, ratePaise }].
    lines: jsonb("lines")
      .$type<
        { name: string; note?: string; qty: number; ratePaise?: string }[]
      >()
      .notNull()
      .default([]),
    preferredDate: date("preferred_date"),
    preferredTime: time("preferred_time"),
    packageId: uuid("package_id"),
    assigneeId: uuid("assignee_id"),
    status: leadStatus("status").notNull().default("new"),
    priority: leadPriority("priority").notNull().default("normal"),
    snoozedUntil: at("snoozed_until"),
    rejectReason: text("reject_reason"),
    // Consent record: when and which wording version (wording: lawyer, D23).
    consentAt: at("consent_at"),
    consentVersion: text("consent_version"),
  },
  (t) => [
    tenantKey(t),
    tenantPolicy(),
    sameWorkspace("lead_customer_fk", t, t.customerId, customer),
    sameWorkspace("lead_package_fk", t, t.packageId, catalogPackage),
    sameWorkspace("lead_assignee_fk", t, t.assigneeId, member),
  ]
);

export const booking = pgTable.withRLS(
  "booking",
  {
    ...tenantColumns(),
    customerId: uuid("customer_id").notNull(),
    leadId: uuid("lead_id"),
    packageId: uuid("package_id"),
    memberId: uuid("member_id"),
    startAt: at("start_at").notNull(),
    endAt: at("end_at"),
    status: bookingStatus("status").notNull().default("to_confirm"),
    notes: text("notes"),
  },
  (t) => [
    tenantKey(t),
    tenantPolicy(),
    sameWorkspace("booking_customer_fk", t, t.customerId, customer),
    sameWorkspace("booking_lead_fk", t, t.leadId, lead),
    sameWorkspace("booking_package_fk", t, t.packageId, catalogPackage),
    sameWorkspace("booking_member_fk", t, t.memberId, member),
    check("booking_end_check", sql`end_at is null or end_at > start_at`),
  ]
);

// A proforma (PI-) until its payment is approved, then also a tax invoice (INV-) (D60, D71).
// Status, totals, GST split and open balance are derived; cached_* only speed up lists.
export const invoice = pgTable.withRLS(
  "invoice",
  {
    ...tenantColumns(),
    kind: invoiceKind("kind").notNull(),
    piNumber: text("pi_number"),
    invNumber: text("inv_number"),
    leadId: uuid("lead_id"),
    customerId: uuid("customer_id").notNull(),
    bookingId: uuid("booking_id"),
    jobId: uuid("job_id"),
    version: integer("version").notNull().default(1),
    history: jsonb("history").$type<unknown[]>().notNull().default([]),
    discountPaise: paise("discount_paise").notNull().default(0n),
    payBy: date("pay_by"),
    dueDate: date("due_date"),
    sharedAt: at("shared_at"),
    cancelled: boolean("cancelled").notNull().default(false),
    cancelledAt: at("cancelled_at"),
    token: text("token").unique(),
    reminders: jsonb("reminders").$type<unknown[]>().notNull().default([]),
    cachedTotalPaise: paise("cached_total_paise"),
    cachedStatus: text("cached_status"),
  },
  (t): PgTableExtraConfigValue[] => [
    tenantKey(t),
    tenantPolicy(),
    sameWorkspace("invoice_lead_fk", t, t.leadId, lead),
    sameWorkspace("invoice_customer_fk", t, t.customerId, customer),
    sameWorkspace("invoice_booking_fk", t, t.bookingId, booking),
    // oxlint-disable-next-line no-use-before-define -- invoice and job point at each other
    sameWorkspace("invoice_job_fk", t, t.jobId, job),
    uniqueIndex("invoice_workspace_pi_number_uq")
      .on(t.workspaceId, t.piNumber)
      .where(sql`pi_number is not null`),
    uniqueIndex("invoice_workspace_inv_number_uq")
      .on(t.workspaceId, t.invNumber)
      .where(sql`inv_number is not null`),
    check("invoice_discount_paise_check", sql`discount_paise >= 0`),
    check("invoice_version_check", sql`version >= 1`),
  ]
);

export const job = pgTable.withRLS(
  "job",
  {
    ...tenantColumns(),
    bookingId: uuid("booking_id"),
    leadId: uuid("lead_id"),
    customerId: uuid("customer_id").notNull(),
    assigneeId: uuid("assignee_id"),
    title: text("title").notNull(),
    checklist: jsonb("checklist")
      .$type<{ t: string; done: boolean }[]>()
      .notNull()
      .default([]),
    status: jobStatus("status").notNull().default("open"),
    startAt: at("start_at"),
    completedAt: at("completed_at"),
    invoiceId: uuid("invoice_id"),
    // { before: [s3 keys], after: [s3 keys] } (D87).
    photos: jsonb("photos")
      .$type<{ before: string[]; after: string[] }>()
      .notNull()
      .default({ before: [], after: [] }),
    // [{ name, qty, unit, note }]; no prices (D87).
    materials: jsonb("materials")
      .$type<{ name: string; qty: number; unit?: string; note?: string }[]>()
      .notNull()
      .default([]),
  },
  (t): PgTableExtraConfigValue[] => [
    tenantKey(t),
    tenantPolicy(),
    sameWorkspace("job_booking_fk", t, t.bookingId, booking),
    sameWorkspace("job_lead_fk", t, t.leadId, lead),
    sameWorkspace("job_customer_fk", t, t.customerId, customer),
    sameWorkspace("job_assignee_fk", t, t.assigneeId, member),
    sameWorkspace("job_invoice_fk", t, t.invoiceId, invoice),
  ]
);

// A snapshot of the item at the time, never a reference to it (DI:142):
// item_id is kept for reports only and has no foreign key.
export const invoiceLine = pgTable.withRLS(
  "invoice_line",
  {
    ...tenantColumns(),
    invoiceId: uuid("invoice_id").notNull(),
    itemId: uuid("item_id"),
    name: text("name").notNull(),
    description: text("description"),
    qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
    unit: text("unit"),
    ratePaise: paise("rate_paise").notNull(),
    // Advance lines keep the full rate (D70).
    fullRatePaise: paise("full_rate_paise"),
    gstRate: numeric("gst_rate", { precision: 5, scale: 2 }),
    hsn: text("hsn"),
    optional: boolean("optional").notNull().default(false),
    // Ticked by the customer on the pay page (D102).
    selected: boolean("selected").notNull().default(true),
    sort: integer("sort").notNull().default(0),
    // Serials and cover (D85, D86).
    tracked: boolean("tracked").notNull().default(false),
    model: text("model"),
    modelNo: text("model_no"),
    cover: coverKind("cover"),
    coverMonths: integer("cover_months"),
    trackBatch: boolean("track_batch").notNull().default(false),
    serial: text("serial"),
    batch: text("batch"),
    cardToken: text("card_token").unique(),
    // Copied from invoice.cancelled by a trigger, for the serial index below.
    invoiceCancelled: boolean("invoice_cancelled").notNull().default(false),
  },
  (t) => [
    tenantPolicy(),
    sameWorkspace("invoice_line_invoice_fk", t, t.invoiceId, invoice),
    uniqueIndex("invoice_line_workspace_serial_uq")
      .on(t.workspaceId, sql`upper(${t.serial})`)
      .where(sql`serial is not null and not invoice_cancelled`),
    check("invoice_line_qty_check", sql`qty > 0`),
    check("invoice_line_rate_paise_check", sql`rate_paise >= 0`),
    check(
      "invoice_line_full_rate_paise_check",
      sql`full_rate_paise is null or full_rate_paise >= 0`
    ),
    check("invoice_line_gst_rate_check", sql`gst_rate between 0 and 100`),
  ]
);

export const payment = pgTable.withRLS(
  "payment",
  {
    ...tenantColumns(),
    invoiceId: uuid("invoice_id").notNull(),
    amountPaise: paise("amount_paise").notNull(),
    method: paymentMethod("method"),
    reference: text("reference"),
    // { key (private S3, D31), name, scanned }
    proof: jsonb("proof").$type<{
      key: string;
      name: string;
      scanned?: boolean;
    }>(),
    uploadedById: uuid("uploaded_by_id"),
    byCustomer: boolean("by_customer").notNull().default(false),
    uploadedAt: at("uploaded_at"),
    status: paymentStatus("status").notNull().default("pending"),
    decidedById: uuid("decided_by_id"),
    decidedAt: at("decided_at"),
    note: text("note"),
    selfApproved: boolean("self_approved").notNull().default(false),
    // The invoice version the customer paid against (D76).
    version: integer("version").notNull().default(1),
    // Approve-from-email link: 48 h, single use (D57). Only the hash is stored.
    approveTokenHash: text("approve_token_hash").unique(),
    approveTokenExpiresAt: at("approve_token_expires_at"),
    approveTokenUsedAt: at("approve_token_used_at"),
  },
  (t) => [
    tenantPolicy(),
    sameWorkspace("payment_invoice_fk", t, t.invoiceId, invoice),
    sameWorkspace("payment_uploaded_by_fk", t, t.uploadedById, member),
    sameWorkspace("payment_decided_by_fk", t, t.decidedById, member),
    check("payment_amount_paise_check", sql`amount_paise > 0`),
  ]
);
