import { needsReauth } from "@Biz4kit/auth/session-policy";
import { useState } from "react";

import { ReauthDialog } from "@/components/auth/reauth-dialog";
import { TransferOwnership } from "@/components/auth/transfer-ownership";
import { authClient } from "@/lib/auth-client";

const reauth = async () => {
  await authClient.signIn.social({
    callbackURL: window.location.href,
    provider: "google",
  });
};

// Team tab, auth part only: transfer ownership behind a fresh Google sign-in. The member
// list and invites come with the invite service (BIZ-92) and roles (WBS 3.5).
export function TeamPanel() {
  const session = authClient.useSession();
  const [reauthOpen, setReauthOpen] = useState(false);
  const fresh = !needsReauth(session.data?.session.createdAt);

  return (
    <>
      <TransferOwnership
        fresh={fresh}
        members={[]}
        onNeedReauth={() => setReauthOpen(true)}
      />
      <ReauthDialog
        onConfirm={reauth}
        onOpenChange={setReauthOpen}
        open={reauthOpen}
        reason="Transfer ownership"
      />
    </>
  );
}
