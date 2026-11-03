import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/wc/$token")({
  component: () => <StubScreen id="p-warranty" />,
  staticData: { screen: "p-warranty" },
});
