import { screenById } from "./screens";

// Workspace navigation from design/app/js/ui/shell.js: sections Home, Sales,
// Schedule, Payments, Business (D80); Settings is its own item (D83); Board,
// Customers, Jobs and Serials are extras, off in Lite mode (D63, D85).

export type Role = "owner" | "manager" | "staff" | "accountant" | "superadmin";

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
  accountant: "Accountant",
  superadmin: "Biz4Kit support",
};

export interface Modules {
  board: boolean;
  customers: boolean;
  jobs: boolean;
  serials: boolean;
}

// Lite mode: catalog, reply, invoice and payment only.
export const DEFAULT_MODULES: Modules = {
  board: false,
  customers: false,
  jobs: false,
  serials: false,
};

export interface NavPage {
  icon: string;
  id: string;
  label: string;
  module?: keyof Modules;
  // Who may open it, from the screen map.
  who: string;
}

export interface NavSection {
  icon: string;
  label: string;
  pages: readonly NavPage[];
}

const page = (
  id: string,
  label: string,
  icon: string,
  module?: keyof Modules
): NavPage => {
  const screen = screenById(id);
  if (!screen) {
    throw new Error(`Nav page "${id}" is not a screen`);
  }
  return { icon, id, label, module, who: screen.who };
};

export const SECTIONS: readonly NavSection[] = [
  {
    icon: "house",
    label: "Home",
    pages: [
      page("dashboard", "Today", "sun"),
      page("board", "Board", "kanban", "board"),
      page("reports", "Reports", "chart-column"),
    ],
  },
  {
    icon: "handshake",
    label: "Sales",
    pages: [
      page("leads", "Leads", "inbox"),
      page("customers", "Customers", "users", "customers"),
      page("serials", "Serials", "scan-barcode", "serials"),
    ],
  },
  {
    icon: "calendar-days",
    label: "Schedule",
    pages: [
      page("bookings", "Bookings", "calendar-check"),
      page("jobs", "Jobs", "wrench", "jobs"),
    ],
  },
  {
    icon: "indian-rupee",
    label: "Payments",
    pages: [
      page("invoices", "Invoices", "receipt"),
      page("overdue", "Overdue", "circle-alert"),
      page("approvals", "Approvals", "badge-check"),
    ],
  },
  {
    icon: "store",
    label: "Business",
    pages: [
      page("catalog", "Catalog", "book-open"),
      page("packages", "Packages", "package"),
    ],
  },
];

export const SETTINGS_ITEM: NavPage = page("settings", "Settings", "settings");

export type FavouriteTone = "teal" | "info" | "violet";

// Quick jobs (D77), one status hue each (D83).
export const FAVOURITES: readonly {
  icon: string;
  label: string;
  page: string;
  tone: FavouriteTone;
}[] = [
  { icon: "book-open", label: "Catalog", page: "catalog", tone: "teal" },
  { icon: "receipt", label: "Create invoice", page: "invoices", tone: "info" },
  { icon: "send", label: "Send reply", page: "leads", tone: "violet" },
];

export interface NavContext {
  // Owner has delegated payment approval to Managers (D57).
  managerApprovals?: boolean;
  modules: Modules;
  role: Role;
}

export function canOpen(
  role: Role,
  who: string,
  { id, managerApprovals }: { id?: string; managerApprovals?: boolean } = {}
): boolean {
  if (role === "owner" || role === "superadmin") {
    return true;
  }
  const allowed = new Set(who.split(",").map((w) => w.trim()));
  return (
    allowed.has("All") ||
    allowed.has(ROLE_LABEL[role]) ||
    (role === "manager" && id === "approvals" && managerApprovals === true)
  );
}

const isVisible = (p: NavPage, ctx: NavContext) =>
  (!p.module || ctx.modules[p.module]) &&
  canOpen(ctx.role, p.who, {
    id: p.id,
    managerApprovals: ctx.managerApprovals,
  });

export const visibleSections = (ctx: NavContext): NavSection[] =>
  SECTIONS.map((s) => ({
    ...s,
    pages: s.pages.filter((p) => isVisible(p, ctx)),
  })).filter((s) => s.pages.length > 0);

export const canOpenSettings = (role: Role) =>
  canOpen(role, SETTINGS_ITEM.who, { id: "settings" });

export const sectionOf = (pageId: string): NavSection | undefined =>
  SECTIONS.find((s) => s.pages.some((p) => p.id === pageId));

// The workspace URL of a page, for example workspaceHref("glow", "leads").
export function workspaceHref(slug: string, pageId: string): string {
  const screen = screenById(pageId);
  if (!screen?.path?.startsWith("/w/$slug")) {
    throw new Error(`"${pageId}" has no workspace URL`);
  }
  return screen.path
    .replace("$slug", slug)
    .replace(/\/\$$/u, "")
    .replace(/\/\$id$/u, "");
}

// Favourites need a page this role may open, and write access: the Accountant has none (D91).
export const visibleFavourites = (ctx: NavContext) =>
  FAVOURITES.filter((f) => {
    const target = SECTIONS.flatMap((s) => s.pages).find(
      (p) => p.id === f.page
    );
    return (
      Boolean(target) &&
      ctx.role !== "accountant" &&
      canOpen(ctx.role, target?.who ?? "", {
        id: f.page,
        managerApprovals: ctx.managerApprovals,
      })
    );
  });
