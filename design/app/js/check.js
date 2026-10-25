import { biz } from "./biz/index.js";
/* In-browser checker (owner, 22 Oct: "Browser #check only"). Renders every screen in every state, for the
   Owner on phone, tablet and web and every other role on web, against a fresh copy of the default data, and
   checks the wiring; then runs each screen's own checks and the business-flow checks below. */
import * as store from "./core/store.js";
import { known } from "./ui/actions.js";
import { I, esc } from "./ui/kit.js";
import { SCREENS, screenById } from "./ui/registry.js";
import { canSee } from "./ui/shell.js";
import { st, render, makeCtx, setChecking } from "./ui/viewer.js";

const ROLES_WEB = ["superadmin", "manager", "staff", "accountant"];

/* only: screen ids to check (from #check=id,id); flows always run. */
export function runChecks(only = null) {
  const LIST = only?.length
    ? SCREENS.filter((x) => only.includes(x.id))
    : SCREENS;
  const fails = [];
  let n = 0,
    renders = 0;
  const keep = { ...st, params: { ...st.params } };
  const t = (ok, where, msg) => {
    n++;
    if (!ok) fails.push({ where, msg });
  };
  setChecking(true);
  const stage = document.getElementById("stage");
  try {
    store.sandbox(() => {
      /* 1. wiring on every render */
      for (const sc of LIST) {
        const states = sc.states ? sc.states.length : 1;
        const combos = [
          ["owner", "mob"],
          ["owner", "tab"],
          ["owner", "web"],
          ...ROLES_WEB.map((r) => [r, "web"]),
        ];
        for (const [role, device] of combos)
          for (let i = 0; i < states; i++) {
            Object.assign(st, {
              id: sc.id,
              role,
              device,
              state: i,
              params: { ...(sc.sample || {}) },
            });
            const where = `${sc.name} · ${role} · ${device}${states > 1 ? ` · ${sc.states[i][0]}` : ""}`;
            render();
            renders++;
            const f = stage.firstElementChild;
            t(
              !stage.textContent.includes("This screen failed to render"),
              where,
              `render error: ${stage.querySelector("pre")?.textContent.slice(0, 160)}`
            );
            for (const el of f.querySelectorAll("[data-go]"))
              t(
                Boolean(screenById(el.dataset.go)),
                where,
                `link to unknown screen "${el.dataset.go}"`
              );
            for (const el of f.querySelectorAll("[data-open]"))
              t(
                Boolean(f.querySelector(`[data-dialog="${el.dataset.open}"]`)),
                where,
                `button opens missing dialog "${el.dataset.open}"`
              );
            for (const el of f.querySelectorAll("[data-do]"))
              t(
                known(el.dataset.do) || Boolean(sc.actions?.[el.dataset.do]),
                where,
                `unknown action "${el.dataset.do}"`
              );
            for (const el of f.querySelectorAll("i[data-lucide]"))
              t(false, where, `unknown icon "${el.dataset.lucide}"`);
            const ids = [...f.querySelectorAll("[id]")].map((e) => e.id);
            t(
              new Set(ids).size === ids.length,
              where,
              `duplicate ids: ${ids.filter((x, k) => ids.indexOf(x) !== k).join(", ")}`
            );
            for (const el of f.querySelectorAll("button, a"))
              t(
                el.textContent.trim() ||
                  el.getAttribute("aria-label") ||
                  el.title,
                where,
                `${el.tagName.toLowerCase()} without a name: ${el.outerHTML.slice(0, 80)}`
              );
            for (const el of f.querySelectorAll(
              "input:not([type=hidden]):not(.sr-only), select, textarea"
            ))
              t(
                el.name ||
                  el.dataset.ui ||
                  el.getAttribute("aria-label") ||
                  el.dataset.globalSearch !== undefined ||
                  el.id,
                where,
                `control without a name: ${el.outerHTML.slice(0, 80)}`
              );
            const ctx = makeCtx();
            for (const el of f.querySelectorAll(
              "aside [data-page], [data-tabs] [data-go], nav[aria-label=Groups] [data-go]"
            ))
              t(
                canSee(ctx, screenById(el.dataset.go)),
                where,
                `${role} is offered "${el.dataset.go}" but may not open it`
              );
            if (role === "superadmin")
              t(
                !f.querySelector(
                  '[data-app] [data-need]:not([aria-disabled="true"])'
                ),
                where,
                "Super-admin has an enabled action"
              );
            if (sc.area !== "Portal")
              t(
                !/\b(estimate|quotation)\b|QT-\d/i.test(f.textContent),
                where,
                "glossary: estimate, quotation or a QT- number"
              );
          }
      }
      /* 2. each screen's own checks: check(t, h) with h.at(id, params, role) rendering a screen and returning its root */
      const at = (
        id,
        params = {},
        role = "owner",
        device = "web",
        state = 0
      ) => {
        Object.assign(st, { id, role, device, state, params });
        render();
        return stage.firstElementChild;
      };
      for (const sc of LIST)
        for (const c of sc.checks || []) {
          const where = `${sc.name} · checks`;
          try {
            /* each check gets a fresh copy of the default data */
            store.sandbox(() =>
              c((ok, msg) => t(ok, where, msg), {
                at,
                s: store.get(),
                biz,
                makeCtx,
              })
            );
          } catch (e) {
            t(false, where, `check crashed: ${e.message}`);
          }
        }
    });
    /* 3. business flows, each on a fresh copy */
    for (const [name, fn] of FLOWS) {
      try {
        store.sandbox(() =>
          fn((ok, msg) => t(ok, `Flow · ${name}`, msg), store.get())
        );
      } catch (e) {
        t(false, `Flow · ${name}`, `crashed: ${e.message}`);
      }
    }
  } finally {
    setChecking(false);
    Object.assign(st, keep);
    render();
  }
  report(fails, n, renders);
  return { fails, n, renders };
}

/* ---------- business flows ---------- */
const OWNER = (s) => ({ role: "owner", memberId: s.meta.people.owner });
const MANAGER = (s) => ({ role: "manager", memberId: s.meta.people.manager });
const STAFF = (s) => ({ role: "staff", memberId: s.meta.people.staff });
const throws = (fn) => {
  try {
    fn();
    return "";
  } catch (e) {
    return e.message || "error";
  }
};
const fresh = (s) => s; // flows mutate the sandbox copy directly

const FLOWS = [
  [
    "quoted lead → reply → paid → INV",
    (t, s0) => {
      const s = fresh(s0);
      const piNext = s.workspace.numbering.PI.next,
        invNext = s.workspace.numbering.INV.next;
      const { lead } = biz.leads.create(
        s,
        {
          name: "Test Person",
          phone: "9800000001",
          type: "quoted",
          brief: "Hair spa for two",
          lines: [{ name: "Hair spa", qty: 2, rate: 1500 }],
        },
        OWNER(s)
      );
      t(lead.status === "new", "a new lead starts New");
      const { invoice } = biz.leads.accept(s, { id: lead.id }, OWNER(s));
      t(
        invoice.piNumber?.endsWith(String(piNext).padStart(4, "0")),
        "accept gives the next PI- number"
      );
      t(
        lead.status === "replied",
        "a shared reply makes the lead Replied (D66)"
      );
      t(
        biz.invoices.statusOf(s, invoice) === "awaiting",
        "an unpaid reply is Awaiting payment, not Due (D75)"
      );
      t(
        !biz.invoices.isOwed(s, invoice),
        "an unpaid reply is not money owed (D75)"
      );
      const total = biz.invoices.total(s, invoice);
      t(
        throws(() =>
          biz.payments.record(
            s,
            { invoiceId: invoice.id, amount: total + 1, method: "cash" },
            STAFF(s)
          )
        ).includes("more than"),
        "a payment above the open balance is refused (D76)"
      );
      t(
        throws(() =>
          biz.payments.record(
            s,
            { invoiceId: invoice.id, amount: total, method: "upi" },
            STAFF(s)
          )
        ).includes("proof"),
        "UPI needs proof"
      );
      const { payment } = biz.payments.record(
        s,
        {
          invoiceId: invoice.id,
          amount: total,
          method: "upi",
          proof: { name: "gpay.jpg" },
        },
        STAFF(s)
      );
      t(
        biz.invoices.statusOf(s, invoice) === "pending",
        "a recorded payment waits for approval"
      );
      biz.payments.approve(s, { id: payment.id }, OWNER(s));
      t(
        invoice.invNumber?.endsWith(String(invNext).padStart(4, "0")),
        "approval gives the next INV- number (D60, D71)"
      );
      t(
        biz.invoices.statusOf(s, invoice) === "paid",
        "approved in full is Paid"
      );
      t(
        lead.status === "paid",
        "the lead is Paid when every invoice is paid (D72)"
      );
      t(
        s.outbox.some((m) => m.templateId === 15),
        "payment received message is in the outbox"
      );
    },
  ],
  [
    "approval rules (D57, D74)",
    (t, s) => {
      const lim = s.workspace.approvals.managerLimit;
      const { lead } = biz.leads.create(
        s,
        {
          name: "Rule Test",
          phone: "9800000002",
          type: "quoted",
          brief: "x",
          lines: [{ name: "Big job", qty: 1, rate: lim }],
        },
        OWNER(s)
      );
      const { invoice } = biz.leads.accept(s, { id: lead.id }, OWNER(s));
      const total = biz.invoices.total(s, invoice);
      const { payment } = biz.payments.record(
        s,
        { invoiceId: invoice.id, amount: total, method: "cash" },
        STAFF(s)
      );
      t(
        throws(() =>
          biz.payments.approve(s, { id: payment.id }, MANAGER(s))
        ).includes("below"),
        "a Manager cannot approve at or above the limit (strictly below, D74)"
      );
      t(
        throws(() => biz.payments.approve(s, { id: payment.id }, STAFF(s))) !==
          "",
        "Staff cannot approve"
      );
      const own = biz.payments.record(
        s,
        {
          invoiceId: biz.leads.accept(
            s,
            {
              id: biz.leads.create(
                s,
                {
                  name: "Own Up",
                  phone: "9800000003",
                  type: "quoted",
                  brief: "y",
                  lines: [{ name: "Small", qty: 1, rate: 100 }],
                },
                OWNER(s)
              ).lead.id,
            },
            OWNER(s)
          ).invoice.id,
          amount: 100,
          method: "cash",
        },
        MANAGER(s)
      ).payment;
      t(
        throws(() =>
          biz.payments.approve(s, { id: own.id }, MANAGER(s))
        ).includes("Someone else"),
        "the uploader cannot approve when another approver exists (D74)"
      );
    },
  ],
  [
    "expired and rejected cannot be paid (D73, D75)",
    (t, s) => {
      const { lead } = biz.leads.create(
        s,
        {
          name: "Late Payer",
          phone: "9800000004",
          type: "quoted",
          brief: "z",
          lines: [{ name: "Manicure", qty: 1, rate: 700 }],
        },
        OWNER(s)
      );
      const { invoice } = biz.leads.accept(s, { id: lead.id }, OWNER(s));
      invoice.payBy = "2000-01-01";
      t(
        biz.invoices.statusOf(s, invoice) === "expired",
        "past pay-by a reply is Expired, not Overdue (D75)"
      );
      t(
        !biz.payments.payable(s, invoice).ok,
        "an expired reply cannot be paid (D73)"
      );
      const r = biz.leads.create(
        s,
        { name: "Declined", phone: "9800000005", type: "quoted", brief: "w" },
        OWNER(s)
      ).lead;
      biz.leads.reject(s, { id: r.id, reason: "Not available" }, OWNER(s));
      t(
        r.status === "rejected" && s.outbox[0].templateId === 18,
        "reject sends Request declined (18, D61)"
      );
    },
  ],
  [
    "board moves (D65)",
    (t, s) => {
      const quoted = s.leads.find(
        (l) => l.type === "quoted" && biz.board.columnOf(s, l) === "new"
      );
      if (quoted)
        t(
          throws(() =>
            biz.board.move(s, { id: quoted.id, to: "paid" }, OWNER(s))
          ).includes("approved payment"),
          "nothing is dragged into Paid"
        );
      if (quoted)
        t(
          throws(() =>
            biz.board.move(s, { id: quoted.id, to: "replied" }, OWNER(s))
          ).includes("Accept"),
          "a quoted lead needs a reply, not a drag"
        );
      const booked = s.leads.find(
        (l) =>
          l.type === "booked" &&
          biz.board.columnOf(s, l) === "new" &&
          (l.assigneeId || s.bookings.find((b) => b.leadId === l.id)?.memberId)
      );
      if (booked) {
        biz.board.move(s, { id: booked.id, to: "booked" }, OWNER(s));
        t(
          biz.board.columnOf(s, booked) === "booked",
          "a booked lead dragged to Booked is confirmed (Agreed)"
        );
      }
      t(Boolean(quoted || booked), "sample has a lead in New to test with");
    },
  ],
  [
    "advance then balance on a quoted lead (D70)",
    (t, s) => {
      const lead = s.leads.find(
        (l) => l.type === "quoted" && ["new", "contacted"].includes(l.status)
      );
      t(Boolean(lead), "sample has an open quoted lead");
      if (!lead) return;
      const lines = [
        { name: "Work A", qty: 1, rate: 10000, gst: 18 },
        { name: "Work B", qty: 2, rate: 2500, gst: 5 },
      ];
      biz.leads.accept(s, { id: lead.id, lines, advancePct: 50 }, OWNER(s));
      const adv = biz.invoices
        .ofLead(s, lead.id)
        .find((i) => i.kind === "advance");
      const ta = adv && biz.invoices.totals(s, adv);
      t(
        Boolean(adv) && ta.subtotal === 7500 && adv.piNumber,
        "a 50% advance reply is an advance proforma for half (each line keeps its GST rate)"
      );
      const b = biz.bookings.create(
        s,
        {
          leadId: lead.id,
          customerId: lead.customerId,
          memberId: s.meta.people.owner,
          start: "2027-01-05T09:00",
          minutes: 60,
        },
        OWNER(s)
      ).booking;
      biz.bookings.confirm(s, { id: b.id }, OWNER(s));
      const job = biz.bookings.start(s, { bookingId: b.id }, OWNER(s)).job;
      biz.bookings.done(s, { jobId: job.id }, OWNER(s));
      const bal = biz.bookings.bill(s, { jobId: job.id }, OWNER(s)).invoice;
      const tb = biz.invoices.totals(s, bal);
      t(
        bal.kind === "balance" &&
          ta.subtotal + tb.subtotal === 15000 &&
          Math.abs(ta.tax + tb.tax - (1800 + 250)) <= 1,
        "advance + balance = the full price and the full GST, nothing taxed twice"
      );
    },
  ],
  [
    "part paid (D55) and only the Owner cancels an issued invoice",
    (t, s) => {
      const inv = biz.invoices.create(
        s,
        {
          kind: "bill",
          customerId: s.customers[0].id,
          lines: [{ name: "X", qty: 1, rate: 1000, gst: 0 }],
        },
        OWNER(s)
      );
      biz.invoices.share(s, { id: inv.id }, OWNER(s));
      t(
        throws(() =>
          biz.invoices.cancel(s, { id: inv.id }, MANAGER(s))
        ).includes("cannot"),
        "a Manager cannot cancel an issued invoice"
      );
      const pay = biz.payments.record(
        s,
        { invoiceId: inv.id, amount: 400, method: "cash" },
        MANAGER(s)
      ).payment;
      biz.payments.approve(s, { id: pay.id }, OWNER(s));
      t(
        biz.invoices.statusOf(s, inv) === "part_paid" &&
          biz.invoices.isOwed(s, inv),
        "a bill with some approved and some due is Part paid and still owed"
      );
    },
  ],
  [
    "opening hours and slots (D97, D99)",
    (t, s) => {
      const H = (open, r) => ({ open, ranges: r.map(([from, to]) => ({ from, to })) });
      t(
        throws(() =>
          biz.settings.saveHours(s, { hours: { mon: H(true, [["10:00", "09:00"]]) } }, OWNER(s))
        ).includes("end after"),
        "a range must end after it starts"
      );
      t(
        throws(() =>
          biz.settings.saveHours(
            s,
            { hours: { mon: H(true, [["09:00", "13:00"], ["12:00", "18:00"]]) } },
            OWNER(s)
          )
        ).includes("second range"),
        "the second range starts after the first ends"
      );
      t(
        throws(() => biz.settings.saveHours(s, { hours: {} }, MANAGER(s))).includes("cannot"),
        "only the Owner sets opening hours"
      );
      biz.settings.saveHours(
        s,
        { hours: { mon: H(true, [["09:00", "13:00"], ["16:00", "20:00"]]) } },
        OWNER(s)
      );
      const sl = biz.settings.slotsFor(s, "2026-10-19", 120); // a Monday
      t(
        sl[0] === "09:00" && sl.includes("11:00") && !sl.includes("11:30") &&
          sl.includes("16:00") && sl.at(-1) === "18:00",
        "slots every 30 min and the package ends inside a range"
      );
      t(biz.settings.slotsFor(s, "2026-10-20", 60).length === 0, "a day with no range is closed");
    },
  ],
  [
    "customer ticks optional lines (D102)",
    (t, s) => {
      const inv = biz.invoices.create(
        s,
        {
          kind: "reply",
          customerId: s.customers[0].id,
          lines: [
            { name: "Main", qty: 1, rate: 1000, gst: 0 },
            { name: "Extra", qty: 1, rate: 500, gst: 0, optional: true, selected: false },
          ],
        },
        OWNER(s)
      );
      biz.invoices.share(s, { id: inv.id }, OWNER(s));
      const C = { role: null, memberId: null, customer: true, today: s.meta.today };
      biz.invoices.chooseOptional(s, { id: inv.id, index: 1, on: true }, C);
      t(biz.invoices.total(s, inv) === 1500, "ticking an optional line adds it to the total");
      biz.payments.record(s, { invoiceId: inv.id, amount: 1500, method: "cash" }, MANAGER(s));
      t(
        throws(() => biz.invoices.chooseOptional(s, { id: inv.id, index: 1, on: false }, C)).includes(
          "fixed"
        ),
        "the choice is fixed once a payment is made"
      );
    },
  ],
  [
    "IGST from the customer's GSTIN state",
    (t, s) => {
      s.workspace.gstin ||= "27AAKFG4821M1Z3";
      s.workspace.stateCode = s.workspace.gstin.slice(0, 2);
      const c = s.customers[0];
      c.gstin = "29ABCDE1234F1Z5";
      const inv = biz.invoices.create(
        s,
        {
          kind: "bill",
          customerId: c.id,
          lines: [{ name: "X", qty: 1, rate: 1000, gst: 18 }],
        },
        OWNER(s)
      );
      const tt = biz.invoices.totals(s, inv);
      t(tt.igst === 180 && tt.cgst === 0, "out-of-state GSTIN gives IGST");
      c.gstin = "";
      const t2 = biz.invoices.totals(s, inv);
      t(t2.cgst + t2.sgst === 180 && t2.igst === 0, "no GSTIN: CGST + SGST");
    },
  ],
  [
    "numbering is gap-free (D71)",
    (t, s) => {
      const next = s.workspace.numbering.INV.next;
      t(
        throws(() =>
          biz.settings.saveNumbering(s, { INV_next: next - 1 }, OWNER(s))
        ).includes("cannot go below"),
        "the next INV number cannot go down"
      );
      t(
        throws(() =>
          biz.settings.saveNumbering(s, { PI_prefix: "INV" }, OWNER(s))
        ).includes("differ"),
        "PI and INV prefixes must differ"
      );
    },
  ],
];

function report(fails, n, renders) {
  const r = document.getElementById("report");
  r.hidden = false;
  r.innerHTML = `<div class="flex items-center gap-2 h-header px-4 border-b border-border">${I("list-checks", "size-icon")}<h2 class="text-title font-semibold">Prototype checks</h2><button class="ml-auto btn btn-ghost btn-sm btn-icon" data-x aria-label="Close">${I("x")}</button></div>
  <div class="p-4 overflow-y-auto"><p class="text-title font-semibold ${fails.length ? "text-destructive" : "text-success"}">${fails.length ? `${fails.length} failed` : "All passed"}</p>
  <p class="text-muted-foreground">${SCREENS.length} screens · ${renders} renders (every state; Owner on phone, tablet and web, other roles on web) · ${n} checks</p>
  ${fails.length ? `<ul class="mt-3 space-y-2">${fails.map((f) => `<li class="rounded-control border border-border p-2"><p class="font-medium">${esc(f.where)}</p><p class="text-muted-foreground">${esc(f.msg)}</p></li>`).join("")}</ul>` : `<p class="mt-2">Nothing to fix.</p>`}</div>`;
  r.querySelector("[data-x]").onclick = () => (r.hidden = true);
  lucide.createIcons({ nodes: [r] });
}
