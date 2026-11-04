import { describe, expect, it } from "vitest";

import {
  DEFAULT_MODULES,
  FAVOURITES,
  SETTINGS_ITEM,
  visibleSections,
  workspaceHref,
} from "../nav";

const names = (sections: ReturnType<typeof visibleSections>) =>
  sections.map((s) => s.label);
const pageIds = (sections: ReturnType<typeof visibleSections>) =>
  sections.flatMap((s) => s.pages.map((p) => p.id));

describe("sidebar sections (D80, D83)", () => {
  it("lists Home, Sales, Schedule, Payments, Business in that order", () => {
    const sections = visibleSections({
      role: "owner",
      modules: { board: true, customers: true, jobs: true, serials: true },
    });
    expect(names(sections)).toEqual([
      "Home",
      "Sales",
      "Schedule",
      "Payments",
      "Business",
    ]);
  });

  it("keeps Settings out of every section: it is its own item", () => {
    const sections = visibleSections({
      role: "owner",
      modules: DEFAULT_MODULES,
    });
    expect(pageIds(sections)).not.toContain("settings");
    expect(SETTINGS_ITEM.id).toBe("settings");
    expect(SETTINGS_ITEM.who).toBe("Owner");
  });

  it("puts Catalog and Packages in Business", () => {
    const business = visibleSections({
      role: "owner",
      modules: DEFAULT_MODULES,
    }).find((s) => s.label === "Business");
    expect(business?.pages.map((p) => p.id)).toEqual(["catalog", "packages"]);
  });
});

describe("Lite mode (D63)", () => {
  it("starts with Board, Customers, Jobs and Serials off", () => {
    expect(DEFAULT_MODULES).toEqual({
      board: false,
      customers: false,
      jobs: false,
      serials: false,
    });
  });

  it("hides the extras by default and shows them when opted in", () => {
    const lite = pageIds(
      visibleSections({ role: "owner", modules: DEFAULT_MODULES })
    );
    for (const extra of ["board", "customers", "jobs", "serials"]) {
      expect(lite).not.toContain(extra);
    }
    const full = pageIds(
      visibleSections({
        role: "owner",
        modules: { board: true, customers: true, jobs: true, serials: true },
      })
    );
    for (const extra of ["board", "customers", "jobs", "serials"]) {
      expect(full).toContain(extra);
    }
  });

  it("keeps the four core jobs reachable in Lite mode", () => {
    const lite = pageIds(
      visibleSections({ role: "owner", modules: DEFAULT_MODULES })
    );
    expect(lite).toEqual(
      expect.arrayContaining(["leads", "invoices", "catalog", "dashboard"])
    );
  });

  it("omits a section with no visible page", () => {
    const sections = visibleSections({
      role: "staff",
      modules: DEFAULT_MODULES,
    });
    expect(names(sections)).toEqual(["Home", "Sales", "Schedule"]);
  });
});

describe("role visibility", () => {
  it("hides Payments pages from Staff", () => {
    const ids = pageIds(
      visibleSections({ role: "staff", modules: DEFAULT_MODULES })
    );
    expect(ids).not.toContain("invoices");
    expect(ids).not.toContain("approvals");
  });

  it("shows Approvals to a Manager only when payment approval is delegated", () => {
    const off = pageIds(
      visibleSections({ role: "manager", modules: DEFAULT_MODULES })
    );
    const on = pageIds(
      visibleSections({
        role: "manager",
        modules: DEFAULT_MODULES,
        managerApprovals: true,
      })
    );
    expect(off).not.toContain("approvals");
    expect(on).toContain("approvals");
  });

  it("gives the Accountant read pages only (D91): no Catalog, no Approvals", () => {
    const ids = pageIds(
      visibleSections({ role: "accountant", modules: DEFAULT_MODULES })
    );
    expect(ids).toContain("invoices");
    expect(ids).not.toContain("catalog");
    expect(ids).not.toContain("approvals");
  });
});

describe("favourites (D82, D83)", () => {
  it("has Catalog, Create invoice and Send reply, each on its own status hue", () => {
    expect(FAVOURITES.map((f) => f.label)).toEqual([
      "Catalog",
      "Create invoice",
      "Send reply",
    ]);
    expect(new Set(FAVOURITES.map((f) => f.tone)).size).toBe(3);
    expect(FAVOURITES.map((f) => f.tone)).toEqual(["teal", "info", "violet"]);
  });
});

describe("workspaceHref", () => {
  it("builds the workspace URL from the slug", () => {
    expect(workspaceHref("glow", "dashboard")).toBe("/w/glow");
    expect(workspaceHref("glow", "leads")).toBe("/w/glow/leads");
    expect(workspaceHref("glow", "overdue")).toBe("/w/glow/invoices/overdue");
    expect(workspaceHref("glow", "inbox")).toBe("/w/glow/inbox");
  });

  it("throws for a page that has no workspace URL", () => {
    expect(() => workspaceHref("glow", "p-pay")).toThrow();
  });
});
