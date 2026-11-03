import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/i/$token")({
  component: () => <StubScreen id="p-pay" />,
  staticData: { screen: "p-pay" },
});
