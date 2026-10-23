import { ROLES } from "../biz/perms.js";
/* AUTH: Sign in and Accept invite (reference implementation for the other screen files).
   Pattern: render(ctx) returns HTML from ctx.s; buttons use data-do (a biz function or a screen action);
   forms use <form data-do> and real inputs; screen actions receive (ctx, args) and use ctx.biz. */
import { esc } from "../core/util.js";
import { call } from "../ui/actions.js";
import { I, C, M, av, link, lockup, modal, pill, inr } from "../ui/kit.js";
import { bizLogo } from "../ui/shell.js";

const googleG = `<svg class="size-icon" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

const roleOfMember = (s, m) =>
  Object.entries(s.meta.people).find(([, id]) => id === m.id)?.[0] || m.role;

export default [
  {
    n: 1,
    area: "Auth",
    id: "login",
    name: "Sign in",
    route: "/login",
    action: "Continue with Google",
    who: "Owner, Staff",
    notes:
      "Biz4Kit brand in full; Google is the only sign-in; invite-code fallback (1.3). Prototype: pick the account to sign in as.",
    render: (ctx) => {
      const s = ctx.s;
      const paid =
        s.invoices.find((i) => i.invNumber && i.lines.length > 1) ||
        s.invoices.find((i) => i.invNumber);
      const lines = paid ? paid.lines.slice(0, 3) : [];
      const total = paid ? ctx.biz.invoices.total(s, paid) : 0;
      const accounts = s.members.filter((m) => m.status === "active");
      return `<div class="h-full overflow-y-auto grid @web:grid-cols-2 bg-background">
    <div class="flex flex-col items-center justify-center text-center px-6 @tab:px-20 py-10">
      ${lockup("h-8")}
      <h1 class="mt-10 font-serif text-heading @tab:text-display-lg font-bold">Reply, book, invoice, get paid.</h1>
      <p class="mt-1 font-serif text-title @tab:text-heading text-muted-foreground">Under your own name.</p>
      <button type="button" data-open="google" class="mt-8 btn btn-lg btn-outline w-full @tab:w-80">${googleG}Continue with Google</button>
      <a ${link("invite")} class="mt-2 btn btn-ghost w-full @tab:w-80">I have an invite code</a>
      <a ${link("new")} class="mt-1 btn btn-ghost w-full @tab:w-80 text-muted-foreground">Start a new business</a>
      <p class="mt-10 @tab:w-80 text-caption text-muted-foreground">By continuing you agree to the Biz4Kit terms and privacy notice.</p>
    </div>
    <div class="hidden @web:flex bg-primary text-primary-foreground items-center justify-center p-12">
      <div class="w-full max-w-sm">
        <div class="card p-card shadow-lg text-card-foreground">
          <div class="flex items-center justify-between">${bizLogo(s, "h-6")}${paid ? C(paid.invNumber) : ""}</div>
          <div class="mt-4 space-y-1.5">${lines.map((l) => `<div class="flex justify-between"><span>${esc(l.name)}</span>${M(l.qty * l.rate)}</div>`).join("")}</div>
          <div class="mt-3 pt-3 border-t border-border flex justify-between items-center"><span class="font-medium">Total incl. GST</span><span class="font-mono text-money-lg">${inr(total)}</span></div>
          <div class="mt-3">${pill("paid")}</div>
        </div>
        <p class="mt-4 text-body">Your customer sees your logo and your colours. Never ours.</p>
      </div>
    </div>
    ${modal(
      "google",
      "Choose an account",
      `<p class="text-muted-foreground">Prototype: pick who signs in. Each person sees what their role allows.</p>
      <ul class="mt-3 divide-y divide-border rounded-control border border-border">${accounts
        .map(
          (m) =>
            `<li><button type="button" class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted text-left" data-do="signIn" data-a-id="${m.id}">${av(m.initials, "bg-secondary text-secondary-foreground")}<span class="min-w-0 flex-1"><span class="block font-medium truncate">${esc(m.name)}</span><span class="block text-caption text-muted-foreground truncate">${esc(m.email)}</span></span><span class="chip">${ROLES[roleOfMember(s, m)]}</span></button></li>`
        )
        .join("")}</ul>`
    )}
  </div>`;
    },
    actions: {
      /* Switch the viewer to that person's role and open Today. */
      signIn: (ctx, { id }) => {
        const m = ctx.s.members.find((x) => x.id === id);
        const role = roleOfMember(ctx.s, m);
        if (ctx.s.meta.people[role] !== m.id)
          call(
            `Sign in as ${m.name}`,
            (s) => (
              (s.meta.people[role] = m.id),
              { text: `${m.name} signed in` }
            ),
            ctx
          );
        ctx.setRole(role);
        return {
          text: `Signed in as ${m.name} (${ROLES[role]})`,
          go: ["dashboard"],
        };
      },
    },
    checks: [
      (t, h) => {
        const f = h.at("login");
        t(
          f.querySelectorAll('[data-dialog="google"] [data-do="signIn"]')
            .length === h.s.members.filter((m) => m.status === "active").length,
          "every active member can sign in"
        );
      },
    ],
  },
  {
    n: 2,
    area: "Auth",
    id: "invite",
    name: "Accept invite",
    route: "/invite/:token",
    action: "Join workspace",
    who: "Staff",
    notes:
      "Shows the role before joining. Consent line is the Legal & compliance draft, lawyer to finalise (3.11).",
    render: (ctx) => {
      const s = ctx.s;
      const m =
        (ctx.params.id && s.members.find((x) => x.id === ctx.params.id)) ||
        s.members.find((x) => x.status === "invited");
      const owner = s.members.find((x) => x.role === "owner");
      const CAN = {
        manager: [
          "Assign leads and run the calendar",
          "Reply to leads and create invoices",
          "Approve payments below the Owner's limit, when turned on",
        ],
        staff: [
          "See and run your own bookings and jobs",
          "Reply to leads and create invoices",
          "Upload payment proof",
        ],
        accountant: [
          "See invoices and payments",
          "Record payments and upload proof",
          "Export reports",
        ],
      };
      return `<div class="h-full overflow-y-auto flex items-start @tab:items-center justify-center bg-sidebar p-4">
    <div class="card w-full max-w-md p-card @tab:p-page text-center shadow-lg">
      <div class="mx-auto w-fit bg-sidebar-primary rounded-control px-2 py-1.5">${bizLogo(s, "h-7")}</div>
      ${
        m
          ? `<h1 class="mt-4 font-sans text-heading font-semibold">Join ${esc(s.workspace.name)}</h1>
      <p class="mt-1 text-muted-foreground">${esc(owner?.name || "The Owner")} invited <span class="font-medium text-foreground">${esc(m.email)}</span> as <span class="font-medium text-foreground">${ROLES[m.role]}</span>.</p>
      <ul class="mt-4 text-left space-y-1.5 bg-muted rounded-control p-3">${(CAN[m.role] || CAN.staff).map((x) => `<li class="flex gap-2">${I("check", "size-icon text-success")}${x}</li>`).join("")}</ul>
      <button type="button" data-do="join" data-a-id="${m.id}" class="mt-4 btn btn-primary btn-lg w-full">Join workspace</button>
      <a ${link("login")} class="mt-1 btn btn-ghost w-full">Not you? Use another Google account</a>`
          : `<h1 class="mt-4 font-sans text-heading font-semibold">No open invites</h1><p class="mt-1 text-muted-foreground">Everyone invited has joined. Invite someone in Settings → Team.</p><a ${link("login")} class="mt-4 btn btn-outline w-full">Back to sign in</a>`
      }
      <p class="mt-4 text-caption text-muted-foreground">By joining ${esc(s.workspace.name)} on Biz4Kit you agree to our terms and privacy notice. <span class="italic">Draft, lawyer to finalise.</span></p>
    </div>
  </div>`;
    },
    actions: {
      join: (ctx, { id }) => {
        const out = call(
          "Accept invite",
          (s, c) => ctx.biz.settings.acceptInvite(s, { id }, c),
          ctx
        );
        const m = ctx.s.members.find((x) => x.id === id) || {};
        call(
          `${m.name} signs in`,
          (s) => (
            (s.meta.people[m.role] = id),
            { text: `${m.name} signed in` }
          ),
          ctx
        );
        ctx.setRole(m.role);
        return { ...out, go: ["dashboard"] };
      },
    },
  },
];
