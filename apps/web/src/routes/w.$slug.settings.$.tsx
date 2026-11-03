import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/w/$slug/settings/$")({
  component: () => <StubScreen id="settings" />,
  staticData: { screen: "settings" },
});
