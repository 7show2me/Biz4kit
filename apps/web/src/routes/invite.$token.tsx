import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/invite/$token")({
  component: () => <StubScreen id="invite" />,
  staticData: { screen: "invite" },
});
