import { readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SCREENS, routedScreens } from "../screens";

const routesDir = path.join(import.meta.dirname, "../../routes");

// "w.$slug.invoices.overdue.tsx" -> "/w/$slug/invoices/overdue"
const filePath = (file: string) => {
  const parts = file
    .replace(/\.tsx$/u, "")
    .split(".")
    .filter((p) => p !== "index" && p !== "route");
  return `/${parts.join("/")}`.replace(/\/$/u, "") || "/";
};

describe("screen map (D94)", () => {
  it("lists all 38 locked prototype screens, once each", () => {
    expect(SCREENS).toHaveLength(38);
    expect(new Set(SCREENS.map((s) => s.id)).size).toBe(38);
  });

  it("has a route file for every screen that is a page", () => {
    const have = new Set(
      readdirSync(routesDir)
        .filter((f) => f.endsWith(".tsx"))
        .map(filePath)
    );
    const missing = routedScreens()
      .map((s) => s.path)
      .filter((p) => !have.has(p));
    expect(missing).toEqual([]);
  });

  it("marks emails and modals as not routed", () => {
    const ids = routedScreens().map((s) => s.id);
    expect(ids).not.toContain("invoice-email");
    expect(ids).not.toContain("record");
  });
});
