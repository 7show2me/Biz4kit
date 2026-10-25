import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
} from "drizzle-orm/pg-core";

import { tenantColumns, tenantKey, tenantPolicy } from "./tenancy";

export const coverKind = pgEnum("cover_kind", ["warranty", "guarantee"]);

export const catalogItem = pgTable.withRLS(
  "catalog_item",
  {
    ...tenantColumns(),
    name: text("name").notNull(),
    category: text("category"),
    unit: text("unit"),
    pricePaise: bigint("price_paise", { mode: "bigint" }).notNull(),
    // Percent; null until set (draft kits leave GST unset, D96).
    gstRate: numeric("gst_rate", { precision: 5, scale: 2 }),
    hsn: text("hsn"),
    description: text("description"),
    showPrice: boolean("show_price").notNull().default(true),
    active: boolean("active").notNull().default(true),
    sort: integer("sort").notNull().default(0),
    // S3 keys (D31).
    photos: jsonb("photos").$type<string[]>().notNull().default([]),
    moq: integer("moq"),
    // Serials and cover (D85).
    tracked: boolean("tracked").notNull().default(false),
    model: text("model"),
    modelNo: text("model_no"),
    cover: coverKind("cover"),
    coverMonths: integer("cover_months"),
    trackBatch: boolean("track_batch").notNull().default(false),
  },
  (t) => [
    tenantKey(t),
    tenantPolicy(),
    check("catalog_item_price_paise_check", sql`price_paise >= 0`),
    check("catalog_item_gst_rate_check", sql`gst_rate between 0 and 100`),
    check("catalog_item_moq_check", sql`moq > 0`),
    check("catalog_item_cover_months_check", sql`cover_months > 0`),
  ]
);

// "package" in SQL; catalogPackage in code (package is reserved in strict JS).
export const catalogPackage = pgTable.withRLS(
  "package",
  {
    ...tenantColumns(),
    name: text("name").notNull(),
    tier: text("tier"),
    // [{ itemId, qty }] or a free-text row [{ itemId: null, name, qty }].
    items: jsonb("items")
      .$type<{ itemId: string | null; name?: string; qty: number }[]>()
      .notNull()
      .default([]),
    pricePaise: bigint("price_paise", { mode: "bigint" }).notNull(),
    billing: text("billing"),
    bookable: boolean("bookable").notNull().default(false),
    durationMin: integer("duration_min"),
    // No default: each business sets its own (D66).
    advancePct: numeric("advance_pct", { precision: 5, scale: 2 }),
    description: text("description"),
    active: boolean("active").notNull().default(true),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [
    tenantKey(t),
    tenantPolicy(),
    check("package_price_paise_check", sql`price_paise >= 0`),
    check(
      "package_advance_pct_check",
      sql`advance_pct > 0 and advance_pct <= 100`
    ),
    check("package_duration_min_check", sql`duration_min > 0`),
  ]
);
