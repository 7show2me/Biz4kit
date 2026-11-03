import { useState } from "react";
import type { ReactNode } from "react";

import {
  SETTINGS_ITEM,
  sectionOf,
  visibleSections,
  workspaceHref,
} from "@/lib/nav";
import type { Modules, Role } from "@/lib/nav";
import { screenById } from "@/lib/screens";

import { BottomNav } from "./bottom-nav";
import type { Workspace } from "./business-mark";
import { CommandDialog } from "./command-dialog";
import { Header } from "./header";
import { PageTabs } from "./page-tabs";
import type { ShellUser } from "./profile-menu";
import { Sidebar } from "./sidebar";

const NO_COUNTS: Record<string, number> = {};

export interface AppShellProps {
  // The page (screen id) being shown: selects the section, the tab and the title.
  activePage: string;
  children: ReactNode;
  // Live counts on pages, for example { leads: 2 }.
  counts?: Record<string, number>;
  managerApprovals?: boolean;
  modules: Modules;
  onSignOut?: () => void;
  role: Role;
  unreadCount: number;
  user: ShellUser;
  workspace: Workspace;
}

// The workspace frame: sidebar on tablet and wider, header, page tabs, a bottom bar on
// phones. Layout and sizes come from the density tokens in brand/theme.css (D52).
export function AppShell({
  activePage,
  children,
  counts = NO_COUNTS,
  managerApprovals,
  modules,
  onSignOut,
  role,
  unreadCount,
  user,
  workspace,
}: AppShellProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const nav = { managerApprovals, modules, role };
  const sections = visibleSections(nav);
  const section = sections.find(
    (s) => s.label === sectionOf(activePage)?.label
  );
  const title =
    activePage === SETTINGS_ITEM.id
      ? SETTINGS_ITEM.label
      : (screenById(activePage)?.name ?? "");

  return (
    <div className="bg-background text-foreground flex h-svh">
      <Sidebar
        activePage={activePage}
        counts={counts}
        nav={nav}
        onSignOut={onSignOut}
        user={user}
        workspace={workspace}
      />
      <div className="bg-card tab:my-2 tab:mr-2 tab:rounded-card tab:border tab:border-border tab:shadow-xs relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          inboxHref={workspaceHref(workspace.slug, "inbox")}
          onSearch={() => setSearchOpen(true)}
          title={title}
          unreadCount={unreadCount}
        />
        {section ? (
          <PageTabs
            activePage={activePage}
            counts={counts}
            section={section}
            slug={workspace.slug}
          />
        ) : null}
        <main className="flex-1 overflow-y-auto">{children}</main>
        <BottomNav
          current={section?.label}
          sections={sections}
          slug={workspace.slug}
        />
      </div>
      <CommandDialog onOpenChange={setSearchOpen} open={searchOpen} />
    </div>
  );
}
