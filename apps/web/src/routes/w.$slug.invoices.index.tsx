import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/w/$slug/invoices/")({
  component: () => <StubScreen id="invoices" />,
  staticData: { screen: "invoices" },
});
