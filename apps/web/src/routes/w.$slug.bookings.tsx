import { createFileRoute } from "@tanstack/react-router";

import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/w/$slug/bookings")({
  component: () => <StubScreen id="bookings" />,
  staticData: { screen: "bookings" },
});
