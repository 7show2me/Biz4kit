import { Outlet, createFileRoute, useMatches } from "@tanstack/react-router";

import { AppShell } from "@/components/shell/app-shell";
import { placeholderShellData } from "@/lib/shell-data";

export const Route = createFileRoute("/w/$slug")({
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  const { slug } = Route.useParams();
  const matches = useMatches();
  // The deepest match that names a screen is the current page.
  let activePage = "dashboard";
  for (const match of matches) {
    if (match.staticData.screen) {
      activePage = match.staticData.screen;
    }
  }
  const data = placeholderShellData(slug);
  return (
    <AppShell
      activePage={activePage}
      counts={data.counts}
      managerApprovals={data.managerApprovals}
      modules={data.modules}
      role={data.role}
      unreadCount={data.unreadCount}
      user={data.user}
      workspace={data.workspace}
    >
      <Outlet />
    </AppShell>
  );
}
