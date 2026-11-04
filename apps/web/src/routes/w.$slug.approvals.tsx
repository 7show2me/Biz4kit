import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/w/$slug/approvals")({
  component: () => <StubScreen id="approvals" />,
  staticData: { screen: "approvals" },
});
