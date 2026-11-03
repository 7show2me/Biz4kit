import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/w/$slug/leads/$id")({
  component: () => <StubScreen id="lead" />,
  staticData: { screen: "lead" },
});
