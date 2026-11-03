import { Button } from "@Biz4kit/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@Biz4kit/ui/components/card";
import { Label } from "@Biz4kit/ui/components/label";
import { KeyRound } from "lucide-react";
import { useState } from "react";

export interface TransferCandidate {
  id: string;
  name: string;
  role: string;
}

// Transfer ownership (Settings > Team). The Owner signs in again first. Who may receive
// ownership, whether they must accept, and what the old Owner becomes are open
// (BIZ-93), so this screen sends nothing yet.
export function TransferOwnership({
  members,
  fresh,
  onNeedReauth,
}: {
  fresh: boolean;
  members: readonly TransferCandidate[];
  onNeedReauth: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer ownership</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground">
            You sign in again with Google first.
          </p>
          {open ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-owner">New Owner</Label>
              <select
                className="h-control-md border-input bg-background rounded-sm border px-2"
                defaultValue=""
                id="new-owner"
              >
                <option value="">Choose a member</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
              <p className="text-caption text-muted-foreground">
                The transfer rules are not decided yet (BIZ-93), so nothing is
                sent from here.
              </p>
            </div>
          ) : (
            <Button
              onClick={() => (fresh ? setOpen(true) : onNeedReauth())}
              variant="outline"
            >
              <KeyRound aria-hidden="true" />
              Transfer
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
