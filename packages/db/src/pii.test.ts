import { describe, expect, it } from "vitest";

import { PII_COLUMNS } from "./schema";
import { appDb, hasDb } from "./test/helpers";

describe.skipIf(!hasDb)("PII column map", () => {
  const db = hasDb ? appDb() : (null as never);

  it("lists only columns that exist, so DPDP export and erasure miss nothing", async () => {
    const { rows } = await db.$client.query<{ c: string }>(`
      select table_name || '.' || column_name as c from information_schema.columns
      where table_schema = 'public'`);
    const existing = new Set(rows.map((r) => r.c));
    const listed = Object.entries(PII_COLUMNS).flatMap(([table, columns]) =>
      columns.map((column) => `${table}.${column}`)
    );
    expect(listed.filter((c) => !existing.has(c))).toEqual([]);
  });
});
