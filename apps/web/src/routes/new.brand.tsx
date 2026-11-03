import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/new/brand")({
  component: () => <StubScreen id="brand" />,
  staticData: { screen: "brand" },
});
