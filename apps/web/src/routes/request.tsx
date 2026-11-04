import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/request")({
  component: () => <StubScreen id="p-request" />,
  staticData: { screen: "p-request" },
});
