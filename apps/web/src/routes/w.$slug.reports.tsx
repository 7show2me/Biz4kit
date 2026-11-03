import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/w/$slug/reports")({
  component: () => <StubScreen id="reports" />,
  staticData: { screen: "reports" },
});
