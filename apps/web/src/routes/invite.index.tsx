import { createFileRoute } from "@tanstack/react-router";

import { InvitePage } from "@/components/auth/invite-page";

export const Route = createFileRoute("/invite/")({
  component: InvitePage,
  staticData: { screen: "invite" },
});
