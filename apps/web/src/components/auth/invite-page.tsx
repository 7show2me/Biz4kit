import { useState } from "react";

import { InviteAcceptView } from "./invite-accept-view";

// Joining with a code needs the invite service (POST /invites/claim, prep Architecture).
// It is not built in this shell, so the page says so and sends nothing.
export function InvitePage({ initialCode }: { initialCode?: string }) {
  const [error, setError] = useState<string>();
  return (
    <InviteAcceptView
      error={error}
      initialCode={initialCode}
      onSubmit={() =>
        setError("Joining with a code is not connected to the server yet.")
      }
    />
  );
}
