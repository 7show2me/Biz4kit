import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@Biz4kit/ui/components/dialog";
import { Input } from "@Biz4kit/ui/components/input";
import { useEffect } from "react";

// ⌘K search (WBS 1.5). The shell only opens the box; search results arrive with the
// packages that own the data (leads 3.1, customers 3.4, invoices 2.5).
export function CommandDialog({
  open,
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogTitle>Search</DialogTitle>
        <DialogDescription>
          Type two letters or more to find customers, leads and invoices.
        </DialogDescription>
        <Input
          aria-label="Search customers, leads, invoices"
          autoFocus
          placeholder="Customers, leads, invoices"
          type="search"
        />
      </DialogContent>
    </Dialog>
  );
}
