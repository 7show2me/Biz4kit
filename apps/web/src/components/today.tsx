import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@Biz4kit/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@Biz4kit/ui/components/empty";

import type { Role } from "@/lib/nav";

// Quick Cashflow, money in only in Phase 1 (D77).
const MONEY_IN = ["To collect", "Overdue", "To approve", "Collected"] as const;

// First-run checklist (D87), the steps of the locked prototype (settings.js).
export const SETUP_STEPS = [
  {
    label: "Business details",
    sub: "Phone, address and UPI or bank for payments",
  },
  { label: "Brand", sub: "Logo or colours for your pages and invoices" },
  { label: "Catalog", sub: "At least 3 items" },
  { label: "Team", sub: "Invite someone (optional)" },
  {
    label: "Share your price list",
    sub: "Send the catalog link (ready message 1)",
  },
  { label: "First reply", sub: "Price a request and share it" },
] as const;

const canSeeMoney = (role: Role) =>
  role === "owner" ||
  role === "superadmin" ||
  role === "manager" ||
  role === "accountant";

// Today: the dashboard shell. Figures stay "—" until the packages that own the data
// land (money 2.6, leads 3.1); nothing here is sample data.
export function Today({ memberRole }: { memberRole: Role }) {
  const showSetup = memberRole === "owner" || memberRole === "superadmin";
  return (
    <div className="tab:p-page flex flex-col gap-3 p-4">
      {canSeeMoney(memberRole) ? (
        <section
          aria-label="Money in"
          className="web:grid-cols-4 grid grid-cols-2 gap-3"
        >
          {MONEY_IN.map((label) => (
            <Card key={label} size="sm">
              <CardHeader>
                <CardTitle>
                  <h2>{label}</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-money-lg font-mono">—</p>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      {showSetup ? (
        <section aria-label="Get set up">
          <Card>
            <CardHeader>
              <CardTitle>Get set up</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="tab:grid-cols-2 web:grid-cols-3 grid gap-2">
                {SETUP_STEPS.map((step, index) => (
                  <li className="flex items-start gap-2" key={step.label}>
                    <span className="size-control-xs rounded-pill bg-muted text-caption text-muted-foreground flex shrink-0 items-center justify-center font-semibold">
                      {index + 1}
                    </span>
                    <span className="leading-tight">
                      <span className="block font-medium">{step.label}</span>
                      <span className="text-caption text-muted-foreground block">
                        {step.sub}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section aria-label="Needs your reply">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Nothing to reply to yet</EmptyTitle>
            <EmptyDescription>
              New requests from your customers show here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </section>
    </div>
  );
}
