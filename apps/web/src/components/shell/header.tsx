import { BrandMark } from "@Biz4kit/ui/components/brand-mark";
import { Button } from "@Biz4kit/ui/components/button";
import { Bell, CircleHelp, Search } from "lucide-react";

import { NavLink } from "./nav-link";

// Header bar: page title, search (⌘K) and the bell, which opens the notification
// inbox (D87). The simulated outbox of the prototype is not part of the product.
export function Header({
  title,
  inboxHref,
  unreadCount,
  onSearch,
}: {
  inboxHref: string;
  onSearch: () => void;
  title: string;
  unreadCount: number;
}) {
  return (
    <header className="h-header border-border tab:px-page flex shrink-0 items-center gap-3 border-b px-4">
      <span className="tab:hidden flex">
        <BrandMark className="h-5" />
      </span>
      <h1 className="text-title truncate font-semibold">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        <Button
          aria-label="Search"
          onClick={onSearch}
          size="icon"
          variant="outline"
        >
          <Search aria-hidden="true" />
        </Button>
        <NavLink
          aria-label={
            unreadCount > 0 ? `Inbox, ${unreadCount} unread` : "Inbox"
          }
          className="size-control-md rounded-control border-border hover:bg-muted relative inline-flex items-center justify-center border"
          href={inboxHref}
        >
          <Bell aria-hidden="true" className="size-icon" />
          {unreadCount > 0 ? (
            <span
              aria-hidden="true"
              className="rounded-pill bg-destructive text-caption text-destructive-foreground absolute -top-1.5 -right-1.5 px-1.5"
            >
              {unreadCount}
            </span>
          ) : null}
        </NavLink>
        <Button
          aria-label="Help"
          className="tab:inline-flex hidden"
          size="icon"
          variant="outline"
        >
          <CircleHelp aria-hidden="true" />
        </Button>
      </div>
    </header>
  );
}
