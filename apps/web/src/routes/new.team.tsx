import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/new/team")({
  component: () => <StubScreen id="team" />,
  staticData: { screen: "team" },
});
