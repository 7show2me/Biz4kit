import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/book/$package")({
  component: () => <StubScreen id="p-book" />,
  staticData: { screen: "p-book" },
});
