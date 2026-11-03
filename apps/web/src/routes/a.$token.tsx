import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/a/$token")({
  component: () => <StubScreen id="approve-link" />,
  staticData: { screen: "approve-link" },
});
