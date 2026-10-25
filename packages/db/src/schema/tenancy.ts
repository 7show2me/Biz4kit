import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  integer,
  jsonb,
  pgEnum,
  pgPolicy,
  pgRole,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { PgColumn } from "drizzle-orm/pg-core";

import { session, user } from "./auth";

// Requests run as this role: no BYPASSRLS, owns no table (packages/db/scripts/app-role.ts).
// Migrations run as the owner; RLS is forced, so the owner sees no rows either.
export const appRole = pgRole("biz4kit_app").existing();

// SQL functions (migration app_role) reading the per-transaction settings made by
// withWorkspace / withUser (src/index.ts). Not set → null → no rows.
const currentWorkspace = sql`app_workspace_id()`;
const currentUser = sql`app_user_id()`;

const at = (name: string) => timestamp(name, { withTimezone: true });

export const memberRole = pgEnum("member_role", [
  "owner",
  "manager",
  "staff",
  "accountant",
]);
export const memberStatus = pgEnum("member_status", [
  "invited",
  "active",
  "removed",
]);
export const numberSeries = pgEnum("number_series", ["PI", "INV"]);

export const workspace = pgTable.withRLS(
  "workspace",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    legalName: text("legal_name"),
    // <slug>.biz4kit.com (D47).
    slug: text("slug").notNull().unique(),
    vertical: text("vertical"),
    address: text("address"),
    city: text("city"),
    pin: text("pin"),
    state: text("state"),
    // From the GSTIN when there is one (place of supply).
    stateCode: text("state_code"),
    phone: text("phone"),
    email: text("email"),
    gstin: text("gstin"),
    upi: text("upi"),
    // { name, account, ifsc }
    bank: jsonb("bank").$type<{
      name: string;
      account: string;
      ifsc: string;
    }>(),
    // { primary, accent, logo }
    brand: jsonb("brand")
      .$type<{ primary?: string; accent?: string; logo?: string }>()
      .notNull()
      .default({}),
    // Prefixes only; the next numbers live in numbering_counter (D60, D71).
    numbering: jsonb("numbering")
      .$type<{ PI: { prefix: string }; INV: { prefix: string } }>()
      .notNull()
      .default({ PI: { prefix: "PI" }, INV: { prefix: "INV" } }),
    // Sample values in the prototype (15 / 7) are placeholders: no default.
    replyValidDays: integer("reply_valid_days"),
    billDueDays: integer("bill_due_days"),
    // Off until the Owner turns it on; Managers approve strictly below the limit (D57, D74).
    managerApprovalsEnabled: boolean("manager_approvals_enabled")
      .notNull()
      .default(false),
    managerLimitPaise: bigint("manager_limit_paise", { mode: "bigint" }),
    // { board, customers, jobs, serials }; set by the starter kit (D85, D96).
    modules: jsonb("modules")
      .$type<Record<string, boolean>>()
      .notNull()
      .default({}),
    // Up to two [from, to] ranges per weekday; a day without ranges is closed (D99).
    openingHours: jsonb("opening_hours")
      .$type<Record<string, [string, string][]>>()
      .notNull()
      .default({}),
    terms: text("terms"),
    setupDismissed: boolean("setup_dismissed").notNull().default(false),
    createdAt: at("created_at").notNull().defaultNow(),
    updatedAt: at("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  () => [
    pgPolicy("tenant_isolation", {
      for: "all",
      to: appRole,
      using: sql`id = ${currentWorkspace}`,
      withCheck: sql`id = ${currentWorkspace}`,
    }),
    // After sign-in, before a workspace is chosen: the user's own workspaces.
    pgPolicy("member_workspaces", {
      for: "select",
      to: appRole,
      using: sql`id in (select m.workspace_id from member m where m.user_id = ${currentUser} and m.status <> 'removed')`,
    }),
    check(
      "workspace_manager_limit_paise_check",
      sql`manager_limit_paise is null or manager_limit_paise > 0`
    ),
  ]
);

/** Columns every workspace table starts with. */
export const tenantColumns = () => ({
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .default(currentWorkspace)
    .references(() => workspace.id, { onDelete: "cascade" }),
  createdAt: at("created_at").notNull().defaultNow(),
  updatedAt: at("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** A row is visible and writable only inside its own workspace's context. */
export const tenantPolicy = () =>
  pgPolicy("tenant_isolation", {
    for: "all",
    to: appRole,
    using: sql`workspace_id = ${currentWorkspace}`,
    withCheck: sql`workspace_id = ${currentWorkspace}`,
  });

/** Lets other tables point at this one only from the same workspace. */
export const tenantKey = (t: { workspaceId: PgColumn; id: PgColumn }) =>
  unique().on(t.workspaceId, t.id);

/**
 * A foreign key that also matches workspace_id. Plain foreign keys skip RLS,
 * so without this a known id from another workspace could be linked.
 */
export const sameWorkspace = (
  name: string,
  from: { workspaceId: PgColumn },
  column: PgColumn,
  target: { workspaceId: PgColumn; id: PgColumn }
) =>
  foreignKey({
    name,
    columns: [from.workspaceId, column],
    foreignColumns: [target.workspaceId, target.id],
  });

export const member = pgTable.withRLS(
  "member",
  {
    ...tenantColumns(),
    // Null until the invite is accepted.
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    role: memberRole("role").notNull(),
    // Soft delete: "removed", never a hard delete (DI:191). DELETE is not granted.
    status: memberStatus("status").notNull().default("invited"),
    removedAt: at("removed_at"),
    seenAt: at("seen_at"),
    // Inbox kinds the member muted (D87).
    mute: jsonb("mute").$type<Record<string, boolean>>().notNull().default({}),
  },
  (t) => [
    tenantKey(t),
    tenantPolicy(),
    pgPolicy("own_memberships", {
      for: "select",
      to: appRole,
      using: sql`user_id = ${currentUser}`,
    }),
    uniqueIndex("member_workspace_email_uq")
      .on(t.workspaceId, sql`lower(${t.email})`)
      .where(sql`status <> 'removed'`),
    uniqueIndex("member_workspace_user_uq")
      .on(t.workspaceId, t.userId)
      .where(sql`status <> 'removed'`),
  ]
);

// One row per workspace, series and financial year, so the CA's answer on
// yearly reset needs no schema change. `next` never goes down (trigger) and
// rows are never deleted (DELETE is not granted).
export const numberingCounter = pgTable.withRLS(
  "numbering_counter",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .default(currentWorkspace)
      .references(() => workspace.id, { onDelete: "cascade" }),
    series: numberSeries("series").notNull(),
    // Indian financial year as in the prototype's numbers: 2627 = Apr 2026 to Mar 2027.
    fy: text("fy").notNull(),
    next: integer("next").notNull(),
    updatedAt: at("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.series, t.fy] }),
    tenantPolicy(),
    check("numbering_counter_fy_check", sql`fy ~ '^[0-9]{4}$'`),
    check("numbering_counter_next_check", sql`next >= 1`),
  ]
);

export const device = pgTable.withRLS(
  "device",
  {
    ...tenantColumns(),
    memberId: uuid("member_id").notNull(),
    // The Better Auth session behind this device (WBS 1.3).
    sessionId: text("session_id").references(() => session.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    platform: text("platform"),
    lastSeenAt: at("last_seen_at"),
    revokedAt: at("revoked_at"),
  },
  (t) => [
    tenantPolicy(),
    sameWorkspace("device_member_fk", t, t.memberId, member),
  ]
);

export const activityLog = pgTable.withRLS(
  "activity_log",
  {
    ...tenantColumns(),
    at: at("at").notNull().defaultNow(),
    // Null for system and customer actions.
    byMemberId: uuid("by_member_id"),
    action: text("action").notNull(),
    recordType: text("record_type"),
    recordId: uuid("record_id"),
    text: text("text").notNull(),
    // { field: [before, after] }
    diff: jsonb("diff").$type<Record<string, [unknown, unknown]>>(),
  },
  (t) => [
    tenantPolicy(),
    sameWorkspace("activity_log_member_fk", t, t.byMemberId, member),
  ]
);
