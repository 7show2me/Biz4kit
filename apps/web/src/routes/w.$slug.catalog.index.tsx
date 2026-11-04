import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/w/$slug/catalog/")({
  component: () => <StubScreen id="catalog" />,
  staticData: { screen: "catalog" },
});
