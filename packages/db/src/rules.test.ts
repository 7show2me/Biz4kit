import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { takeNumber, withWorkspace } from "./index";
import {
  booking,
  catalogItem,
  customer,
  invoice,
  invoiceLine,
  member,
  numberingCounter,
  payment,
} from "./schema";
import { fakePhone, fillWorkspace } from "./test/fixtures";
import { PG, appDb, hasDb, makeWorkspace, pgCode } from "./test/helpers";

describe.skipIf(!hasDb)("data rules", () => {
  const db = hasDb ? appDb() : (null as never);
  let a = "";
  let b = "";
  let customerId = "";
  let ownerId = "";

  beforeAll(async () => {
    a = await makeWorkspace(db, "Rules A");
    b = await makeWorkspace(db, "Rules B");
    ({ customerId, ownerId } = await fillWorkspace(db, a));
  });

  const newInvoice = (ws: string, cid: string) =>
    withWorkspace(db, ws, async (tx) => {
      const [row] = await tx
        .insert(invoice)
        .values({ kind: "bill", customerId: cid })
        .returning();
      return row?.id ?? "";
    });
  const addLine = (ws: string, invoiceId: string, serial: string) =>
    pgCode(() =>
      withWorkspace(db, ws, (tx) =>
        tx.insert(invoiceLine).values({
          invoiceId,
          name: "Pump",
          qty: "1",
          ratePaise: 100n,
          serial,
        })
      )
    );

  describe("money is integer paise (Arch §Data model)", () => {
    const MONEY = [
      ["workspace", "manager_limit_paise"],
      ["catalog_item", "price_paise"],
      ["package", "price_paise"],
      ["invoice", "discount_paise"],
      ["invoice", "cached_total_paise"],
      ["invoice_line", "rate_paise"],
      ["invoice_line", "full_rate_paise"],
      ["payment", "amount_paise"],
    ] as const;

    it("stores every money column as bigint", async () => {
      const { rows } = await db.$client.query<{
        table_name: string;
        column_name: string;
        data_type: string;
      }>(`select table_name, column_name, data_type from information_schema.columns
          where table_schema = 'public' and column_name like '%\\_paise'`);
      const found = rows.map((r) => [r.table_name, r.column_name]);
      expect(found.toSorted()).toEqual(MONEY.map((m) => [...m]).toSorted());
      for (const row of rows) {
        expect(row.data_type, `${row.table_name}.${row.column_name}`).toBe(
          "bigint"
        );
      }
    });

    it("has no floating-point columns at all", async () => {
      const { rows } = await db.$client.query(`
        select table_name, column_name from information_schema.columns
        where table_schema = 'public' and data_type in ('real', 'double precision', 'money')`);
      expect(rows).toEqual([]);
    });

    it("keeps paise exact for large amounts", async () => {
      // Above Number.MAX_SAFE_INTEGER.
      const big = 9_007_199_254_740_993n;
      const [row] = await withWorkspace(db, a, (tx) =>
        tx
          .insert(catalogItem)
          .values({ name: "Big", pricePaise: big })
          .returning()
      );
      expect(row?.pricePaise).toBe(big);
    });

    it("rejects a negative price", async () => {
      const code = await pgCode(() =>
        withWorkspace(db, a, (tx) =>
          tx.insert(catalogItem).values({ name: "Bad", pricePaise: -1n })
        )
      );
      expect(code).toBe(PG.checkViolation);
    });

    it("rejects a payment of zero", async () => {
      const [inv] = await withWorkspace(db, a, (tx) =>
        tx.select().from(invoice).limit(1)
      );
      const code = await pgCode(() =>
        withWorkspace(db, a, (tx) =>
          tx
            .insert(payment)
            .values({ invoiceId: inv?.id ?? "", amountPaise: 0n })
        )
      );
      expect(code).toBe(PG.checkViolation);
    });
  });

  describe("customer phone (unique, normalised)", () => {
    it("rejects a second customer with the same phone in one workspace", async () => {
      const phone = fakePhone();
      await withWorkspace(db, a, (tx) =>
        tx.insert(customer).values({ name: "First", phone })
      );
      const code = await pgCode(() =>
        withWorkspace(db, a, (tx) =>
          tx.insert(customer).values({ name: "Second", phone })
        )
      );
      expect(code).toBe(PG.uniqueViolation);
    });

    it("allows the same phone in another workspace", async () => {
      const phone = fakePhone();
      await withWorkspace(db, a, (tx) =>
        tx.insert(customer).values({ name: "In A", phone })
      );
      const code = await pgCode(() =>
        withWorkspace(db, b, (tx) =>
          tx.insert(customer).values({ name: "In B", phone })
        )
      );
      expect(code).toBe("ok");
    });

    it("rejects a phone that is not normalised (+ and digits only)", async () => {
      const code = await pgCode(() =>
        withWorkspace(db, a, (tx) =>
          tx.insert(customer).values({ name: "Spaces", phone: "98765 43210" })
        )
      );
      expect(code).toBe(PG.checkViolation);
    });
  });

  describe("serial numbers (D85): unique per workspace while the invoice is live", () => {
    it("rejects the same serial on two live invoices, ignoring case", async () => {
      const serial = `SN-${Date.now()}`;
      expect(await addLine(a, await newInvoice(a, customerId), serial)).toBe(
        "ok"
      );
      expect(
        await addLine(a, await newInvoice(a, customerId), serial.toLowerCase())
      ).toBe(PG.uniqueViolation);
    });

    it("allows the serial again once the first invoice is cancelled", async () => {
      const serial = `SN-C-${Date.now()}`;
      const first = await newInvoice(a, customerId);
      expect(await addLine(a, first, serial)).toBe("ok");
      await withWorkspace(db, a, (tx) =>
        tx
          .update(invoice)
          .set({ cancelled: true, cancelledAt: new Date() })
          .where(eq(invoice.id, first))
      );
      expect(await addLine(a, await newInvoice(a, customerId), serial)).toBe(
        "ok"
      );
    });

    it("allows the same serial in another workspace", async () => {
      const serial = `SN-W-${Date.now()}`;
      expect(await addLine(a, await newInvoice(a, customerId), serial)).toBe(
        "ok"
      );
      const bCustomer = await withWorkspace(db, b, async (tx) => {
        const [row] = await tx
          .insert(customer)
          .values({ name: "B buyer", phone: fakePhone() })
          .returning();
        return row?.id ?? "";
      });
      expect(await addLine(b, await newInvoice(b, bCustomer), serial)).toBe(
        "ok"
      );
    });
  });

  describe("document numbers (D60, D71): gap-free, separate series, never go down", () => {
    it("gives 1, 2, 3 in order per series and financial year", async () => {
      const ws = await makeWorkspace(db, "Numbers");
      const take = (series: "PI" | "INV", fy: string) =>
        withWorkspace(db, ws, (tx) => takeNumber(tx, { series, fy }));
      expect([await take("PI", "2627"), await take("PI", "2627")]).toEqual([
        1, 2,
      ]);
      expect(await take("INV", "2627")).toBe(1);
      expect(await take("PI", "2728")).toBe(1);
      expect(await take("PI", "2627")).toBe(3);
    });

    it("never repeats or skips a number when taken at the same time", async () => {
      const ws = await makeWorkspace(db, "Parallel");
      const taken = await Promise.all(
        Array.from({ length: 10 }, () =>
          withWorkspace(db, ws, (tx) =>
            takeNumber(tx, { series: "INV", fy: "2627" })
          )
        )
      );
      expect(taken.toSorted((x, y) => x - y)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      ]);
    });

    it("does not reuse a number when the transaction that took it fails", async () => {
      const ws = await makeWorkspace(db, "Rollback");
      const take = () =>
        withWorkspace(db, ws, (tx) =>
          takeNumber(tx, { series: "PI", fy: "2627" })
        );
      expect(await take()).toBe(1);
      await pgCode(() =>
        withWorkspace(db, ws, async (tx) => {
          await takeNumber(tx, { series: "PI", fy: "2627" });
          throw new Error("share failed");
        })
      );
      // Rolled back with its transaction, so the next share gets 2: no gap.
      expect(await take()).toBe(2);
    });

    it("refuses to move a counter backwards", async () => {
      const ws = await makeWorkspace(db, "Backwards");
      await withWorkspace(db, ws, (tx) =>
        takeNumber(tx, { series: "PI", fy: "2627" })
      );
      const code = await pgCode(() =>
        withWorkspace(db, ws, (tx) =>
          tx.update(numberingCounter).set({ next: 1 })
        )
      );
      expect(code).toBe(PG.raised);
    });

    it("refuses to delete a counter", async () => {
      const code = await pgCode(() =>
        withWorkspace(db, a, (tx) => tx.delete(numberingCounter))
      );
      expect(code).toBe(PG.insufficientPrivilege);
    });

    it("rejects a financial year that is not four digits", async () => {
      const code = await pgCode(() =>
        withWorkspace(db, a, (tx) =>
          takeNumber(tx, { series: "PI", fy: "2026-27" })
        )
      );
      expect(code).toBe(PG.checkViolation);
    });

    it("rejects the same PI- number twice in one workspace", async () => {
      const piNumber = `PI-2627-T${Date.now()}`;
      await withWorkspace(db, a, (tx) =>
        tx.insert(invoice).values({ kind: "reply", customerId, piNumber })
      );
      const code = await pgCode(() =>
        withWorkspace(db, a, (tx) =>
          tx.insert(invoice).values({ kind: "reply", customerId, piNumber })
        )
      );
      expect(code).toBe(PG.uniqueViolation);
    });
  });

  describe("members are soft-deleted (DI:191)", () => {
    it("cannot hard-delete a member", async () => {
      const code = await pgCode(() =>
        withWorkspace(db, a, (tx) =>
          tx.delete(member).where(eq(member.id, ownerId))
        )
      );
      expect(code).toBe(PG.insufficientPrivilege);
    });

    it("can mark a member removed", async () => {
      const [m] = await withWorkspace(db, a, (tx) =>
        tx
          .insert(member)
          .values({
            name: "Leaver",
            email: `leaver-${Date.now()}@example.com`,
            role: "staff",
          })
          .returning()
      );
      const [removed] = await withWorkspace(db, a, (tx) =>
        tx
          .update(member)
          .set({ status: "removed", removedAt: new Date() })
          .where(eq(member.id, m?.id ?? ""))
          .returning()
      );
      expect(removed?.status).toBe("removed");
    });
  });

  describe("statuses are enums", () => {
    it("names booking statuses as decided (D68, D69, D100)", async () => {
      const { rows } = await db.$client.query<{ v: string }>(
        "select unnest(enum_range(null::booking_status))::text as v"
      );
      expect(rows.map((r) => r.v)).toEqual([
        "to_confirm",
        "agreed",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ]);
    });

    it("names lead statuses as decided (D66)", async () => {
      const { rows } = await db.$client.query<{ v: string }>(
        "select unnest(enum_range(null::lead_status))::text as v"
      );
      expect(rows.map((r) => r.v)).toEqual([
        "new",
        "contacted",
        "replied",
        "snoozed",
        "rejected",
        "paid",
      ]);
    });

    it("rejects the prototype's old booking word 'tentative'", async () => {
      const code = await pgCode(() =>
        withWorkspace(db, a, (tx) =>
          tx.execute(
            sql`insert into booking (customer_id, start_at, status)
                values (${customerId}, now(), 'tentative')`
          )
        )
      );
      expect(code).toBe(PG.invalidEnum);
    });

    it("rejects a booking that ends before it starts", async () => {
      const code = await pgCode(() =>
        withWorkspace(db, a, (tx) =>
          tx.insert(booking).values({
            customerId,
            startAt: new Date("2026-11-02T11:00:00+05:30"),
            endAt: new Date("2026-11-02T10:00:00+05:30"),
          })
        )
      );
      expect(code).toBe(PG.checkViolation);
    });
  });

  describe("derived values are not stored as truth (Arch §Data model)", () => {
    it("has no invoice status, GST split or open balance column", async () => {
      const { rows } = await db.$client.query<{ column_name: string }>(`
        select column_name from information_schema.columns
        where table_schema = 'public' and table_name in ('invoice', 'invoice_line', 'payment')
          and (column_name ~ '(cgst|sgst|igst|balance|open_)'
            or (table_name <> 'payment' and column_name = 'status'))`);
      expect(rows).toEqual([]);
    });
  });
});
