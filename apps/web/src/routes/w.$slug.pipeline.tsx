import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/w/$slug/pipeline")({
  component: () => <StubScreen id="board" />,
  staticData: { screen: "board" },
});
