/* SCHEDULE: Calendar (bookings), Job list and Job detail (with the Staff "My day" state).
   Bookings: To confirm (tentative) → Agreed (confirmed) → In progress → Completed, or Cancelled / No-show
   (D68, D69). Started bookings open their Job; a Job done gets its bill, or the balance after an advance (D70).
   Drag: booking blocks on tablet / web are HTML5-draggable onto any free half-hour cell (another time and / or
   another staff column); the drop runs bookings.move, so a clash shows the BizError. The Move form in the
   booking dialog does the same on every device. */
import {
  byId,
  addDays,
  daysBetween,
  esc,
  fmtDate,
  fail,
} from "../core/util.js";
import { call } from "../ui/actions.js";
import {
  I,
  C,
  M,
  av,
  link,
  modal,
  pill,
  page,
  toolbar,
  seg,
  select,
  input,
  radios,
  search,
  empty,
  dataTable,
  shareBody,
  flabel,
  hint, bookingPill
} from "../ui/kit.js";
import { app } from "../ui/shell.js";

/* ---------- helpers ---------- */
const day = (x) => String(x || "").slice(0, 10);
const hm = (x) => (String(x || "").length > 10 ? String(x).slice(11, 16) : "");
const mins = (x) => {
  const t = hm(x);
  return t ? +t.slice(0, 2) * 60 + +t.slice(3, 5) : null;
};
const lenOf = (b) =>
  b.end && hm(b.end) && hm(b.start)
    ? Math.max(30, mins(b.end) - mins(b.start))
    : 60;
const first = (n = "") => String(n).split(" ")[0];
const ROLE_ORDER = { staff: 0, manager: 1, owner: 2 };
/* People who take bookings: active members except the Accountant. */
const bookable = (s) =>
  s.members
    .filter((m) => m.status === "active" && m.role !== "accountant")
    .sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));
const pkgName = (p) => (p ? `${p.name}${p.tier ? ` · ${p.tier}` : ""}` : "");
const serviceOf = (s, b) => {
  const p = byId(s.packages, b.packageId);
  if (p) return pkgName(p);
  const j = s.jobs.find((x) => x.bookingId === b.id);
  if (j) return j.title;
  const l = b.leadId ? byId(s.leads, b.leadId) : null;
  return l?.lines?.[0]?.name || l?.brief || "Booking";
};
const when = (ctx, stamp, end) => {
  if (!stamp) return "";
  const d = day(stamp);
  const label = d === ctx.today ? "Today" : fmtDate(d);
  const t = hm(stamp);
  return `${label}${t ? ` ${t}${end && hm(end) ? `–${hm(end)}` : ""}` : ""}`;
};
const mondayOf = (d) => {
  const dow = new Date(`${d}T00:00:00`).getDay();
  return addDays(d, -((dow + 6) % 7));
};
const HIDDEN = ["cancelled", "no_show"];
const TONE = {
  tentative:
    "border border-dashed border-muted-foreground bg-muted text-muted-foreground",
  confirmed: "bg-secondary text-secondary-foreground",
  in_progress: "bg-info-soft text-info",
  completed: "bg-success-soft text-success",
};
const who = (m) =>
  m
    ? `<span class="flex items-center gap-2">${av(m.initials)}${esc(first(m.name))}</span>`
    : `<span class="text-muted-foreground">Not assigned</span>`;
const canWrite = (ctx) => ctx.biz.perms.can(ctx.role, "write");

/* ---------- calendar drag (HTML5): drop on a [data-slot] cell clicks the hidden move trigger ---------- */
let dragId = null;
if (typeof window !== "undefined" && !window.__b4kCalDrag) {
  window.__b4kCalDrag = true;
  document.addEventListener("dragstart", (e) => {
    const b = e.target.closest?.("[data-bk-drag]");
    if (!b) return;
    dragId = b.dataset.bkDrag;
    e.dataTransfer.setData("text/plain", dragId);
    e.dataTransfer.effectAllowed = "move";
  });
  document.addEventListener("dragend", () => {
    dragId = null;
    for (const c of document.querySelectorAll("[data-slot].bg-accent"))
      c.classList.remove("bg-accent");
  });
  document.addEventListener("dragover", (e) => {
    const c = dragId && e.target.closest?.("[data-slot]");
    if (!c) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    for (const x of document.querySelectorAll("[data-slot].bg-accent"))
      if (x !== c) x.classList.remove("bg-accent");
    c.classList.add("bg-accent");
  });
  document.addEventListener("drop", (e) => {
    const c = dragId && e.target.closest?.("[data-slot]");
    if (!c) return;
    e.preventDefault();
    const btn = c.closest("[data-cal]")?.querySelector("[data-cal-move]");
    if (!btn) return;
    btn.dataset.aId = dragId;
    btn.dataset.aStart = c.dataset.slot;
    if (c.dataset.slotMember) btn.dataset.aMemberId = c.dataset.slotMember;
    else delete btn.dataset.aMemberId;
    dragId = null;
    btn.click();
  });
}

/* ---------- calendar pieces ---------- */
function block(ctx, b, col, H0, rows) {
  const s = ctx.s;
  const c = byId(s.customers, b.customerId);
  const start = mins(b.start) ?? H0 * 60;
  const row = Math.max(
    0,
    Math.min(rows - 1, Math.floor((start - H0 * 60) / 30))
  );
  const span = Math.max(1, Math.min(rows - row, Math.ceil(lenOf(b) / 30)));
  const drag = canWrite(ctx) && ["tentative", "confirmed"].includes(b.status);
  return `<button type="button" data-bk="${b.id}" data-open="bk" data-open-args="${esc(JSON.stringify({ bk: b.id }))}" ${drag ? `draggable="true" data-bk-drag="${b.id}" title="Drag to another time or staff column"` : ""} class="m-0.5 rounded-xs px-2 py-1 text-caption text-left overflow-hidden flex flex-col items-stretch justify-start min-w-0 ${drag ? "cursor-grab" : ""} ${TONE[b.status] || TONE.confirmed}" style="grid-column:${col};grid-row:${row + 2} / span ${span}"><div class="font-semibold truncate">${esc(c?.name || "Customer")}</div><div class="truncate">${esc(serviceOf(s, b))}${b.status === "tentative" ? " · To confirm" : ""}</div></button>`;
}

/* cols: [{ key, head, date, memberId }]; list: bookings shown */
function grid(ctx, cols, list) {
  const starts = list.map((b) => mins(b.start)).filter((x) => x != null);
  const ends = list.map((b) => (mins(b.start) ?? 0) + lenOf(b));
  const H0 = Math.min(10, ...starts.map((m) => Math.floor(m / 60)));
  const H1 = Math.max(19, ...ends.map((m) => Math.ceil(m / 60)));
  const rows = (H1 - H0) * 2;
  const p2 = (n) => String(n).padStart(2, "0");
  const slotTime = (i) =>
    `${p2(H0 + Math.floor(i / 2))}:${i % 2 ? "30" : "00"}`;
  const head = cols
    .map(
      (c) =>
        `<div class="flex items-center gap-2 px-3 bg-muted border-l border-b border-border font-medium truncate ${c.today ? "text-foreground" : ""}">${c.head}</div>`
    )
    .join("");
  const cells = Array.from(
    { length: rows },
    (_, i) =>
      `<div class="code text-muted-foreground pr-2 pt-0.5 text-right ${i % 2 ? "" : "border-t border-border"}" style="grid-row:${i + 2};grid-column:1">${i % 2 ? "" : `${H0 + i / 2}:00`}</div>${cols
        .map(
          (c, k) =>
            `<div class="border-l border-border ${i % 2 ? "" : "border-t"}" style="grid-row:${i + 2};grid-column:${k + 2}" data-slot="${c.date}T${slotTime(i)}" ${c.memberId ? `data-slot-member="${c.memberId}"` : ""}></div>`
        )
        .join("")}`
  ).join("");
  const blocks = list
    .map((b) => {
      const k = cols.findIndex((c) => c.match(b));
      return k < 0 ? "" : block(ctx, b, k + 2, H0, rows);
    })
    .join("");
  return `<div class="hidden @tab:block card overflow-x-auto" data-cal><div class="cal-grid" style="grid-template-columns:56px repeat(${cols.length}, minmax(140px, 1fr));grid-template-rows:var(--size-row-sm) repeat(${rows}, var(--size-control-sm))">
      <div class="bg-muted border-b border-border"></div>${head}${cells}${blocks}
    </div><button type="button" hidden data-do="bookings.move" data-cal-move>Move booking</button></div>`;
}

function agenda(ctx, list, byDay) {
  const s = ctx.s;
  const row = (b) => {
    const c = byId(s.customers, b.customerId);
    const m = byId(s.members, b.memberId);
    return `<button type="button" data-open="bk" data-open-args="${esc(JSON.stringify({ bk: b.id }))}" class="w-full text-left flex items-center gap-3 px-4 py-2.5 min-h-touch hover:bg-muted">${C(hm(b.start) || "—")}<span class="w-1 self-stretch rounded-xs ${b.status === "tentative" ? "bg-muted-foreground" : "bg-chart-1"}"></span><div class="min-w-0 flex-1"><div class="font-medium truncate">${esc(c?.name || "Customer")}</div><div class="text-caption text-muted-foreground truncate">${esc(serviceOf(s, b))} · ${esc(m ? first(m.name) : "Not assigned")}</div></div>${bookingPill(b.status)}</button>`;
  };
  if (!list.length)
    return `<div class="@tab:hidden card">${empty("calendar", "No bookings", "Nothing booked for this day.")}</div>`;
  const sorted = [...list].sort((a, b) =>
    String(a.start).localeCompare(String(b.start))
  );
  if (!byDay)
    return `<div class="@tab:hidden card overflow-hidden divide-y divide-border">${sorted.map(row).join("")}</div>`;
  const days = [...new Set(sorted.map((b) => day(b.start)))];
  return `<div class="@tab:hidden card overflow-hidden divide-y divide-border">${days
    .map(
      (d) =>
        `<p class="label px-4 py-2 bg-muted">${d === ctx.today ? "Today · " : ""}${fmtDate(d)}</p>${sorted
          .filter((b) => day(b.start) === d)
          .map(row)
          .join("")}`
    )
    .join("")}</div>`;
}

/* Message 10 preview for Confirm (D67: email sent, SMS / WhatsApp copied). */
function confirmMsg(ctx, b, key) {
  const s = ctx.s;
  const ms = ctx.biz.messages;
  const ch = ["email", "sms", "whatsapp"].includes(ctx.ui[key])
    ? ctx.ui[key]
    : "email";
  const t = ms.template(s, ms.T.bookingConfirmed);
  const vars = ms.varsFor(s, {
    booking: b,
    extra: { service: byId(s.packages, b.packageId)?.name || "your booking" },
  });
  return {
    to: ms.addressOf(byId(s.customers, b.customerId), ch),
    subject: ms.fill(t.subject, vars),
    body: ms.fill(t.body, vars),
    from: s.workspace.name,
    replyTo: s.members.find((m) => m.role === "owner")?.email || "",
  };
}

function bookingDialog(ctx, b) {
  const s = ctx.s;
  if (!b)
    return modal(
      "bk",
      "Booking",
      `<p class="mt-2 text-muted-foreground">No booking selected.</p>`
    );
  const c = byId(s.customers, b.customerId);
  const m = byId(s.members, b.memberId);
  const job = s.jobs.find((j) => j.bookingId === b.id);
  const upcoming = ["tentative", "confirmed"].includes(b.status);
  const staffOpts = bookable(s).map((x) => [x.id, x.name]);
  const details = `<div class="mt-2 flex flex-wrap items-center gap-2">${bookingPill(b.status)}${b.leadId ? `<a ${link("lead", { id: b.leadId })} class="chip">${I("inbox", "size-icon-sm")}Lead</a>` : ""}</div>
    <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
      <dt class="text-muted-foreground">Customer</dt><dd class="font-medium">${esc(c?.name || "—")}${c?.phone ? ` · <span class="money">${esc(c.phone)}</span>` : ""}</dd>
      <dt class="text-muted-foreground">Service</dt><dd>${esc(serviceOf(s, b))}</dd>
      <dt class="text-muted-foreground">When</dt><dd>${esc(when(ctx, b.start, b.end))}</dd>
      <dt class="text-muted-foreground">Staff</dt><dd>${esc(m?.name || "Not assigned")}</dd>
      ${b.notes ? `<dt class="text-muted-foreground">Notes</dt><dd>${esc(b.notes)}</dd>` : ""}
    </dl>`;
  const confirm =
    b.status === "tentative"
      ? `<form class="mt-4 pt-3 border-t border-border" data-do="bookings.confirm" data-a-id="${b.id}"><p class="font-medium">Confirm with the customer</p>${b.memberId ? "" : hint('<span class="text-warning font-medium">Assign a staff member first (Move below).</span>')}${shareBody(ctx, "bk:ch", confirmMsg(ctx, b, "bk:ch"))}<div class="mt-3 flex justify-end"><button type="submit" class="btn btn-primary" data-need="write">${I("calendar-check")}Confirm booking</button></div></form>`
      : "";
  const move = upcoming
    ? `<form class="mt-4 pt-3 border-t border-border" data-do="moveBooking" data-a-id="${b.id}"><p class="font-medium">Move</p>
      <div class="mt-2 grid grid-cols-2 @tab:grid-cols-3 gap-2">
        <div>${flabel("Date", true, "mv-date")}${input("date", { id: "mv-date", type: "date", value: day(b.start), req: true })}</div>
        <div>${flabel("Time", true, "mv-time")}${input("time", { id: "mv-time", type: "time", value: hm(b.start) || "10:00", step: 1800, req: true })}</div>
        <div class="col-span-2 @tab:col-span-1">${flabel("Staff", false, "mv-staff")}${select("memberId", [["", "Keep as is"], ...staffOpts], b.memberId || "", { id: "mv-staff" })}</div>
      </div><div class="mt-3 flex justify-end"><button type="submit" class="btn btn-outline" data-need="write">${I("clock")}Move booking</button></div></form>`
    : "";
  const acts = `<div class="mt-4 pt-3 border-t border-border flex flex-wrap gap-2 justify-end">
      ${upcoming ? `<button type="button" class="btn btn-ghost" data-need="write" data-do="bookings.setStatus" data-a-id="${b.id}" data-a-status="no_show">${I("user-x")}No-show</button><button type="button" class="btn btn-ghost text-destructive" data-need="write" data-do="bookings.setStatus" data-a-id="${b.id}" data-a-status="cancelled">${I("circle-x")}Cancel booking</button>` : ""}
      ${b.status === "confirmed" && (!job || job.status === "open") ? `<button type="button" class="btn btn-primary" data-need="write" data-do="startBooking" data-a-id="${b.id}">${I("play")}Start job</button>` : ""}
      ${job && b.status !== "confirmed" ? `<a ${link("job", { id: job.id })} class="btn btn-outline">${I("wrench")}Open job</a>` : ""}
    </div>`;
  return modal(
    "bk",
    esc(c?.name || "Booking"),
    details + confirm + move + acts
  );
}

function newBookingDialog(ctx, date) {
  const s = ctx.s;
  const d = ctx.ui.nb || {};
  const mode = d.cmode || "existing";
  const q = String(ctx.ui["nb:q"] || "").toLowerCase();
  const custs = s.customers.filter(
    (c) =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      String(c.phone || "")
        .replace(/\s+/g, "")
        .includes(q.replace(/\s+/g, ""))
  );
  const pkgs = s.packages.filter((p) => p.active && p.bookable);
  const pkg = byId(s.packages, d.packageId);
  const minutes =
    d.packageId !== d._pkg || !d.minutes
      ? pkg?.durationMin || +d.minutes || 60
      : +d.minutes;
  const memberDef = d.memberId ?? (ctx.role === "staff" ? ctx.memberId : "");
  const bDate = d.date || date;
  const bTime = d.time || "10:00";
  let clashText = "";
  if (memberDef && bDate && bTime) {
    const start = `${bDate}T${bTime}`;
    const e = new Date(`${start}:00`);
    e.setMinutes(e.getMinutes() + minutes);
    const p2 = (n) => String(n).padStart(2, "0");
    const end = `${e.getFullYear()}-${p2(e.getMonth() + 1)}-${p2(e.getDate())}T${p2(e.getHours())}:${p2(e.getMinutes())}`;
    const x = ctx.biz.bookings.clash(s, { memberId: memberDef, start, end });
    if (x)
      clashText = `<p class="mt-2 flex items-center gap-1.5 text-caption font-medium text-destructive" data-clash>${I("triangle-alert", "size-icon-sm")}Clash with ${esc(byId(s.customers, x.customerId)?.name || "another booking")} (${hm(x.start)}–${hm(x.end)})</p>`;
  }
  const lenOpts = [30, 60, 90, 120, 180, 240, 300].includes(minutes)
    ? [30, 60, 90, 120, 180, 240, 300]
    : [minutes, 30, 60, 90, 120, 180, 240, 300];
  const body = `<form class="mt-2 space-y-3" data-draft="nb" data-do="newBooking">
    <input type="hidden" name="_pkg" value="${esc(d.packageId || "")}" />
    ${radios(
      "cmode",
      [
        ["existing", "Existing customer"],
        ["new", "New customer"],
      ],
      mode,
      { label: "Customer" }
    )}
    ${
      mode === "new"
        ? `<div class="grid grid-cols-2 gap-2"><div>${flabel("Name", true, "nb-name")}${input("name", { id: "nb-name", value: d.name || "", req: true })}</div><div>${flabel("Mobile", true, "nb-phone")}${input("phone", { id: "nb-phone", type: "tel", value: d.phone || "", placeholder: "10-digit mobile", req: true, inputmode: "tel" })}</div></div>${hint("An existing customer with this number is reused.")}`
        : `<div>${flabel("Customer", true, "nb-cust")}${search("Search name or phone", { ui: "nb:q", value: ctx.ui["nb:q"] || "" })}<div class="mt-2">${select(
            "customerId",
            custs.length
              ? custs.map((c) => [
                  c.id,
                  `${c.name}${c.phone ? ` · ${c.phone}` : ""}`,
                ])
              : [["", "No customer matches"]],
            d.customerId && custs.some((c) => c.id === d.customerId)
              ? d.customerId
              : custs[0]?.id || "",
            { id: "nb-cust", req: true }
          )}</div></div>`
    }
    <div>${flabel("Package", false, "nb-pkg")}${select("packageId", [["", "No package"], ...pkgs.map((p) => [p.id, pkgName(p)])], d.packageId || "", { id: "nb-pkg" })}</div>
    <div class="grid grid-cols-2 gap-2">
      <div>${flabel("Staff", false, "nb-staff")}${select("memberId", [["", "Not assigned yet"], ...bookable(s).map((m) => [m.id, m.name])], memberDef, { id: "nb-staff" })}</div>
      <div>${flabel("Length", false, "nb-len")}${select(
        "minutes",
        lenOpts.map((n) => [
          n,
          n < 60
            ? `${n} min`
            : `${Math.floor(n / 60)} h${n % 60 ? ` ${n % 60} min` : ""}`,
        ]),
        minutes,
        { id: "nb-len" }
      )}</div>
      <div>${flabel("Date", true, "nb-date")}${input("date", { id: "nb-date", type: "date", value: bDate, req: true })}</div>
      <div>${flabel("Time", true, "nb-time")}${input("time", { id: "nb-time", type: "time", value: bTime, step: 1800, req: true })}</div>
    </div>
    ${clashText}
    ${hint("New bookings start as To confirm. Confirm sends message 10 to the customer (D68, D69).")}
    <div class="flex flex-wrap gap-2 justify-end"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="submit" class="btn btn-primary" data-need="write">${I("plus")}Create booking</button></div>
  </form>`;
  return modal("nb", "New booking", body);
}

function calendar(ctx) {
  const s = ctx.s;
  const view = ctx.ui.view || "day";
  const date = ctx.ui.date || ctx.today;
  const staffF =
    ctx.ui.staff ??
    (ctx.role === "staff" && ctx.memberId ? ctx.memberId : "all");
  const people = bookable(s);
  const live = s.bookings.filter(
    (b) =>
      !HIDDEN.includes(b.status) && (staffF === "all" || b.memberId === staffF)
  );
  const step = view === "week" ? 7 : 1;
  const mon = mondayOf(date);
  const days =
    view === "week"
      ? Array.from({ length: 7 }, (_, i) => addDays(mon, i))
      : [date];
  const list = live.filter((b) => days.includes(day(b.start)));
  let cols;
  if (view === "week")
    cols = days.map((d) => ({
      head: `${d === ctx.today ? `<span class="size-2 rounded-pill bg-primary"></span>` : ""}${fmtDate(d)}`,
      date: d,
      today: d === ctx.today,
      memberId: staffF !== "all" ? staffF : "",
      match: (b) => day(b.start) === d,
    }));
  else {
    const shown = people.filter((m) => staffF === "all" || m.id === staffF);
    cols = shown.map((m) => ({
      head: `${av(m.initials)}${esc(first(m.name))}`,
      date,
      memberId: m.id,
      match: (b) => b.memberId === m.id,
    }));
    if (staffF === "all" && list.some((b) => !b.memberId))
      cols.push({
        head: `<span class="text-muted-foreground">Not assigned</span>`,
        date,
        memberId: "",
        match: (b) => !b.memberId,
      });
  }
  const label =
    view === "week"
      ? `${fmtDate(days[0])} – ${fmtDate(days[6])}`
      : fmtDate(date);
  const toConfirm = list.filter((b) => b.status === "tentative").length;
  const nav = `${seg(ctx, "view", [
    ["day", "Day"],
    ["week", "Week"],
  ])}<button type="button" class="btn btn-outline btn-sm btn-icon" data-ui="date" data-v="${addDays(date, -step)}" aria-label="Previous">${I("chevron-left", "size-icon-sm")}</button><span class="font-medium" data-cal-label>${label}</span><button type="button" class="btn btn-outline btn-sm btn-icon" data-ui="date" data-v="${addDays(date, step)}" aria-label="Next">${I("chevron-right", "size-icon-sm")}</button><button type="button" class="btn btn-outline btn-sm" data-ui="date" data-v="${ctx.today}" ${days.includes(ctx.today) ? 'aria-pressed="true"' : ""}>Today</button>
    <label class="field w-auto">${I("users", "size-icon-sm text-muted-foreground")}<select class="bg-transparent outline-none" data-ui="staff" aria-label="Staff">${[
      ["all", "All staff"],
      ...people.map((m) => [m.id, m.name]),
    ]
      .map(
        ([v, t]) =>
          `<option value="${v}" ${v === staffF ? "selected" : ""}>${esc(t)}</option>`
      )
      .join("")}</select></label>
    ${toConfirm ? `<span class="chip">${I("calendar-clock", "size-icon-sm")}${toConfirm} to confirm</span>` : ""}`;
  const picked = byId(s.bookings, ctx.ui.bk) || list[0] || s.bookings[0];
  return app(
    ctx,
    "bookings",
    {
      icon: "calendar",
      title: "Bookings",
      fab: `${I("plus")}New booking`,
      fabOpen: "nb",
      dialogs: bookingDialog(ctx, picked) + newBookingDialog(ctx, date),
    },
    page(`
    ${toolbar(nav, `<button type="button" data-need="write" data-open="nb" class="btn btn-primary">${I("plus")}New booking</button>`)}
    ${cols.length ? grid(ctx, cols, list) : `<div class="hidden @tab:block card">${empty("users", "No staff to show", "Pick another staff member.")}</div>`}
    ${agenda(ctx, list, view === "week")}
    ${canWrite(ctx) ? `<p class="hidden @tab:block hint">Drag a booking to another time or staff column to move it. A clash is refused.</p>` : ""}`)
  );
}

/* ---------- jobs ---------- */
const checkBar = (j) => {
  const n = j.checklist.length;
  const d = j.checklist.filter((c) => c.done).length;
  return `<span class="inline-flex items-center gap-2"><span class="w-14 h-1.5 rounded-xs bg-muted overflow-hidden"><span class="block h-full bg-success" style="width:${n ? (d / n) * 100 : 0}%"></span></span>${C(`${d}/${n}`)}</span>`;
};
const TABS = {
  today: (ctx, j) => day(j.start) === ctx.today,
  open: (_, j) => ["open", "in_progress"].includes(j.status),
  done: (_, j) => ["done", "invoiced"].includes(j.status),
  all: () => true,
};

function jobsList(ctx) {
  const s = ctx.s;
  if (s.workspace.modules?.jobs === false)
    return app(
      ctx,
      "bookings",
      { icon: "wrench", title: "Jobs" },
      page(
        `<div class="card">${empty("wrench", "Jobs are turned off", "Jobs is an extra (D63). Bookings still work; turn Jobs on in Settings to track checklists and bills.", `<a ${link("settings", { tab: "numbering" })} class="btn btn-outline" data-need="settings">Open Settings</a>`)}</div>`
      )
    );
  const tab = ctx.ui.tab || "today";
  const mine =
    (ctx.ui.mine ?? (ctx.role === "staff" ? "1" : "")) === "1" && ctx.memberId;
  const list = s.jobs
    .filter(
      (j) => TABS[tab](ctx, j) && (!mine || j.assigneeId === ctx.memberId)
    )
    .sort((a, b) => day(b.start).localeCompare(day(a.start)) || hm(a.start).localeCompare(hm(b.start)));
  const assignees = [
    ...new Set(s.jobs.map((j) => j.assigneeId).filter(Boolean)),
  ]
    .map((id) => byId(s.members, id))
    .filter(Boolean);
  const rows = list.map((j) => {
    const c = byId(s.customers, j.customerId);
    const m = byId(s.members, j.assigneeId);
    const b = byId(s.bookings, j.bookingId);
    return {
      id: j.id,
      f: j.assigneeId || "",
      text: `${j.title} ${c?.name || ""} ${m?.name || ""}`,
      cells: [
        `<span class="font-medium">${esc(j.title)}</span>`,
        esc(c?.name || ""),
        who(m),
        checkBar(j),
        pill(j.status),
        esc(when(ctx, b?.start || j.start)),
        `<a ${link("job", { id: j.id })} class="btn btn-ghost btn-sm btn-icon" aria-label="Open ${esc(j.title)}">${I("chevron-right", "size-icon-sm")}</a>`,
      ],
    };
  });
  return app(
    ctx,
    "jobs",
    { icon: "wrench", title: "Jobs" },
    page(`
    ${toolbar(
      seg(ctx, "tab", [
        ["today", "Today"],
        ["open", "Open"],
        ["done", "Done"],
        ["all", "All"],
      ]),
      ctx.memberId
        ? `<button type="button" class="btn ${mine ? "btn-secondary" : "btn-outline"}" data-ui="mine" data-v="${mine ? "0" : "1"}" aria-pressed="${Boolean(mine)}">${I("user")}Mine</button>`
        : ""
    )}
    ${dataTable(ctx, {
      key: "jobs",
      icon: "wrench",
      title: "Jobs",
      go: "job",
      ph: "Search jobs",
      filters: assignees.map((m) => [m.id, m.name]),
      cols: [
        { t: "Job", role: "title" },
        { t: "Customer", role: "sub" },
        { t: "Assigned", web: 1 },
        { t: "Checklist", role: "end" },
        { t: "Status", role: "status" },
        { t: "When", m: 1, web: 1 },
        { t: "", role: "act" },
      ],
      rows,
    })}`)
  );
}

/* Bill preview: run the bill on a throwaway copy to show exactly what will be created. */
function billPreview(ctx, job, lines) {
  const tmp = structuredClone(ctx.s);
  try {
    const out = ctx.biz.bookings.bill(
      tmp,
      { jobId: job.id, lines, channel: "email" },
      {
        role: ctx.role === "superadmin" ? "owner" : ctx.role,
        memberId: ctx.memberId,
        today: ctx.today,
      }
    );
    return {
      inv: out.invoice,
      total: ctx.biz.invoices.total(tmp, out.invoice),
    };
  } catch (e) {
    return { error: e.message };
  }
}
const autoLines = (ctx, job) => {
  const r = billPreview(ctx, job);
  return r.error ? null : r;
};

function billDialog(ctx, job) {
  const s = ctx.s;
  const auto = autoLines(ctx, job);
  const d = ctx.ui.bl || {};
  const items = ctx.biz.catalog.visibleItems(s);
  let lines = null;
  let pv = auto;
  let editor = "";
  if (!auto) {
    const n = Math.max(1, +(ctx.ui["bl:n"] || 1));
    const picked = Array.from({ length: n }, (_, i) => d.lines?.[i] || {});
    lines = picked
      .map((p, i) => {
        const it = byId(s.items, p.itemId || (i === 0 ? items[0]?.id : ""));
        return it ? ctx.biz.invoices.lineFromItem(it, +p.qty || 1) : null;
      })
      .filter(Boolean);
    pv = lines.length
      ? billPreview(ctx, job, lines)
      : { error: "Add at least one line." };
    editor = `<p class="mt-3 text-muted-foreground">This job has no package or quoted lines. Pick what was done from the catalog.</p>
      <div class="mt-2 space-y-2">${picked
        .map(
          (p, i) =>
            `<div class="grid grid-cols-[1fr_5rem] gap-2">${select(
              `lines[${i}][itemId]`,
              items.map((it) => [
                it.id,
                `${it.name} · ₹${it.price.toLocaleString("en-IN")}`,
              ]),
              p.itemId || (i === 0 ? items[0]?.id : items[0]?.id),
              { label: `Line ${i + 1} item` }
            )}${input(`lines[${i}][qty]`, { type: "number", min: 1, value: p.qty || 1, attrs: { "aria-label": `Line ${i + 1} quantity` } })}</div>`
        )
        .join("")}</div>
      <button type="button" class="mt-2 btn btn-ghost btn-sm" data-ui="bl:n" data-v="${n + 1}">${I("plus", "size-icon-sm")}Add line</button>`;
  }
  const inv = pv?.inv;
  const summary = inv
    ? `<div class="mt-3 rounded-control bg-muted p-3 space-y-1">${inv.lines.map((l) => `<div class="flex justify-between gap-2"><span class="truncate">${esc(l.name)} × ${l.qty}</span>${M(l.qty * l.rate)}</div>`).join("")}<div class="pt-1 border-t border-border flex justify-between font-medium"><span>${inv.kind === "balance" ? "Balance after advance" : "Bill"} ${C(inv.piNumber)}</span>${M(pv.total)}</div></div>${hint(`${inv.kind === "balance" ? "The advance was paid on its own invoice, so this is the balance (D70)." : "A bill is owed after the service."} It stays ${C("PI-")} until its payment is approved, then gets an ${C("INV-")} number (D71).`)}`
    : `<p class="mt-3 text-caption text-destructive">${esc(pv?.error || "")}</p>`;
  const draft = job.invoiceId ? byId(s.invoices, job.invoiceId) : null;
  return modal(
    "bill",
    `Review and send · ${esc(job.title)}`,
    `<form data-draft="bl" data-do="billJob" data-a-job-id="${job.id}">${draft ? `<p class="mt-2 text-muted-foreground">Marking the job done made this draft (D88). Change lines in the invoice editor, or send it as it is.</p><a ${link("invoice", { id: draft.id })} class="mt-2 btn btn-outline btn-sm">${I("pencil", "size-icon-sm")}Edit lines</a>` : ""}${editor}${summary}
      <div class="mt-3"><p class="flabel">Send by</p>${radios(
        "channel",
        [
          ["email", "Email"],
          ["sms", "SMS"],
          ["whatsapp", "WhatsApp"],
        ],
        d.channel || "email",
        { label: "Send by" }
      )}${hint("Email is sent by the app; SMS and WhatsApp are copied for you to paste (D67).")}</div>
      <div class="mt-4 flex flex-wrap gap-2 justify-end"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="submit" class="btn btn-primary" data-need="write" ${inv ? "" : "disabled"}>${I("send")}${draft ? "Send" : "Create and send"} ${draft?.kind === "balance" ? "balance" : "bill"}</button></div></form>`
  );
}

/* A quoted lead whose reply is already paid needs no bill after the service (D60, D72). */
const paidUpfront = (ctx, job) =>
  job.leadId
    ? ctx.biz.invoices
        .ofLead(ctx.s, job.leadId)
        .find(
          (i) =>
            i.kind === "reply" && ctx.biz.invoices.statusOf(ctx.s, i) === "paid"
        )
    : null;

/* Job photos, Before and After (D87). Up to MAX_PHOTOS; changeable until the job is invoiced. */
function jobPhotos(ctx, job) {
  const photos = job.photos || [];
  const open = job.status !== "invoiced";
  const col = (tag, label) => {
    const list = photos.filter((p) => p.tag === tag);
    return `<div class="card p-2" data-photos="${tag}"><p class="text-caption text-muted-foreground mb-1">${label} · ${list.length}</p>
      <div class="grid grid-cols-2 gap-1.5">${list
        .map(
          (p) =>
            `<div class="relative aspect-square rounded-control bg-muted overflow-hidden" data-photo="${esc(p.id)}">${p.url ? `<img src="${esc(p.url)}" alt="${esc(p.name)}" class="size-full object-cover">` : `<span class="absolute inset-0 flex items-center justify-center p-1 text-caption text-muted-foreground text-center break-all">${esc(p.name)}</span>`}${open ? `<button type="button" data-need="write" data-do="bookings.removePhoto" data-a-job-id="${job.id}" data-a-id="${esc(p.id)}" class="absolute top-1 right-1 btn btn-ghost btn-sm btn-icon bg-card/80" aria-label="Remove photo ${esc(p.name)}">${I("x", "size-icon-sm")}</button>` : ""}</div>`
        )
        .join("")}</div>
      ${
        open && photos.length < ctx.biz.bookings.MAX_PHOTOS
          ? `<form data-do="bookings.addPhoto" data-a-job-id="${job.id}" data-a-tag="${tag}" class="mt-1.5 flex items-center gap-1.5"><label class="flex-1 min-w-0 flex items-center gap-1.5 h-touch px-2 rounded-control border-2 border-dashed border-border cursor-pointer text-caption text-muted-foreground">${I("camera", "size-icon-sm shrink-0")}<span class="truncate" id="ph-${tag}-name">Choose</span><input type="file" class="sr-only" name="photo" accept="image/*" data-preview="#ph-${tag}-name" aria-label="${label} photo" /></label><button type="submit" data-need="write" class="btn btn-outline btn-sm">${I("plus", "size-icon-sm")}Add</button></form>`
          : ""
      }</div>`;
  };
  return `<div class="grid grid-cols-2 gap-2">${col("before", "Before")}${col("after", "After")}</div>`;
}

/* Materials used on the job (D87). No prices: what materials cost is not decided. */
function jobMaterials(ctx, job) {
  const list = job.materials || [];
  const open = job.status !== "invoiced";
  return `<div class="card p-card-sm" data-materials><p class="label mb-1">Materials · ${list.length}</p>
    ${
      list.length
        ? `<ul class="divide-y divide-border">${list
            .map(
              (m) =>
                `<li class="flex items-center gap-2 py-1.5" data-material="${esc(m.id)}"><span class="min-w-0 flex-1"><span class="font-medium">${esc(m.name)}</span>${m.note ? `<span class="block text-caption text-muted-foreground">${esc(m.note)}</span>` : ""}</span>${C(`${m.qty}${m.unit ? ` ${m.unit}` : ""}`)}${open ? `<button type="button" data-need="write" data-do="bookings.removeMaterial" data-a-job-id="${job.id}" data-a-id="${esc(m.id)}" class="btn btn-ghost btn-sm btn-icon" aria-label="Remove ${esc(m.name)}">${I("trash-2", "size-icon-sm")}</button>` : ""}</li>`
            )
            .join("")}</ul>`
        : `<p class="text-caption text-muted-foreground">None recorded.</p>`
    }
    ${
      open
        ? `<form data-do="bookings.addMaterial" data-a-job-id="${job.id}" class="mt-2 grid grid-cols-[1fr_4.5rem_4.5rem] gap-1.5">${input("name", { id: "mt-name", placeholder: "Material", cls: "h-control-sm", attrs: { "aria-label": "Material" } })}${input("qty", { id: "mt-qty", type: "number", min: 0, step: "any", value: 1, cls: "h-control-sm", attrs: { "aria-label": "Quantity" } })}${input("unit", { id: "mt-unit", placeholder: "Unit", cls: "h-control-sm", attrs: { "aria-label": "Unit" } })}${input("note", { id: "mt-note", placeholder: "Note (optional)", cls: "h-control-sm col-span-2", attrs: { "aria-label": "Note" } })}<button type="submit" data-need="write" class="btn btn-outline btn-sm h-control-sm">${I("plus", "size-icon-sm")}Add</button></form>`
        : ""
    }</div>`;
}

function jobDetail(ctx) {
  const s = ctx.s;
  const job =
    byId(s.jobs, ctx.params.id) ||
    s.jobs.find((j) => j.status === "in_progress") ||
    s.jobs[0];
  const back = s.workspace.modules?.jobs === false ? "bookings" : "jobs";
  if (!job)
    return app(
      ctx,
      "jobs",
      { icon: "wrench", title: "Job", back },
      page(
        `<div class="card">${empty("wrench", "No jobs yet", "Start a booking to open its job.")}</div>`
      )
    );
  const c = byId(s.customers, job.customerId);
  const b = byId(s.bookings, job.bookingId);
  const m = byId(s.members, job.assigneeId);
  const n = job.checklist.length;
  const done = job.checklist.filter((x) => x.done).length;
  const ticking = ["open", "in_progress"].includes(job.status);
  const inv = job.invoiceId ? byId(s.invoices, job.invoiceId) : null;
  const upfront = !inv && paidUpfront(ctx, job);
  const length = b && b.end ? lenOf(b) : null;
  const list = n
    ? job.checklist
        .map((x, i) => {
          const inner = `<span class="size-control-xs rounded-xs flex items-center justify-center shrink-0 ${x.done ? "bg-primary text-primary-foreground" : "border-2 border-border"}">${x.done ? I("check", "size-icon-sm") : ""}</span><span class="${x.done ? "line-through text-muted-foreground" : ""}">${esc(x.t)}</span>`;
          return ticking
            ? `<button type="button" class="w-full text-left flex items-center gap-3 h-touch border-t border-border first:border-0 text-body" data-need="write" data-do="bookings.tick" data-a-job-id="${job.id}" data-a-index="${i}" data-tick="${i}" aria-pressed="${x.done}">${inner}</button>`
            : `<div class="flex items-center gap-3 h-touch border-t border-border first:border-0 text-body">${inner}</div>`;
        })
        .join("")
    : `<p class="text-muted-foreground py-2">No checklist for this job.</p>`;
  let bar = "";
  if (job.status === "open")
    bar = `<button type="button" data-need="write" data-do="bookings.start" data-a-job-id="${job.id}" class="btn btn-primary w-full @web:w-auto @web:px-8 h-touch text-body">${I("play")}Start job</button>${b?.status === "tentative" ? hint("The booking is still To confirm. Confirm it on the calendar first.") : ""}`;
  else if (job.status === "in_progress")
    bar = `<button type="button" data-need="write" data-do="bookings.done" data-a-job-id="${job.id}" class="btn btn-primary w-full @web:w-auto @web:px-8 h-touch text-body">${I("circle-check")}Mark done</button><p class="hint">${n - done ? `${n - done} item${n - done > 1 ? "s" : ""} left on the checklist` : "Checklist complete. Done sends message 17 (Job completed) to the customer by email."}</p>`;
  else if (inv && !inv.sharedAt)
    bar = `<button type="button" data-need="write" data-open="bill" class="btn btn-primary w-full @web:w-auto @web:px-8 h-touch text-body" data-review>${I("send")}Review and send</button><a ${link("invoice", { id: inv.id })} class="ml-2 btn btn-ghost h-touch">${I("receipt")}Draft ${inv.kind === "balance" ? "balance" : "bill"}</a><p class="hint">Marking the job done made the draft (D88). It is numbered when you send it.</p>`;
  else if (inv)
    bar = `<a ${link("invoice", { id: inv.id })} class="btn btn-outline w-full @web:w-auto @web:px-8 h-touch text-body">${I("receipt")}${inv.kind === "balance" ? "Balance" : "Bill"} ${C(ctx.biz.invoices.numberOf(inv))}</a><span class="ml-2 align-middle">${pill(ctx.biz.invoices.statusOf(s, inv))}</span>`;
  else if (upfront)
    bar = `<a ${link("invoice", { id: upfront.id })} class="btn btn-outline w-full @web:w-auto @web:px-8 h-touch text-body">${I("receipt")}Paid upfront ${C(ctx.biz.invoices.numberOf(upfront))}</a><p class="hint">The reply on this lead is paid, so there is nothing more to bill.</p>`;
  else
    bar = `<button type="button" data-need="write" data-open="bill" class="btn btn-primary w-full @web:w-auto @web:px-8 h-touch text-body">${I("receipt")}Bill customer</button><p class="hint">Creates the bill${job.leadId ? " (or the balance after an advance)" : ""} and sends it.</p>`;
  const offline =
    typeof navigator !== "undefined" && navigator.onLine === false;
  return app(
    ctx,
    "jobs",
    {
      icon: "wrench",
      title: esc(job.title),
      crumb: "Job",
      back,
      dialogs:
        job.status === "done" && (!inv || !inv.sharedAt) && !upfront
          ? billDialog(ctx, job)
          : "",
    },
    `<div class="min-h-full flex flex-col">
    ${offline ? `<div class="m-4 mb-0 flex items-center gap-2 px-3 py-2 rounded-control bg-warning-soft text-warning text-caption font-medium">${I("wifi-off", "size-icon-sm")}Offline. Changes save here and sync later.</div>` : ""}
    <div class="p-4 @tab:p-page grid @web:grid-cols-2 gap-4">
      <div><h1 class="font-serif text-heading font-semibold">${esc(job.title)}</h1><p class="text-muted-foreground">${esc(c?.name || "")} · ${esc(when(ctx, b?.start || job.start, b?.end))} · ${esc(m ? first(m.name) : "Not assigned")}</p><div class="mt-1.5 flex flex-wrap gap-2">${pill(job.status)}${job.leadId ? `<a ${link("lead", { id: job.leadId })} class="chip">${I("inbox", "size-icon-sm")}Lead</a>` : ""}</div>
        <div class="mt-3 card p-card-sm"><p class="label mb-1">Checklist · ${done} of ${n}</p>${list}</div></div>
      <div class="space-y-3">
        ${jobPhotos(ctx, job)}
        ${jobMaterials(ctx, job)}
        <div class="card p-card-sm flex items-center gap-3">${I("timer", "size-icon text-muted-foreground")}<div><p class="font-medium">Time</p>${length ? C(`${Math.floor(length / 60)} h ${length % 60} m booked`) : C(job.completedAt ? `Done ${when(ctx, job.completedAt)}` : "Not booked")}</div></div>
        ${b?.notes ? `<div class="card p-card-sm"><p class="flabel">Notes</p><div class="field h-auto py-2">${esc(b.notes)}</div></div>` : ""}
      </div>
    </div>
    <div class="flex-1"></div>
    <div class="sticky bottom-0 p-4 bg-card border-t border-border">${bar}</div>
  </div>`
  );
}

/* Staff day view (the job screen's "My day" state). */
function myDay(ctx) {
  const s = ctx.s;
  const mid =
    (ctx.role === "staff" && ctx.memberId) ||
    ctx.params.member ||
    (ctx.memberId &&
    s.bookings.some(
      (b) => b.memberId === ctx.memberId && day(b.start) === ctx.today
    )
      ? ctx.memberId
      : s.meta.people.staff);
  const m = byId(s.members, mid);
  const items = s.bookings
    .filter(
      (b) =>
        b.memberId === mid &&
        day(b.start) === ctx.today &&
        !HIDDEN.includes(b.status)
    )
    .sort((a, b) => String(a.start).localeCompare(String(b.start)))
    .map((b) => {
      const j = s.jobs.find((x) => x.bookingId === b.id);
      return {
        t: hm(b.start),
        title: j?.title || serviceOf(s, b),
        cust: byId(s.customers, b.customerId)?.name,
        st: j ? j.status : b.status,
        go: j ? ["job", { id: j.id }] : ["bookings", {}],
      };
    });
  const weekDone = s.jobs.filter(
    (j) =>
      j.assigneeId === mid &&
      j.completedAt &&
      daysBetween(day(j.completedAt), ctx.today) < 7 &&
      daysBetween(day(j.completedAt), ctx.today) >= 0
  ).length;
  const long = new Date(`${ctx.today}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return app(
    ctx,
    "jobs",
    { icon: "sun", title: "My day" },
    page(`<div><h1 class="font-serif text-heading font-semibold">My day</h1><p class="text-muted-foreground">${esc(m ? first(m.name) : "")} · ${esc(long)}</p></div>
    ${
      items.length
        ? `<div class="grid @tab:grid-cols-2 gap-2">${items
            .map(
              (j) =>
                `<a ${link(j.go[0], j.go[1])} class="card px-3 py-2.5 min-h-touch flex items-center gap-3 hover:bg-muted">${C(j.t)}<div class="min-w-0"><p class="font-medium truncate">${esc(j.title)}</p><p class="text-caption text-muted-foreground">${esc(j.cust || "")}</p></div><span class="ml-auto">${pill(j.st)}</span></a>`
            )
            .join("")}</div>`
        : `<div class="card">${empty("sun", "Nothing booked today", "Your bookings for today show here.")}</div>`
    }
    <div class="card p-card-sm"><p class="label">Done this week</p><p class="font-mono text-money-lg">${weekDone}</p><p class="text-caption text-muted-foreground">Jobs marked done in the last 7 days</p></div>`)
  );
}

/* ---------- checks helpers ---------- */
const uiOf = (h, id, params = {}) =>
  h.makeCtx(undefined, id, "owner", params).ui;
const live = (h) => h.makeCtx().s;
const submit = (f, sel) => f.querySelector(sel)?.requestSubmit();

export default [
  {
    n: 16,
    area: "Bookings",
    id: "bookings",
    name: "Calendar",
    route: "/w/:slug/bookings",
    action: "New booking, drag to move",
    who: "All",
    notes:
      "Tablet and web: per-member columns (day) or days (week); drag a booking to another time or staff column, a clash is refused. Phone: agenda list by time. Click a booking to confirm (message 10), move, start, cancel or mark no-show.",
    render: calendar,
    actions: {
      newBooking: (ctx, a) => {
        const out = call(
          "New booking",
          (s, c) => {
            let customerId = a.customerId;
            if (a.cmode === "new")
              customerId = ctx.biz.leads.findOrCreateCustomer(s, {
                name: a.name,
                phone: a.phone,
              }).id;
            if (!a.date || !a.time) fail("Pick a date and time.");
            return ctx.biz.bookings.create(
              s,
              {
                customerId,
                packageId: a.packageId || null,
                memberId: a.memberId || null,
                start: `${a.date}T${a.time}`,
                minutes: +a.minutes || undefined,
              },
              c
            );
          },
          ctx
        );
        ctx.ui.date = a.date;
        delete ctx.ui["nb:q"];
        return out;
      },
      moveBooking: (ctx, a) =>
        call(
          "Move booking",
          (s, c) =>
            ctx.biz.bookings.move(
              s,
              {
                id: a.id,
                start: `${a.date}T${a.time}`,
                memberId: a.memberId || null,
              },
              c
            ),
          ctx
        ),
      startBooking: (ctx, a) => {
        const out = call(
          "Start job",
          (s, c) => ctx.biz.bookings.start(s, { bookingId: a.id }, c),
          ctx
        );
        return { ...out, go: ["job", { id: out.job.id }] };
      },
    },
    checks: [
      (t, h) => {
        const f = h.at("bookings");
        const s = live(h);
        const today = s.bookings.filter(
          (b) =>
            day(b.start) === s.meta.today &&
            !HIDDEN.includes(b.status) &&
            b.memberId
        );
        t(
          f.querySelectorAll(".cal-grid [data-bk]").length === today.length,
          "day grid shows every booking of the day"
        );
        t(
          f.querySelector("[data-cal-label]")?.textContent ===
            fmtDate(s.meta.today),
          "calendar opens on today"
        );
      },
      (t, h) => {
        /* next / previous change the date; week shows the 20 Oct booking */
        let f = h.at("bookings");
        f.querySelector('[data-ui="date"][aria-label="Next"]').click();
        f = h.at("bookings");
        const s = live(h);
        const tomorrow = addDays(s.meta.today, 1);
        t(
          f.querySelector("[data-cal-label]")?.textContent ===
            fmtDate(tomorrow),
          "Next moves to the next day"
        );
        const nTomorrow = s.bookings.filter(
          (b) => day(b.start) === tomorrow && !HIDDEN.includes(b.status)
        ).length;
        t(
          f.querySelectorAll(".cal-grid [data-bk]").length === nTomorrow,
          "the grid shows the next day's bookings"
        );
        uiOf(h, "bookings").date = s.meta.today;
        uiOf(h, "bookings").view = "week";
        f = h.at("bookings");
        const mon = mondayOf(s.meta.today);
        const inWeek = s.bookings.filter(
          (b) =>
            day(b.start) >= mon &&
            day(b.start) <= addDays(mon, 6) &&
            !HIDDEN.includes(b.status)
        ).length;
        t(
          f.querySelectorAll(".cal-grid [data-bk]").length === inWeek,
          "week view shows the whole week"
        );
        delete uiOf(h, "bookings").view;
      },
      (t, h) => {
        /* staff filter */
        const s = live(h);
        const id = s.meta.people.staff;
        uiOf(h, "bookings").staff = id;
        const f = h.at("bookings");
        const shown = [...f.querySelectorAll(".cal-grid [data-bk]")].map((x) =>
          byId(s.bookings, x.dataset.bk)
        );
        t(
          shown.length > 0 && shown.every((b) => b.memberId === id),
          "staff filter shows only that person's bookings"
        );
        delete uiOf(h, "bookings").staff;
      },
      (t, h) => {
        /* confirm: To confirm → Agreed, message 10 in the outbox */
        const s0 = live(h);
        const b = s0.bookings.find(
          (x) =>
            x.status === "tentative" &&
            x.memberId &&
            day(x.start) === s0.meta.today
        );
        uiOf(h, "bookings").bk = b.id;
        let f = h.at("bookings");
        t(
          f
            .querySelector(`[data-bk="${b.id}"]`)
            ?.textContent.includes("To confirm"),
          "a tentative booking shows To confirm"
        );
        submit(f, '[data-dialog="bk"] form[data-do="bookings.confirm"]');
        const s = live(h);
        t(
          byId(s.bookings, b.id).status === "confirmed",
          "Confirm turns To confirm into Agreed (D68)"
        );
        t(
          s.outbox[0]?.templateId === 10 && s.outbox[0].recordId === b.id,
          "Confirm puts message 10 in the outbox"
        );
        f = h.at("bookings");
        t(
          f.querySelector('[data-dialog="bk"] [data-status="confirmed"]'),
          "the booking dialog shows Agreed"
        );
      },
      (t, h) => {
        /* new booking + clash */
        const s0 = live(h);
        const busy = s0.bookings.find(
          (b) =>
            b.status === "confirmed" &&
            b.memberId &&
            day(b.start) === s0.meta.today
        );
        const ui = uiOf(h, "bookings");
        ui.nb = {
          cmode: "existing",
          customerId: s0.customers[0].id,
          memberId: busy.memberId,
          date: s0.meta.today,
          time: hm(busy.start),
          minutes: "60",
        };
        let f = h.at("bookings");
        t(
          f.querySelector("[data-clash]"),
          "New booking warns about a clash while filling in"
        );
        const n = s0.bookings.length;
        submit(f, 'form[data-do="newBooking"]');
        t(live(h).bookings.length === n, "a clashing booking is refused");
        ui.nb = {
          cmode: "new",
          name: "Check Person",
          phone: "9811122233",
          memberId: busy.memberId,
          date: addDays(s0.meta.today, 3),
          time: "10:00",
          minutes: "60",
        };
        f = h.at("bookings");
        submit(f, 'form[data-do="newBooking"]');
        const s = live(h);
        const nb = s.bookings[0];
        t(
          s.bookings.length === n + 1 &&
            nb.status === "tentative" &&
            byId(s.customers, nb.customerId)?.name === "Check Person",
          "New booking with a new customer by phone creates a To confirm booking"
        );
        t(
          uiOf(h, "bookings").date === addDays(s0.meta.today, 3),
          "the calendar jumps to the new booking's day"
        );
        delete uiOf(h, "bookings").date;
      },
      (t, h) => {
        /* move, start, cancel through the dialog */
        const s0 = live(h);
        const b = s0.bookings.find(
          (x) =>
            x.status === "confirmed" &&
            s0.jobs.some((j) => j.bookingId === x.id && j.status === "open")
        );
        const ui = uiOf(h, "bookings");
        ui.bk = b.id;
        let f = h.at("bookings");
        const form = f.querySelector('form[data-do="moveBooking"]');
        form.querySelector('[name="time"]').value = "18:30";
        form.requestSubmit();
        t(
          hm(byId(live(h).bookings, b.id).start) === "18:30",
          "Move changes the booking time"
        );
        f = h.at("bookings");
        f.querySelector('[data-dialog="bk"] [data-do="startBooking"]').click();
        const s = live(h);
        const j = s.jobs.find((x) => x.bookingId === b.id);
        t(
          j.status === "in_progress" &&
            byId(s.bookings, b.id).status === "in_progress",
          "Start turns the job In progress"
        );
        const other = s.bookings.find((x) => x.status === "tentative");
        ui.bk = other.id;
        f = h.at("bookings");
        f.querySelector(
          '[data-dialog="bk"] [data-a-status="cancelled"]'
        ).click();
        t(
          byId(live(h).bookings, other.id).status === "cancelled",
          "Cancel marks the booking cancelled"
        );
        f = h.at("bookings");
        t(
          !f.querySelector(`.cal-grid [data-bk="${other.id}"]`),
          "a cancelled booking leaves the grid"
        );
        delete ui.bk;
      },
      (t, h) => {
        const f = h.at("bookings", {}, "accountant");
        t(
          !f.querySelector("[data-bk-drag]") &&
            !f.querySelector('[data-open="nb"]'),
          "the Accountant cannot drag or add bookings"
        );
      },
    ],
  },
  {
    n: 17,
    area: "Jobs",
    id: "jobs",
    name: "Job list",
    route: "/w/:slug/jobs",
    action: "Open job",
    who: "Staff, Manager",
    notes:
      "Jobs is an extra (D63). Tabs Today / Open / Done / All, Mine, assignee filter and search all filter the list. Done → bill from the job.",
    render: jobsList,
    checks: [
      (t, h) => {
        const s = live(h);
        const ui = uiOf(h, "jobs");
        let f = h.at("jobs");
        const rows = () =>
          [...f.querySelectorAll("tbody [data-row]")]
            .map((r) => byId(s.jobs, r.dataset.row))
            .filter(Boolean);
        t(
          rows().length ===
            s.jobs.filter((j) => day(j.start) === s.meta.today).length,
          "Today tab lists today's jobs"
        );
        ui.tab = "done";
        f = h.at("jobs");
        t(
          rows().length > 0 &&
            rows().every((j) => ["done", "invoiced"].includes(j.status)),
          "Done tab shows only done and invoiced jobs"
        );
        ui.tab = "all";
        ui["jobs:q"] = s.customers
          .find((c) => c.id === s.jobs[1].customerId)
          .name.split(" ")[0];
        f = h.at("jobs");
        t(
          rows().length >= 1 &&
            rows().every(
              (j) =>
                j.customerId === s.jobs[1].customerId ||
                j.title.includes(ui["jobs:q"])
            ),
          "search finds the job by customer"
        );
        delete ui["jobs:q"];
        ui["jobs:f"] = s.meta.people.staff;
        f = h.at("jobs");
        t(
          rows().every((j) => j.assigneeId === s.meta.people.staff),
          "assignee filter filters"
        );
        delete ui["jobs:f"];
        ui.mine = "1";
        f = h.at("jobs");
        t(
          rows().every((j) => j.assigneeId === s.meta.people.owner),
          "Mine shows only my jobs"
        );
        delete ui.mine;
        delete ui.tab;
        f = h.at("jobs");
        t(
          f.querySelector('tbody [data-row][data-go="job"]'),
          "rows open the job"
        );
      },
      (t, h) => {
        h.s.workspace.modules.jobs = false;
        const f = h.at("jobs");
        t(
          f.textContent.includes("Jobs are turned off") &&
            !f.querySelector("tbody [data-row]"),
          "Jobs respects the module switch (D63)"
        );
        h.s.workspace.modules.jobs = true;
      },
    ],
  },
  {
    n: 18,
    area: "Jobs",
    id: "job",
    name: "Job detail",
    route: "/w/:slug/jobs/:id",
    action: "Mark done",
    who: "Staff, Manager",
    notes:
      'Built for the phone: one hand, 44px targets, offline banner when the device is offline (1.7). Tick the checklist, Start, Mark done (message 17; makes the draft bill, or the balance after an advance, D70, D88), then Review and send. Before / After photos and materials used (D87). State "My day" is the staff day view (3.3).',
    sample: { id: "J1" },
    states: [
      ["Job", jobDetail],
      ["My day", myDay],
    ],
    checks: [
      (t, h) => {
        /* done needs the checklist; ticking completes it; done sends 17 */
        const s0 = live(h);
        const j = s0.jobs.find(
          (x) => x.status === "in_progress" && x.checklist.some((c) => !c.done)
        );
        let f = h.at("job", { id: j.id });
        f.querySelector('[data-do="bookings.done"]').click();
        t(
          byId(live(h).jobs, j.id).status === "in_progress",
          "Mark done is refused while the checklist is open"
        );
        j.checklist.forEach((c, i) => {
          if (!c.done) {
            f = h.at("job", { id: j.id });
            f.querySelector(`[data-tick="${i}"]`).click();
          }
        });
        t(
          byId(live(h).jobs, j.id).checklist.every((c) => c.done),
          "ticking the checklist saves every item"
        );
        f = h.at("job", { id: j.id });
        f.querySelector('[data-do="bookings.done"]').click();
        const s = live(h);
        t(
          byId(s.jobs, j.id).status === "done",
          "Mark done with a full checklist makes the job Done"
        );
        t(s.outbox[0]?.templateId === 17, "Done puts message 17 in the outbox");
      },
      (t, h) => {
        /* start an open job, then bill a done job with lead lines */
        const s0 = live(h);
        const open = s0.jobs.find(
          (x) =>
            x.status === "open" &&
            byId(s0.bookings, x.bookingId)?.status === "confirmed"
        );
        let f = h.at("job", { id: open.id });
        f.querySelector('[data-do="bookings.start"]').click();
        t(
          byId(live(h).jobs, open.id).status === "in_progress",
          "Start turns the job In progress"
        );
        const s1 = live(h);
        const lj = s1.jobs.find(
          (x) =>
            x.leadId &&
            byId(s1.leads, x.leadId)?.lines?.length &&
            ["open", "in_progress"].includes(x.status)
        );
        const run = (name, args) =>
          h.biz.bookings[name](live(h), args, {
            role: "owner",
            memberId: s1.meta.people.owner,
            today: s1.meta.today,
          });
        if (lj.status === "open") run("start", { jobId: lj.id });
        for (const c of byId(live(h).jobs, lj.id).checklist) c.done = true;
        run("done", { jobId: lj.id });
        const pi = live(h).workspace.numbering.PI.next;
        const dr = byId(live(h).invoices, byId(live(h).jobs, lj.id).invoiceId);
        t(
          Boolean(dr) && !dr.sharedAt && !dr.piNumber && dr.jobId === lj.id,
          "Mark done makes the draft invoice at once, not numbered, not sent (D88)"
        );
        f = h.at("job", { id: lj.id });
        t(
          f.querySelector('[data-dialog="bill"]') &&
            f.querySelector("[data-review]"),
          "a done job offers Review and send"
        );
        submit(f, '[data-dialog="bill"] form[data-do="billJob"]');
        const s = live(h);
        const inv = byId(s.invoices, byId(s.jobs, lj.id).invoiceId);
        t(
          inv &&
            inv.piNumber?.endsWith(String(pi).padStart(4, "0")) &&
            ["bill", "balance"].includes(inv.kind),
          "Review and send numbers the draft (PI-) and sends it"
        );
        t(inv?.id === dr?.id, "it sends the same draft, not a second invoice");
        f = h.at("job", { id: lj.id });
        t(
          f.querySelector('[data-go="invoice"]'),
          "the job links to its invoice"
        );
      },
      (t, h) => {
        /* a job with no package or lines: pick lines from the catalog */
        const s0 = live(h);
        const j = s0.jobs.find((x) => x.status === "in_progress");
        const run = (name, args) =>
          h.biz.bookings[name](live(h), args, {
            role: "owner",
            memberId: s0.meta.people.owner,
            today: s0.meta.today,
          });
        for (const c of byId(live(h).jobs, j.id).checklist) c.done = true;
        run("done", { jobId: j.id });
        const f = h.at("job", { id: j.id });
        t(
          f.querySelector(
            '[data-dialog="bill"] select[name="lines[0][itemId]"]'
          ),
          "a job without lines picks bill lines from the catalog"
        );
        submit(f, '[data-dialog="bill"] form[data-do="billJob"]');
        t(
          Boolean(byId(live(h).jobs, j.id).invoiceId),
          "billing from catalog lines creates the invoice"
        );
      },
      (t, h) => {
        /* photos and materials (D87) */
        const s0 = live(h);
        const j = s0.jobs.find((x) => x.status !== "invoiced");
        const run = (name, args) =>
          h.biz.bookings[name](live(h), args, {
            role: "staff",
            memberId: s0.meta.people.staff,
            today: s0.meta.today,
          });
        run("addPhoto", { jobId: j.id, tag: "before", photo: { name: "wall.jpg" } });
        run("addPhoto", { jobId: j.id, tag: "after", photo: { name: "done.jpg" } });
        let f = h.at("job", { id: j.id });
        t(
          f.querySelectorAll('[data-photos="before"] [data-photo]').length === 1 &&
            f.querySelectorAll('[data-photos="after"] [data-photo]').length === 1,
          "photos show under Before and After"
        );
        const ph = byId(live(h).jobs, j.id).photos[0];
        f.querySelector(`[data-do="bookings.removePhoto"][data-a-id="${ph.id}"]`).click();
        t(
          byId(live(h).jobs, j.id).photos.length === 1,
          "a photo can be removed"
        );
        run("addMaterial", { jobId: j.id, name: "Primer", qty: "2", unit: "L" });
        run("addMaterial", { jobId: j.id, name: "Tape", qty: "1" });
        let refused = false;
        try {
          run("addMaterial", { jobId: j.id, name: "Glue", qty: "0" });
        } catch {
          refused = true;
        }
        t(refused, "a material needs a quantity above 0");
        f = h.at("job", { id: j.id });
        t(
          f.querySelectorAll("[data-materials] [data-material]").length === 2 &&
            f.textContent.includes("2 L"),
          "materials list with quantity and unit"
        );
        const m = byId(live(h).jobs, j.id).materials[0];
        f.querySelector(`[data-do="bookings.removeMaterial"][data-a-id="${m.id}"]`).click();
        t(
          byId(live(h).jobs, j.id).materials.length === 1,
          "a material can be removed"
        );
      },
      (t, h) => {
        const s = live(h);
        const f = h.at("job", {}, "staff", "mob", 1);
        const mine = s.bookings.filter(
          (b) =>
            b.memberId === s.meta.people.staff &&
            day(b.start) === s.meta.today &&
            !HIDDEN.includes(b.status)
        ).length;
        t(
          f.textContent.includes("My day") &&
            f.querySelectorAll("main a.card").length === mine,
          "My day lists the staff member's bookings today"
        );
      },
    ],
    actions: {
      billJob: (ctx, a) => {
        const lines = (a.lines || [])
          .map((l) => {
            const it = byId(ctx.s.items, l.itemId);
            return it ? ctx.biz.invoices.lineFromItem(it, +l.qty || 1) : null;
          })
          .filter(Boolean);
        const out = call(
          "Bill job",
          (s, c) =>
            ctx.biz.bookings.bill(
              s,
              {
                jobId: a.jobId,
                lines: lines.length ? lines : undefined,
                channel: a.channel || "email",
              },
              c
            ),
          ctx
        );
        delete ctx.ui["bl:n"];
        return out;
      },
    },
  },
];
