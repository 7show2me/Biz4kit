import { describe, expect, it } from "vitest";

import { FAMILIES, STATUS, statusTone } from "../status";

describe("status colours (D26, D51, D55, D100)", () => {
  for (const [family, keys] of Object.entries(FAMILIES)) {
    it(`${family}: no two statuses share a colour`, () => {
      const tones = keys.map((k) => STATUS[k].tone);
      expect(new Set(tones).size).toBe(tones.length);
    });
  }

  it("gives every status a word and an icon", () => {
    for (const s of Object.values(STATUS)) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.icon.length).toBeGreaterThan(0);
    }
  });

  it("uses the D55 invoice colours", () => {
    expect(statusTone("Invoice", "draft")).toBe("muted");
    expect(statusTone("Invoice", "due")).toBe("warning");
    expect(statusTone("Invoice", "part_paid")).toBe("teal");
    expect(statusTone("Invoice", "overdue")).toBe("destructive");
    expect(statusTone("Invoice", "paid")).toBe("success");
    expect(statusTone("Invoice", "pending")).toBe("violet");
  });

  it("uses the D55 lead and job colours", () => {
    expect(statusTone("Lead", "new")).toBe("info");
    expect(statusTone("Lead", "replied")).toBe("violet");
    expect(statusTone("Lead", "snoozed")).toBe("warning");
    expect(statusTone("Job", "open")).toBe("muted");
    expect(statusTone("Job", "in_progress")).toBe("info");
    expect(statusTone("Job", "done")).toBe("success");
    expect(statusTone("Job", "invoiced")).toBe("violet");
  });

  it("shows booking To confirm grey, Agreed teal and Cancelled red (D68, D69, D100)", () => {
    expect(STATUS.tentative.label).toBe("To confirm");
    expect(statusTone("Booking", "tentative")).toBe("muted");
    expect(STATUS.confirmed.label).toBe("Agreed");
    expect(statusTone("Booking", "confirmed")).toBe("teal");
    expect(statusTone("Booking", "cancelled")).toBe("destructive");
  });

  it("rejects a status that is not in the family", () => {
    expect(() => statusTone("Invoice", "agreed")).toThrow();
  });
});
