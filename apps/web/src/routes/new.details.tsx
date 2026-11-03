import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/new/details")({
  component: () => <StubScreen id="details" />,
  staticData: { screen: "details" },
});
