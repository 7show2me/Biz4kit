import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/me/$token")({
  component: () => <StubScreen id="p-orders" />,
  staticData: { screen: "p-orders" },
});
