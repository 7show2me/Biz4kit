import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/new/done")({
  component: () => <StubScreen id="done" />,
  staticData: { screen: "done" },
});
