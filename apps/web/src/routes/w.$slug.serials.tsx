import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/w/$slug/serials")({
  component: () => <StubScreen id="serials" />,
  staticData: { screen: "serials" },
});
