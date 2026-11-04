// Status words, icons and colours (D26, D51, D55, D100). A pill always shows a word
// and an icon, never colour alone. No two statuses of one record share a colour.

export type Tone =
  | "muted"
  | "success"
  | "warning"
  | "info"
  | "violet"
  | "teal"
  | "destructive";

export interface Status {
  // Lucide icon name, resolved in components/status-pill.tsx.
  icon: string;
  label: string;
  tone: Tone;
}

export const STATUS = {
  paid: { icon: "circle-check", label: "Paid", tone: "success" },
  due: { icon: "clock", label: "Due", tone: "warning" },
  part_paid: { icon: "circle-dot", label: "Part paid", tone: "teal" },
  overdue: { icon: "circle-alert", label: "Overdue", tone: "destructive" },
  awaiting: { icon: "send", label: "Awaiting payment", tone: "info" },
  expired: { icon: "calendar-x", label: "Expired", tone: "muted" },
  draft: { icon: "file", label: "Draft", tone: "muted" },
  pending: { icon: "hourglass", label: "Waiting for approval", tone: "violet" },
  approved: { icon: "circle-check", label: "Approved", tone: "success" },
  new: { icon: "sparkles", label: "New", tone: "info" },
  contacted: { icon: "phone", label: "Contacted", tone: "muted" },
  snoozed: { icon: "alarm-clock", label: "Snoozed", tone: "warning" },
  open: { icon: "circle", label: "Open", tone: "muted" },
  in_progress: { icon: "loader", label: "In progress", tone: "info" },
  done: { icon: "circle-check", label: "Done", tone: "success" },
  invoiced: { icon: "receipt", label: "Invoiced", tone: "violet" },
  replied: { icon: "send", label: "Replied", tone: "violet" },
  rejected: { icon: "circle-x", label: "Rejected", tone: "destructive" },
  // Booking words (D68, D69): To confirm is grey, Agreed is teal.
  confirmed: { icon: "calendar-check", label: "Agreed", tone: "teal" },
  tentative: { icon: "calendar-clock", label: "To confirm", tone: "muted" },
  completed: { icon: "circle-check", label: "Completed", tone: "success" },
  cancelled: { icon: "circle-x", label: "Cancelled", tone: "muted" },
  // A cancelled booking is red, because grey is To confirm (D100).
  booking_cancelled: {
    icon: "circle-x",
    label: "Cancelled",
    tone: "destructive",
  },
  no_show: { icon: "user-x", label: "No-show", tone: "warning" },
  invited: { icon: "mail", label: "Invited", tone: "warning" },
  active: { icon: "circle-check", label: "Active", tone: "success" },
  // Serial numbers and warranty (D85).
  no_serial: {
    icon: "scan-barcode",
    label: "Serials missing",
    tone: "warning",
  },
  covered: { icon: "shield-check", label: "In cover", tone: "success" },
  ended: { icon: "shield-off", label: "Cover ended", tone: "muted" },
} as const satisfies Record<string, Status>;

export type StatusKey = keyof typeof STATUS;

// The statuses of one record. The colours in each list are unique (D55).
export const FAMILIES = {
  Reply: ["awaiting", "pending", "paid", "expired"],
  Invoice: ["draft", "due", "part_paid", "overdue", "paid", "pending"],
  Lead: ["new", "contacted", "replied", "snoozed", "rejected", "paid"],
  Job: ["open", "in_progress", "done", "invoiced"],
  Booking: [
    "tentative",
    "confirmed",
    "in_progress",
    "completed",
    "booking_cancelled",
    "no_show",
  ],
  Payment: ["pending", "approved", "rejected"],
  Member: ["invited", "active"],
  Serial: ["no_serial", "covered", "ended"],
} as const satisfies Record<string, readonly StatusKey[]>;

export type Family = keyof typeof FAMILIES;

// The stored value differs from the status key in one place: a booking stores
// "cancelled", and shows the red status.
const ALIASES: Partial<Record<Family, Record<string, StatusKey>>> = {
  Booking: { cancelled: "booking_cancelled" },
};

export function statusKey(family: Family, value: string): StatusKey {
  const key = ALIASES[family]?.[value] ?? value;
  if (!(FAMILIES[family] as readonly string[]).includes(key)) {
    throw new Error(`"${value}" is not a ${family} status`);
  }
  return key as StatusKey;
}

export const statusOf = (family: Family, value: string): Status =>
  STATUS[statusKey(family, value)];

export const statusTone = (family: Family, value: string): Tone =>
  statusOf(family, value).tone;
