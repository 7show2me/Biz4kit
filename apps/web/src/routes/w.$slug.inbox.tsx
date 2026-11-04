import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/w/$slug/inbox")({
  component: () => <StubScreen id="inbox" />,
  staticData: { screen: "inbox" },
});
