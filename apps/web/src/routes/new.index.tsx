import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/new/")({
  component: () => <StubScreen id="new" />,
  staticData: { screen: "new" },
});
