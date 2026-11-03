// The 38 locked prototype screens (D94), from design/app/js/screens/*.js.
// `path` is the TanStack route path. A screen with no `path` is not a page of this
// app: an email, a PDF, a modal, or the customer catalog served on the business's
// own subdomain (D47; host routing arrives with WBS 3.10).

export type ScreenArea =
  | "Auth"
  | "Onboarding"
  | "Home"
  | "Sales"
  | "Leads"
  | "Customers"
  | "Bookings"
  | "Jobs"
  | "Invoices"
  | "Payments"
  | "Catalog"
  | "Reports"
  | "Settings"
  | "Portal";

export interface Screen {
  area: ScreenArea;
  id: string;
  name: string;
  path?: string;
  // Who may open it, as written in the prototype screen map.
  who: string;
}

export const SCREENS: readonly Screen[] = [
  {
    area: "Auth",
    id: "login",
    name: "Sign in",
    path: "/login",
    who: "Owner, Staff",
  },
  {
    area: "Auth",
    id: "invite",
    name: "Accept invite",
    path: "/invite/$token",
    who: "Staff",
  },
  {
    area: "Onboarding",
    id: "new",
    name: "Create workspace",
    path: "/new",
    who: "Owner",
  },
  {
    area: "Onboarding",
    id: "brand",
    name: "Brand setup",
    path: "/new/brand",
    who: "Owner",
  },
  {
    area: "Onboarding",
    id: "details",
    name: "Business details",
    path: "/new/details",
    who: "Owner",
  },
  {
    area: "Onboarding",
    id: "catalog-starter",
    name: "Catalog starter",
    path: "/new/catalog",
    who: "Owner",
  },
  {
    area: "Onboarding",
    id: "team",
    name: "Invite team",
    path: "/new/team",
    who: "Owner",
  },
  {
    area: "Onboarding",
    id: "done",
    name: "Done",
    path: "/new/done",
    who: "Owner",
  },
  {
    area: "Home",
    id: "dashboard",
    name: "Today",
    path: "/w/$slug",
    who: "All",
  },
  {
    area: "Home",
    id: "board",
    name: "Board",
    path: "/w/$slug/pipeline",
    who: "Owner, Manager, Staff",
  },
  {
    area: "Reports",
    id: "reports",
    name: "Reports",
    path: "/w/$slug/reports",
    who: "Owner, Accountant",
  },
  {
    area: "Home",
    id: "inbox",
    name: "Notifications",
    path: "/w/$slug/inbox",
    who: "All",
  },
  {
    area: "Leads",
    id: "leads",
    name: "Leads inbox",
    path: "/w/$slug/leads",
    who: "All",
  },
  {
    area: "Leads",
    id: "lead",
    name: "Lead detail",
    path: "/w/$slug/leads/$id",
    who: "All",
  },
  {
    area: "Customers",
    id: "customers",
    name: "Customer list",
    path: "/w/$slug/customers",
    who: "All",
  },
  {
    area: "Customers",
    id: "customer",
    name: "Customer timeline",
    path: "/w/$slug/customers/$id",
    who: "All",
  },
  {
    area: "Sales",
    id: "serials",
    name: "Serial lookup",
    path: "/w/$slug/serials",
    who: "All",
  },
  {
    area: "Bookings",
    id: "bookings",
    name: "Calendar",
    path: "/w/$slug/bookings",
    who: "All",
  },
  {
    area: "Jobs",
    id: "jobs",
    name: "Job list",
    path: "/w/$slug/jobs",
    who: "Staff, Manager",
  },
  {
    area: "Jobs",
    id: "job",
    name: "Job detail",
    path: "/w/$slug/jobs/$id",
    who: "Staff, Manager",
  },
  {
    area: "Invoices",
    id: "invoices",
    name: "Invoices list",
    path: "/w/$slug/invoices",
    who: "Owner, Manager, Accountant",
  },
  {
    area: "Invoices",
    id: "invoice",
    name: "Invoice editor (doc)",
    path: "/w/$slug/invoices/$id",
    who: "All",
  },
  {
    area: "Invoices",
    id: "overdue",
    name: "Overdue payments",
    path: "/w/$slug/invoices/overdue",
    who: "Owner, Manager, Accountant",
  },
  {
    area: "Invoices",
    id: "invoice-email",
    name: "Invoice email",
    who: "Customer",
  },
  {
    area: "Invoices",
    id: "invoice-pdf",
    name: "Invoice PDF",
    who: "Customer, Accountant",
  },
  {
    area: "Payments",
    id: "record",
    name: "Record payment / upload proof",
    who: "All",
  },
  {
    area: "Payments",
    id: "approvals",
    name: "Approval queue",
    path: "/w/$slug/approvals",
    who: "Owner",
  },
  {
    area: "Payments",
    id: "approve-link",
    name: "Approve from email",
    path: "/a/$token",
    who: "Owner, Manager",
  },
  {
    area: "Catalog",
    id: "catalog",
    name: "Items list",
    path: "/w/$slug/catalog",
    who: "Owner, Manager",
  },
  {
    area: "Catalog",
    id: "item",
    name: "Item editor",
    path: "/w/$slug/catalog/$id",
    who: "Owner, Manager",
  },
  {
    area: "Catalog",
    id: "packages",
    name: "Packages",
    path: "/w/$slug/packages",
    who: "Owner, Manager",
  },
  {
    area: "Settings",
    id: "settings",
    name: "Settings",
    path: "/w/$slug/settings/$",
    who: "Owner",
  },
  { area: "Portal", id: "p-catalog", name: "Catalog", who: "Customer" },
  {
    area: "Portal",
    id: "p-request",
    name: "Request form",
    path: "/request",
    who: "Customer",
  },
  {
    area: "Portal",
    id: "p-book",
    name: "Booking picker",
    path: "/book/$package",
    who: "Customer",
  },
  {
    area: "Portal",
    id: "p-pay",
    name: "Invoice & pay page",
    path: "/i/$token",
    who: "Customer",
  },
  {
    area: "Portal",
    id: "p-orders",
    name: "My orders",
    path: "/me/$token",
    who: "Customer",
  },
  {
    area: "Portal",
    id: "p-warranty",
    name: "Warranty card",
    path: "/wc/$token",
    who: "Customer",
  },
];

export type RoutedScreen = Screen & { path: string };

export const routedScreens = (): RoutedScreen[] =>
  SCREENS.filter((s): s is RoutedScreen => Boolean(s.path));

export const screenById = (id: string): Screen | undefined =>
  SCREENS.find((s) => s.id === id);
