import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/w/$slug/jobs/$id")({
  component: () => <StubScreen id="job" />,
  staticData: { screen: "job" },
});
