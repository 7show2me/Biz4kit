import { defineConfig } from "drizzle-kit";
import "varlock/auto-load";

// Migrations run as the owner role; the app connects as biz4kit_app (DATABASE_URL).
export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./src/migrations",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    url: process.env.DATABASE_MIGRATION_URL || "",
  },
});
