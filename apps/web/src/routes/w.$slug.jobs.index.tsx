import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/w/$slug/jobs/")({
  component: () => <StubScreen id="jobs" />,
  staticData: { screen: "jobs" },
});
