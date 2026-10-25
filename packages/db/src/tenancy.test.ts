import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { withUser, withWorkspace } from "./index";
import { customer, invoice, lead, member, payment, workspace } from "./schema";
import { fakePhone, fillWorkspace } from "./test/fixtures";
import { PG, appDb, hasDb, makeWorkspace, pgCode } from "./test/helpers";

// Every table that belongs to a workspace (Architecture & contracts §Data model).
const WORKSPACE_TABLES = [
  "member",
  "numbering_counter",
  "catalog_item",
  "package",
  "customer",
  "lead",
  "invoice",
  "invoice_line",
  "payment",
  "booking",
  "job",
  "message_template",
  "message",
  "device",
  "activity_log",
] as const;
const TENANT_TABLES = ["workspace", ...WORKSPACE_TABLES];

describe.skipIf(!hasDb)("tenant isolation (RLS)", () => {
  const db = hasDb ? appDb() : (null as never);
  let a = "";
  let b = "";
  let bCustomerId = "";
  let bInvoiceId = "";

  beforeAll(async () => {
    a = await makeWorkspace(db, "Studio A");
    b = await makeWorkspace(db, "Studio B");
    await fillWorkspace(db, a);
    ({ customerId: bCustomerId, invoiceId: bInvoiceId } = await fillWorkspace(
      db,
      b
    ));
  });

  describe("database setup", () => {
    it("serves requests with a role that is not superuser, cannot bypass RLS and owns no table", async () => {
      const { rows } = await db.$client.query(`
        select r.rolsuper, r.rolbypassrls,
          (select count(*)::int from pg_tables t
            where t.schemaname = 'public' and t.tableowner = current_user) as owned
        from pg_roles r where r.rolname = current_user`);
      expect(rows[0]).toEqual({
        rolsuper: false,
        rolbypassrls: false,
        owned: 0,
      });
    });

    it("has every workspace table, each with a workspace_id column", async () => {
      const { rows } = await db.$client.query<{ table_name: string }>(`
        select table_name from information_schema.columns
        where table_schema = 'public' and column_name = 'workspace_id'`);
      expect(rows.map((r) => r.table_name).toSorted()).toEqual(
        [...WORKSPACE_TABLES].toSorted()
      );
    });

    it("has row-level security enabled and forced on every tenant table", async () => {
      const { rows } = await db.$client.query<{
        relname: string;
        relrowsecurity: boolean;
        relforcerowsecurity: boolean;
      }>(
        `select relname, relrowsecurity, relforcerowsecurity from pg_class
         where relnamespace = 'public'::regnamespace and relname = any($1)`,
        [TENANT_TABLES]
      );
      expect(rows).toHaveLength(TENANT_TABLES.length);
      for (const row of rows) {
        expect(row, row.relname).toMatchObject({
          relrowsecurity: true,
          relforcerowsecurity: true,
        });
      }
    });

    it("has row-level security on every table with a workspace_id, including future ones", async () => {
      const { rows } = await db.$client.query<{ relname: string }>(`
        select c.relname from pg_class c
        join information_schema.columns col
          on col.table_name = c.relname and col.table_schema = 'public'
        where c.relnamespace = 'public'::regnamespace
          and col.column_name = 'workspace_id'
          and not (c.relrowsecurity and c.relforcerowsecurity)`);
      expect(rows).toEqual([]);
    });
  });

  describe("read", () => {
    it.each(TENANT_TABLES)(
      "workspace A sees none of workspace B's %s rows",
      async (table) => {
        const key = table === "workspace" ? "id" : "workspace_id";
        const counts = await withWorkspace(db, a, async (tx) => {
          const { rows } = await tx.execute<{ n: number; other: number }>(
            sql`select count(*)::int as n,
                  count(*) filter (where ${sql.identifier(key)} <> ${a}::uuid)::int as other
                from ${sql.identifier(table)}`
          );
          return rows[0];
        });
        expect(counts?.n, `A has its own ${table} rows`).toBeGreaterThan(0);
        expect(counts?.other).toBe(0);
      }
    );

    it("cannot read another workspace's customer by id", async () => {
      const rows = await withWorkspace(db, a, (tx) =>
        tx.select().from(customer).where(eq(customer.id, bCustomerId))
      );
      expect(rows).toEqual([]);
    });

    it("cannot read another workspace's settings by id", async () => {
      const rows = await withWorkspace(db, a, (tx) =>
        tx.select().from(workspace).where(eq(workspace.id, b))
      );
      expect(rows).toEqual([]);
    });

    it("sees nothing without a workspace context", async () => {
      expect(await db.select().from(customer)).toEqual([]);
      expect(await db.select().from(workspace)).toEqual([]);
    });

    it("does not carry the workspace into the next query on the pool", async () => {
      await withWorkspace(db, a, (tx) => tx.select().from(customer));
      const leaked = await Promise.all(
        Array.from({ length: 5 }, () => db.select().from(customer))
      );
      expect(leaked.flat()).toEqual([]);
    });
  });

  describe("write", () => {
    it("cannot insert a row into another workspace", async () => {
      const code = await pgCode(() =>
        withWorkspace(db, a, (tx) =>
          tx
            .insert(customer)
            .values({ workspaceId: b, name: "Intruder", phone: fakePhone() })
        )
      );
      expect(code).toBe(PG.insufficientPrivilege);
    });

    it("cannot insert without a workspace context", async () => {
      const code = await pgCode(() =>
        db
          .insert(customer)
          .values({ workspaceId: a, name: "No context", phone: fakePhone() })
      );
      expect(code).not.toBe("ok");
    });

    it("cannot update another workspace's row", async () => {
      const updated = await withWorkspace(db, a, (tx) =>
        tx
          .update(customer)
          .set({ name: "Changed by A" })
          .where(eq(customer.id, bCustomerId))
          .returning()
      );
      expect(updated).toEqual([]);
      const [still] = await withWorkspace(db, b, (tx) =>
        tx.select().from(customer).where(eq(customer.id, bCustomerId))
      );
      expect(still?.name).toBe("Test Customer");
    });

    it("cannot move its own row into another workspace", async () => {
      const code = await pgCode(() =>
        withWorkspace(db, a, (tx) =>
          tx
            .update(customer)
            .set({ workspaceId: b })
            .where(eq(customer.workspaceId, a))
        )
      );
      expect(code).toBe(PG.insufficientPrivilege);
    });

    it("cannot link its own record to another workspace's record", async () => {
      const payForB = await pgCode(() =>
        withWorkspace(db, a, (tx) =>
          tx
            .insert(payment)
            .values({ invoiceId: bInvoiceId, amountPaise: 100n })
        )
      );
      expect(payForB).toBe(PG.foreignKeyViolation);
      const leadForB = await pgCode(() =>
        withWorkspace(db, a, (tx) =>
          tx
            .insert(lead)
            .values({ customerId: bCustomerId, type: "quoted", source: "web" })
        )
      );
      expect(leadForB).toBe(PG.foreignKeyViolation);
      const invoiceForB = await pgCode(() =>
        withWorkspace(db, a, (tx) =>
          tx.insert(invoice).values({ kind: "bill", customerId: bCustomerId })
        )
      );
      expect(invoiceForB).toBe(PG.foreignKeyViolation);
    });

    it("cannot delete another workspace's row", async () => {
      const deleted = await withWorkspace(db, a, (tx) =>
        tx.delete(customer).where(eq(customer.id, bCustomerId)).returning()
      );
      expect(deleted).toEqual([]);
    });

    it("cannot change another workspace's settings", async () => {
      const updated = await withWorkspace(db, a, (tx) =>
        tx
          .update(workspace)
          .set({ name: "Taken" })
          .where(eq(workspace.id, b))
          .returning()
      );
      expect(updated).toEqual([]);
    });
  });

  describe("withWorkspace", () => {
    it("rejects a workspace id that is not a UUID, before any query", async () => {
      await expect(
        withWorkspace(db, "' or true --", (tx) => tx.select().from(customer))
      ).rejects.toThrow(/workspace id/iu);
    });
  });

  describe("withUser (choosing a workspace after sign-in)", () => {
    it("lists only the signed-in user's own memberships, across workspaces", async () => {
      const userId = `test-user-${randomUUID()}`;
      const otherUser = `test-user-${randomUUID()}`;
      await db.$client.query(
        `insert into "user" (id, name, email, updated_at)
         values ($1, 'Test', $2, now()), ($3, 'Other', $4, now())`,
        [userId, `${userId}@example.com`, otherUser, `${otherUser}@example.com`]
      );
      const links = [
        [a, userId],
        [b, userId],
        [b, otherUser],
      ] as const;
      await Promise.all(
        links.map(([ws, uid]) =>
          withWorkspace(db, ws, (tx) =>
            tx.insert(member).values({
              userId: uid,
              name: "Test Member",
              email: `${uid}@example.com`,
              role: "staff",
              status: "active",
            })
          )
        )
      );

      const mine = await withUser(db, userId, (tx) => tx.select().from(member));
      expect(mine.map((m) => m.workspaceId).toSorted()).toEqual(
        [a, b].toSorted()
      );
      expect(mine.every((m) => m.userId === userId)).toBe(true);

      const spaces = await withUser(db, userId, (tx) =>
        tx.select({ id: workspace.id }).from(workspace)
      );
      expect(spaces.map((w) => w.id).toSorted()).toEqual([a, b].toSorted());

      expect(
        await withUser(db, userId, (tx) => tx.select().from(customer))
      ).toEqual([]);
    });
  });
});
