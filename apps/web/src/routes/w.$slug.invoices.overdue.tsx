import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/w/$slug/invoices/overdue")({
  component: () => <StubScreen id="overdue" />,
  staticData: { screen: "overdue" },
});
