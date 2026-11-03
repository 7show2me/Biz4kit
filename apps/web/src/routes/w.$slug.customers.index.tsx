import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/w/$slug/customers/")({
  component: () => <StubScreen id="customers" />,
  staticData: { screen: "customers" },
});
