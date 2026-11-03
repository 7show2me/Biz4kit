import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import type { Role } from "@/lib/nav";

import { AppShell } from "../app-shell";
import type { AppShellProps } from "../app-shell";

const base: Omit<AppShellProps, "children"> = {
  workspace: { slug: "glow", name: "Test Studio" },
  user: { name: "Asha Test", email: "asha@example.test" },
  role: "owner" as Role,
  modules: { board: false, customers: true, jobs: false, serials: false },
  unreadCount: 3,
  activePage: "leads",
};

async function renderShell(
  props: Partial<Omit<AppShellProps, "children">> = {},
  children: ReactNode = <p>page body</p>
) {
  const root = createRootRoute({
    component: () => (
      <ThemeProvider attribute="class" defaultTheme="light">
        <AppShell {...base} {...props}>
          {children}
        </AppShell>
      </ThemeProvider>
    ),
  });
  const catchAll = createRoute({ getParentRoute: () => root, path: "$" });
  const router = createRouter({
    routeTree: root.addChildren([catchAll]),
    history: createMemoryHistory({ initialEntries: ["/w/glow/leads"] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  return await screen.findByText("page body");
}

describe("AppShell", () => {
  it("shows the 4B mark at the sidebar top and no Biz4Kit wordmark (D78, D79)", async () => {
    await renderShell();
    const sidebar = screen.getByRole("complementary", { name: "Sidebar" });
    expect(
      within(sidebar).getByRole("img", { name: "Biz4Kit mark" })
    ).toBeTruthy();
    expect(within(sidebar).queryByText(/^Biz4Kit$/u)).toBeNull();
  });

  it("puts the business logo and name on the profile button (D78, D79)", async () => {
    await renderShell({
      workspace: { slug: "glow", name: "Test Studio", logoUrl: "/logo.png" },
    });
    const profile = screen.getByRole("button", {
      name: "Account and workspace menu",
    });
    expect(
      within(profile).getByRole("img", { name: "Test Studio" })
    ).toBeTruthy();
    expect(within(profile).getByText("Test Studio")).toBeTruthy();
    expect(within(profile).getByText(/Asha Test/u)).toBeTruthy();
  });

  it("falls back to the business initials when there is no logo", async () => {
    await renderShell();
    const profile = screen.getByRole("button", {
      name: "Account and workspace menu",
    });
    expect(within(profile).getByText("TS")).toBeTruthy();
  });

  it("lists the five sections in order in the sidebar (D80)", async () => {
    await renderShell();
    const nav = screen.getByRole("navigation", { name: "Workspace" });
    const labels = within(nav)
      .getAllByRole("region")
      .map((g) => g.getAttribute("aria-label"));
    expect(labels.slice(0, 5)).toEqual([
      "Home",
      "Sales",
      "Schedule",
      "Payments",
      "Business",
    ]);
  });

  it("shows Settings as its own item, outside every section (D83)", async () => {
    await renderShell();
    const nav = screen.getByRole("navigation", { name: "Workspace" });
    for (const group of within(nav).getAllByRole("region")) {
      if (group.getAttribute("aria-label") !== "Settings") {
        expect(
          within(group).queryByRole("link", { name: "Settings" })
        ).toBeNull();
      }
    }
    const settings = within(nav).getByRole("link", { name: "Settings" });
    expect(settings.getAttribute("href")).toBe("/w/glow/settings");
  });

  it("hides Settings from a Manager", async () => {
    await renderShell({ role: "manager" });
    expect(screen.queryByRole("link", { name: "Settings" })).toBeNull();
  });

  it("marks the current page", async () => {
    await renderShell();
    const nav = screen.getByRole("navigation", { name: "Workspace" });
    const current = within(nav).getByRole("link", { name: /^Leads/u });
    expect(current.getAttribute("aria-current")).toBe("page");
  });

  it("opens the notification inbox from the header bell with the unread count (D87)", async () => {
    await renderShell();
    const bell = screen.getByRole("link", { name: "Inbox, 3 unread" });
    expect(bell.getAttribute("href")).toBe("/w/glow/inbox");
  });

  it("shows no unread badge when everything is read", async () => {
    await renderShell({ unreadCount: 0 });
    const bell = screen.getByRole("link", { name: "Inbox" });
    expect(within(bell).queryByText("0")).toBeNull();
  });

  it("has a five-section bottom bar for phones", async () => {
    await renderShell();
    const bar = screen.getByRole("navigation", { name: "Sections" });
    expect(within(bar).getAllByRole("link")).toHaveLength(5);
  });

  it("shows page tabs for the current section when it has two pages or more", async () => {
    await renderShell();
    const tabs = screen.getByRole("navigation", { name: "Sales pages" });
    expect(
      within(tabs)
        .getAllByRole("link")
        .map((l) => l.textContent)
    ).toEqual(["Leads", "Customers"]);
  });

  it("toggles dark and light from the profile menu", async () => {
    const user = userEvent.setup();
    await renderShell();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    await user.click(
      screen.getByRole("button", { name: "Account and workspace menu" })
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "Light or dark" })
    );
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("renders the page body in the main area", async () => {
    await renderShell();
    expect(
      within(screen.getByRole("main")).getByText("page body")
    ).toBeTruthy();
  });
});
