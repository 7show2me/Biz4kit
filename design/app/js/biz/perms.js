/* Who may do what (prep/Design inputs.md roles; D57, D74). Super-admin is a read-only support view. */
import { fail } from "../core/util.js";

export const ROLES = {
  superadmin: "Super-admin",
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
  accountant: "Accountant",
};

const RULES = {
  write: (r) => ["owner", "manager", "staff"].includes(r),
  assign: (r) => ["owner", "manager"].includes(r),
  catalog: (r) => ["owner", "manager"].includes(r),
  settings: (r) => r === "owner",
  export: (r) => ["owner", "accountant"].includes(r),
  /* Accountant is read-only plus export (D91) */
  record: (r) => ["owner", "manager", "staff"].includes(r),
  approve: (r) => ["owner", "manager"].includes(r),
  /* cancel an issued (numbered) invoice: Owner only (prep/Design inputs.md:177) */
  void: (r) => r === "owner",
};

export const can = (role, what) => (RULES[what] ? RULES[what](role) : false);

/* Throws a readable reason when the role may not do it. */
export const need = (ctx, what) => {
  if (ctx.role === "superadmin") fail("Support view is read-only.");
  if (!can(ctx.role, what))
    fail(`${ROLES[ctx.role]} cannot do this. Ask the Owner.`);
};
