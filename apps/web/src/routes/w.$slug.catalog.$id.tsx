import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/w/$slug/catalog/$id")({
  component: () => <StubScreen id="item" />,
  staticData: { screen: "item" },
});
