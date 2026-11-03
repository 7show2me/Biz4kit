import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/w/$slug/packages")({
  component: () => <StubScreen id="packages" />,
  staticData: { screen: "packages" },
});
