import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SETUP_STEPS, Today } from "../today";

describe("Today (dashboard shell)", () => {
  it("shows the four money-in cells and nothing about money out (D77)", () => {
    render(<Today memberRole="owner" />);
    const strip = screen.getByRole("region", { name: "Money in" });
    expect(
      within(strip)
        .getAllByRole("heading", { level: 2 })
        .map((h) => h.textContent)
    ).toEqual(["To collect", "Overdue", "To approve", "Collected"]);
    expect(screen.queryByText(/expense/iu)).toBeNull();
  });

  it("shows em dashes, not made-up figures, until data is connected", () => {
    render(<Today memberRole="owner" />);
    const strip = screen.getByRole("region", { name: "Money in" });
    expect(within(strip).getAllByText("—")).toHaveLength(4);
  });

  it("shows the first-run checklist with the six prototype steps to the Owner (D87)", () => {
    render(<Today memberRole="owner" />);
    const list = screen.getByRole("region", { name: "Get set up" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(6);
    expect(SETUP_STEPS.map((s) => s.label)).toEqual([
      "Business details",
      "Brand",
      "Catalog",
      "Team",
      "Share your price list",
      "First reply",
    ]);
  });

  it("hides the checklist from other roles", () => {
    render(<Today memberRole="staff" />);
    expect(screen.queryByRole("region", { name: "Get set up" })).toBeNull();
  });

  it("hides money from Staff", () => {
    render(<Today memberRole="staff" />);
    expect(screen.queryByRole("region", { name: "Money in" })).toBeNull();
  });
});
