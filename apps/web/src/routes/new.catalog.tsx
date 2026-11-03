import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/new/catalog")({
  component: () => <StubScreen id="catalog-starter" />,
  staticData: { screen: "catalog-starter" },
});
