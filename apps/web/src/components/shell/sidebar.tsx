import { BrandMark } from "@Biz4kit/ui/components/brand-mark";
import { Button } from "@Biz4kit/ui/components/button";
import { cn } from "@Biz4kit/ui/lib/utils";
import { ChevronRight, PanelLeft } from "lucide-react";
import { useState } from "react";

import { Icon } from "@/components/icon";
import {
  SETTINGS_ITEM,
  canOpenSettings,
  sectionOf,
  visibleFavourites,
  workspaceHref,
  visibleSections,
} from "@/lib/nav";
import type { NavContext, Role } from "@/lib/nav";

import type { Workspace } from "./business-mark";
import { NavLink } from "./nav-link";
import { ProfileMenu } from "./profile-menu";
import type { ShellUser } from "./profile-menu";

// One status hue per favourite (D83). Literal classes so Tailwind sees them.
const TILE: Record<string, string> = {
  info: "bg-info-soft text-info",
  teal: "bg-teal-soft text-teal",
  violet: "bg-violet-soft text-violet",
};

const rowClass = (current: boolean) =>
  cn(
    "h-nav-item rounded-control hover:bg-muted relative flex items-center gap-2 px-2",
    current && "bg-secondary text-secondary-foreground font-medium"
  );

export function Sidebar({
  workspace,
  user,
  nav,
  activePage,
  counts,
  onSignOut,
}: {
  activePage: string;
  counts: Record<string, number>;
  nav: NavContext;
  onSignOut?: () => void;
  user: ShellUser;
  workspace: Workspace;
}) {
  const [collapsed, setCollapsed] = useState(false);
  // Only the current section is open until the user opens another (D82).
  const current = sectionOf(activePage)?.label;
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const sections = visibleSections(nav);
  const hrefOf = (id: string) => workspaceHref(workspace.slug, id);
  const favourites = visibleFavourites(nav);

  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        "tab:flex hidden shrink-0 flex-col",
        collapsed ? "w-nav-item" : "w-sidebar"
      )}
    >
      <div className="h-control-lg border-border mx-2 mt-3 mb-2 box-content flex items-center gap-1 border-b pb-2">
        <NavLink
          aria-label="Go to Today"
          className="flex min-w-0 flex-1 items-center px-1.5"
          href={hrefOf("dashboard")}
        >
          <span className="rounded-control bg-primary text-primary-foreground inline-flex size-8 shrink-0 items-center justify-center">
            <BrandMark className="h-4" />
          </span>
        </NavLink>
        <Button
          aria-label="Collapse or expand sidebar"
          onClick={() => setCollapsed((c) => !c)}
          size="icon-sm"
          variant="ghost"
        >
          <PanelLeft aria-hidden="true" />
        </Button>
      </div>

      <nav aria-label="Workspace" className="flex-1 overflow-y-auto px-2 pt-1">
        <div className="flex flex-col gap-0.5">
          {sections.map((section) => {
            const isCurrent = section.label === current;
            const open = opened[section.label] ?? isCurrent;
            const total = section.pages.reduce(
              (n, p) => n + (counts[p.id] ?? 0),
              0
            );
            return (
              <section aria-label={section.label} key={section.label}>
                <div className="flex items-center">
                  <NavLink
                    className={cn(
                      "h-nav-item rounded-control hover:bg-muted flex min-w-0 flex-1 items-center gap-2 px-2",
                      isCurrent && "text-foreground"
                    )}
                    href={hrefOf(section.pages[0].id)}
                    onClick={() =>
                      setOpened((o) => ({ ...o, [section.label]: true }))
                    }
                  >
                    <Icon name={section.icon} />
                    {collapsed ? (
                      <span className="sr-only">{section.label}</span>
                    ) : (
                      <span className="truncate">{section.label}</span>
                    )}
                    {total > 0 && !open && !collapsed ? (
                      <span className="rounded-pill bg-info text-caption text-info-foreground ml-auto px-1.5">
                        {total}
                      </span>
                    ) : null}
                  </NavLink>
                  {collapsed ? null : (
                    <Button
                      aria-expanded={open}
                      aria-label={`${open ? "Collapse" : "Expand"} ${section.label}`}
                      onClick={() =>
                        setOpened((o) => ({ ...o, [section.label]: !open }))
                      }
                      size="icon-sm"
                      variant="ghost"
                    >
                      <ChevronRight
                        aria-hidden="true"
                        className={open ? "rotate-90" : undefined}
                      />
                    </Button>
                  )}
                </div>
                {open && !collapsed ? (
                  <ul className="border-border mt-0.5 ml-4 flex flex-col gap-0.5 border-l border-dashed pl-2">
                    {section.pages.map((p) => (
                      <li key={p.id}>
                        <NavLink
                          aria-current={
                            p.id === activePage ? "page" : undefined
                          }
                          className={rowClass(p.id === activePage)}
                          href={hrefOf(p.id)}
                        >
                          <Icon name={p.icon} />
                          <span className="truncate">{p.label}</span>
                          {counts[p.id] ? (
                            <span className="rounded-pill bg-muted text-caption text-muted-foreground ml-auto px-1.5">
                              {counts[p.id]}
                            </span>
                          ) : null}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            );
          })}
        </div>

        {favourites.length > 0 && !collapsed ? (
          <section
            aria-label="Favourites"
            className="border-border mt-2 border-t pt-2"
          >
            <p className="h-control-sm text-label text-muted-foreground flex items-center px-2">
              Favourites
            </p>
            <ul className="flex flex-col gap-0.5">
              {favourites.map((f) => (
                <li key={f.label}>
                  <NavLink className={rowClass(false)} href={hrefOf(f.page)}>
                    <span
                      className={cn(
                        "rounded-control inline-flex size-6 items-center justify-center",
                        TILE[f.tone]
                      )}
                    >
                      <Icon className="size-icon-sm" name={f.icon} />
                    </span>
                    <span className="truncate">{f.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {canOpenSettings(nav.role) ? (
          <section
            aria-label="Settings"
            className="border-border mt-2 border-t pt-2"
          >
            <NavLink
              aria-current={activePage === "settings" ? "page" : undefined}
              className={rowClass(activePage === "settings")}
              href={hrefOf(SETTINGS_ITEM.id)}
            >
              <Icon name={SETTINGS_ITEM.icon} />
              {collapsed ? (
                <span className="sr-only">{SETTINGS_ITEM.label}</span>
              ) : (
                <span className="truncate">{SETTINGS_ITEM.label}</span>
              )}
            </NavLink>
          </section>
        ) : null}
      </nav>

      <div className="m-2">
        <ProfileMenu
          collapsed={collapsed}
          onSignOut={onSignOut}
          role={nav.role as Role}
          user={user}
          workspace={workspace}
        />
      </div>
    </aside>
  );
}
