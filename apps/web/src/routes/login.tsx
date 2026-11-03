import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { SignInView } from "@/components/auth/sign-in-view";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  staticData: { screen: "login" },
});

function LoginPage() {
  const [pending, setPending] = useState(false);

  const signInWithGoogle = async () => {
    setPending(true);
    // Where a signed-in user lands is decided once workspaces exist (WBS 1.4).
    const { error } = await authClient.signIn.social({
      callbackURL: `${window.location.origin}/`,
      provider: "google",
    });
    if (error) {
      setPending(false);
      toast.error(error.message ?? "Google sign-in failed.");
    }
  };

  return <SignInView onGoogle={signInWithGoogle} pending={pending} />;
}
