import { createFileRoute } from "@tanstack/react-router";

import { InvitePage } from "@/components/auth/invite-page";

export const Route = createFileRoute("/invite/$token")({
  component: InviteWithToken,
  staticData: { screen: "invite" },
});

function InviteWithToken() {
  const { token } = Route.useParams();
  return <InvitePage initialCode={token} />;
}
