import { Button, buttonVariants } from "@Biz4kit/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@Biz4kit/ui/components/card";
import { Input } from "@Biz4kit/ui/components/input";
import { Label } from "@Biz4kit/ui/components/label";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

// Accept invite (screen "invite"). The code's length, characters and expiry are open
// (BIZ-92), so the form checks only that something was entered.
export function InviteAcceptView({
  initialCode = "",
  error,
  pending = false,
  onSubmit,
}: {
  error?: string;
  initialCode?: string;
  onSubmit: (code: string) => void;
  pending?: boolean;
}) {
  const [code, setCode] = useState(initialCode);
  const [empty, setEmpty] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setEmpty(true);
      return;
    }
    setEmpty(false);
    onSubmit(trimmed);
  };

  const message = error ?? (empty ? "Enter your invite code." : undefined);

  return (
    <div className="bg-sidebar tab:items-center flex min-h-svh items-start justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>
            <h1 className="text-heading font-sans font-semibold">
              Join a workspace
            </h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 text-left" onSubmit={submit}>
            <Label htmlFor="invite-code">Invite code</Label>
            <Input
              autoComplete="off"
              id="invite-code"
              onChange={(event) => setCode(event.target.value)}
              value={code}
            />
            {message ? (
              <p className="text-caption text-destructive" role="alert">
                {message}
              </p>
            ) : null}
            <Button disabled={pending} size="lg" type="submit">
              Join workspace
            </Button>
            <Link className={buttonVariants({ variant: "ghost" })} to="/login">
              Not you? Use another Google account
            </Link>
          </form>
          <p className="text-caption text-muted-foreground mt-4">
            By joining on Biz4Kit you agree to our terms and privacy notice.{" "}
            <span className="italic">[Draft, lawyer to finalise]</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
