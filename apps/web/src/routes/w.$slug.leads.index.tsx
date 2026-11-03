import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/w/$slug/leads/")({
  component: () => <StubScreen id="leads" />,
  staticData: { screen: "leads" },
});
