import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/w/$slug/invoices/$id")({
  component: () => <StubScreen id="invoice" />,
  staticData: { screen: "invoice" },
});
