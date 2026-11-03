import { Button } from "@Biz4kit/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@Biz4kit/ui/components/dialog";

// Re-auth before billing and delete: a session older than 15 minutes signs in again
// with Google first (prep/Architecture & contracts.md, WBS 1.3).
export function ReauthDialog({
  open,
  onOpenChange,
  onConfirm,
  reason,
  pending = false,
}: {
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  pending?: boolean;
  reason: string;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogTitle>Sign in again</DialogTitle>
        <DialogDescription>
          {reason} needs a recent sign-in. Continue with Google to confirm it is
          you.
        </DialogDescription>
        <Button disabled={pending} onClick={onConfirm} size="lg">
          Continue with Google
        </Button>
      </DialogContent>
    </Dialog>
  );
}
