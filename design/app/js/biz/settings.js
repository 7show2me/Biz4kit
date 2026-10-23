/* Settings tabs: Brand, Business, Numbering, Team, Roles, Messages, Devices (D81). Owner only. */
import { byId, fail, initials, nextId } from "../core/util.js";
import { need, ROLES } from "./perms.js";

const clean = (v) => String(v ?? "").trim();
const HEX = /^#[0-9a-f]{6}$/i;

export function saveBusiness(s, a, ctx) {
  need(ctx, "settings");
  const ws = s.workspace;
  for (const k of [
    "name",
    "address",
    "city",
    "pin",
    "state",
    "phone",
    "email",
    "gstin",
    "upi",
    "terms",
  ])
    if (a[k] !== undefined) ws[k] = clean(a[k]);
  if (!ws.name) fail("The business needs a name.");
  if (ws.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(ws.gstin))
    fail(
      "That GSTIN does not look right (15 characters, e.g. 27AAKFG4821M1Z3)."
    );
  if (ws.gstin) ws.stateCode = ws.gstin.slice(0, 2);
  for (const k of ["name", "account", "ifsc"])
    if (a[`bank_${k}`] !== undefined) ws.bank[k] = clean(a[`bank_${k}`]);
  if (a.replyValidDays !== undefined)
    ws.replyValidDays = Math.max(1, +a.replyValidDays || 15);
  if (a.billDueDays !== undefined)
    ws.billDueDays = Math.max(0, +a.billDueDays || 0);
  return { text: "Business details saved" };
}

export function saveBrand(s, a, ctx) {
  need(ctx, "settings");
  const b = s.workspace.brand;
  for (const k of ["primary", "accent"]) {
    if (a[k] === undefined) continue;
    if (!HEX.test(a[k])) fail("Colours are hex values like #9f1239.");
    b[k] = a[k];
  }
  if (a.logo !== undefined) b.logo = a.logo || null;
  return { text: "Brand saved" };
}

/* Prefixes may change; the next number may not go down, so numbers stay gap-free and never reused (D71). */
export function saveNumbering(s, a, ctx) {
  need(ctx, "settings");
  for (const series of ["PI", "INV"]) {
    const n = s.workspace.numbering[series];
    const prefix = clean(a[`${series}_prefix`] ?? n.prefix).toUpperCase();
    if (!/^[A-Z]{1,6}$/.test(prefix)) fail("A prefix is 1 to 6 letters.");
    if (
      series === "INV" &&
      prefix ===
        clean(a.PI_prefix ?? s.workspace.numbering.PI.prefix).toUpperCase()
    )
      fail(
        "Proforma and tax invoice prefixes must differ (separate series, D60)."
      );
    n.prefix = prefix;
    const next = a[`${series}_next`];
    if (next !== undefined && next !== "") {
      if (+next < n.next)
        fail(
          `The next ${series} number cannot go below ${n.next}: numbers are gap-free and never reused.`
        );
      n.next = +next;
    }
  }
  return { text: "Numbering saved" };
}

export function saveApprovals(s, a, ctx) {
  need(ctx, "settings");
  const ap = s.workspace.approvals;
  if (a.managerEnabled !== undefined)
    ap.managerEnabled =
      a.managerEnabled === true ||
      a.managerEnabled === "on" ||
      a.managerEnabled === "true";
  if (a.managerLimit !== undefined) {
    const n = Math.round(+a.managerLimit);
    if (!(n > 0)) fail("Enter the Manager limit in rupees.");
    ap.managerLimit = n;
  }
  return {
    text: `Manager approvals ${ap.managerEnabled ? `on, below ₹${ap.managerLimit}` : "off"}`,
  };
}

export function saveModules(s, a, ctx) {
  need(ctx, "settings");
  for (const k of ["board", "customers", "jobs", "serials"])
    if (a[k] !== undefined)
      s.workspace.modules[k] =
        a[k] === true || a[k] === "on" || a[k] === "true";
  return { text: "Extras updated" };
}

/* First-run checklist on Today (prep Design inputs Flow 1 step 7, WBS 3.9, D87). Steps are derived from the
   data; the card stays until the first reply is shared or the Owner dismisses it. */
export const SETUP_STEPS = [
  ["details", "Business details", "Phone, address and UPI or bank for payments"],
  ["brand", "Brand", "Logo or colours for your pages and invoices"],
  ["catalog", "Catalog", "At least 3 items"],
  ["team", "Team", "Invite someone (optional)"],
  ["share", "Share your price list", "Send the catalog link (ready message 1)"],
  ["reply", "First reply", "Price a request and share it"],
];
export function setupSteps(s) {
  const ws = s.workspace;
  const owner = s.members.find((m) => m.role === "owner");
  const done = {
    details: Boolean(
      ws.address && ws.phone && (ws.upi || (ws.bank && ws.bank.account))
    ),
    brand: Boolean(ws.brand && (ws.brand.logo || ws.brand.primary)),
    catalog: s.items.length >= 3,
    team: s.members.some((m) => m.id !== owner?.id),
    share: s.outbox.some((m) => m.templateId === 1),
    reply: s.invoices.some((i) => i.sharedAt),
  };
  const steps = SETUP_STEPS.map(([key, label, sub]) => ({
    key,
    label,
    sub,
    done: done[key],
  }));
  return {
    steps,
    count: steps.filter((x) => x.done).length,
    /* stays until a first reply is shared (Design inputs Flow 1 step 7) */
    show: !ws.setupDismissed && !done.reply,
  };
}
export function dismissSetup(s, _a, ctx) {
  need(ctx, "settings");
  s.workspace.setupDismissed = true;
  return { text: "Setup checklist hidden" };
}

export function invite(s, { email, role = "staff", name = "" }, ctx) {
  need(ctx, "settings");
  const e = clean(email).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) fail("Enter an email address.");
  if (!ROLES[role] || role === "superadmin" || role === "owner")
    fail("Pick Manager, Staff or Accountant.");
  if (s.members.some((m) => m.email.toLowerCase() === e))
    fail("That person is already in the team.");
  const nm = clean(name) || e.split("@")[0];
  const m = {
    id: nextId(s, "M"),
    name: nm,
    email: e,
    phone: "",
    role,
    status: "invited",
    initials: initials(nm),
  };
  s.members.push(m);
  return { recordId: m.id, text: `Invited ${e} as ${ROLES[role]}` };
}

export function setRole(s, { id, role }, ctx) {
  need(ctx, "settings");
  const m = byId(s.members, id) || fail("Member not found.");
  if (!ROLES[role] || role === "superadmin") fail("Pick a role.");
  if (
    m.role === "owner" &&
    role !== "owner" &&
    s.members.filter((x) => x.role === "owner" && x.status === "active")
      .length < 2
  )
    fail("A workspace needs at least one Owner.");
  m.role = role;
  return { recordId: id, text: `${m.name} is now ${ROLES[role]}` };
}

export function removeMember(s, { id }, ctx) {
  need(ctx, "settings");
  const m = byId(s.members, id) || fail("Member not found.");
  if (m.role === "owner")
    fail("The Owner cannot be removed. Transfer ownership first.");
  if (m.id === ctx.memberId) fail("You cannot remove yourself.");
  s.members = s.members.filter((x) => x.id !== id);
  for (const l of s.leads) if (l.assigneeId === id) l.assigneeId = null;
  s.devices = s.devices.filter((d) => d.memberId !== id);
  return { recordId: id, text: `${m.name} removed` };
}

export function acceptInvite(s, { id }, ctx) {
  const m = byId(s.members, id) || fail("Invite not found.");
  if (m.status !== "invited") fail("This invite was already used.");
  m.status = "active";
  return { recordId: id, text: `${m.name} joined as ${ROLES[m.role]}` };
}

export function saveTemplate(s, { id, subject, body }, ctx) {
  need(ctx, "settings");
  const t = s.templates.find((x) => x.id === +id) || fail("Message not found.");
  if (!clean(body)) fail("A message needs some text.");
  if (subject !== undefined) t.subject = clean(subject) || null;
  t.body = String(body);
  return { text: `Message ${t.id} saved: ${t.name}` };
}

export function revokeDevice(s, { id }, ctx) {
  need(ctx, "settings");
  const d = byId(s.devices, id) || fail("Device not found.");
  if (d.current) fail("This is the device you are using. Sign out instead.");
  s.devices = s.devices.filter((x) => x.id !== id);
  return { recordId: id, text: `Signed out ${d.name}` };
}

/* ---------- Opening hours (D97, D99) ---------- */
/* workspace.hours = { mon: [["09:00", "13:00"], ["16:00", "20:00"]], tue: [], ... }: up to two ranges per weekday;
   no range = closed. A new workspace has none: closed until the business sets them (D97). */
export const DAYS = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
];
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const mins = (t) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
const hm = (m) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/* args.hours[day] = { open, ranges: [{ from, to }, { from, to }] } as the Settings form sends it. */
export function saveHours(s, { hours = {} }, ctx) {
  need(ctx, "settings");
  const out = {};
  for (const [d, name] of DAYS) {
    const h = hours[d] || {};
    const open = h.open === true || h.open === "on" || h.open === "true";
    const ranges = open
      ? (h.ranges || [])
          .map((r) => [clean(r?.from), clean(r?.to)])
          .filter(([a, b]) => a || b)
      : [];
    if (ranges.length > 2) fail(`${name}: at most two time ranges (D99).`);
    for (const [a, b] of ranges) {
      if (!HM.test(a) || !HM.test(b))
        fail(`${name}: enter times like 09:30.`);
      if (mins(a) >= mins(b)) fail(`${name}: a range must end after it starts.`);
    }
    if (ranges.length === 2 && mins(ranges[1][0]) < mins(ranges[0][1]))
      fail(`${name}: the second range starts after the first one ends.`);
    if (open && !ranges.length) fail(`${name}: add a time range or switch the day off.`);
    out[d] = ranges;
  }
  s.workspace.hours = out;
  const days = DAYS.filter(([d]) => out[d].length).length;
  return { text: `Opening hours saved: open ${days} day${days === 1 ? "" : "s"} a week` };
}

/* Booking slots for a date: every 30 minutes, and the package must end inside the range (D99). */
export function slotsFor(s, isoDate, minutes = 60) {
  const d = new Date(`${String(isoDate).slice(0, 10)}T00:00:00`);
  const key = DAYS[(d.getDay() + 6) % 7][0];
  const ranges = s.workspace.hours?.[key] || [];
  const out = [];
  for (const [a, b] of ranges)
    for (let m = mins(a); m + (+minutes || 60) <= mins(b); m += 30) out.push(hm(m));
  return out;
}
