import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/w/$slug/customers/$id")({
  component: () => <StubScreen id="customer" />,
  staticData: { screen: "customer" },
});
