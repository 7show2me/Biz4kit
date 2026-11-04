import { cn } from "@Biz4kit/ui/lib/utils";

import { Icon } from "@/components/icon";
import { workspaceHref } from "@/lib/nav";
import type { NavSection } from "@/lib/nav";

import { NavLink } from "./nav-link";

// Phone bar: the five sections, one tap each (mobile-web first, WBS 1.5).
export function BottomNav({
  slug,
  sections,
  current,
}: {
  current?: string;
  sections: NavSection[];
  slug: string;
}) {
  return (
    <nav
      aria-label="Sections"
      className="border-border bg-card tab:hidden flex shrink-0 border-t"
    >
      {sections.map((section) => (
        <NavLink
          aria-current={section.label === current ? "page" : undefined}
          className={cn(
            "h-header text-caption flex flex-1 flex-col items-center justify-center gap-0.5",
            section.label === current
              ? "text-secondary-foreground font-medium"
              : "text-muted-foreground"
          )}
          href={workspaceHref(slug, section.pages[0].id)}
          key={section.label}
        >
          <Icon name={section.icon} />
          <span className="max-w-full truncate">{section.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
