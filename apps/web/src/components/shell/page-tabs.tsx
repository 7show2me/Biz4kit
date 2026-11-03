import { cn } from "@Biz4kit/ui/lib/utils";

import { workspaceHref } from "@/lib/nav";
import type { NavSection } from "@/lib/nav";

import { NavLink } from "./nav-link";

// Page tabs under the header stay inside each section (D82).
export function PageTabs({
  slug,
  section,
  activePage,
  counts,
}: {
  activePage: string;
  counts: Record<string, number>;
  section: NavSection;
  slug: string;
}) {
  if (section.pages.length < 2) {
    return null;
  }
  return (
    <nav
      aria-label={`${section.label} pages`}
      className="border-border tab:px-page flex shrink-0 items-center gap-1 overflow-x-auto border-b px-2"
    >
      {section.pages.map((p) => (
        <NavLink
          aria-current={p.id === activePage ? "page" : undefined}
          className={cn(
            "h-control-lg flex items-center gap-1.5 border-b-2 px-3 whitespace-nowrap",
            p.id === activePage
              ? "border-primary text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground border-transparent"
          )}
          href={workspaceHref(slug, p.id)}
          key={p.id}
        >
          {p.label}
          {counts[p.id] ? (
            <span className="rounded-pill bg-muted text-caption px-1.5">
              {counts[p.id]}
            </span>
          ) : null}
        </NavLink>
      ))}
    </nav>
  );
}
