import { createFileRoute } from "@tanstack/react-router";

import { DevicesPanel } from "@/components/settings/devices-panel";
import { TeamPanel } from "@/components/settings/team-panel";
import { NavLink } from "@/components/shell/nav-link";
import { StubScreen } from "@/components/stub-screen";

export const Route = createFileRoute("/w/$slug/settings/$")({
  component: SettingsPage,
  staticData: { screen: "settings" },
});

// Tabs of the locked Settings screen (D81). Only Team (transfer) and Devices are built here.
const TABS = [
  ["brand", "Brand"],
  ["business", "Business"],
  ["numbering", "Numbering"],
  ["team", "Team"],
  ["roles", "Roles"],
  ["messages", "Messages"],
  ["devices", "Devices"],
] as const;

function SettingsPage() {
  const { slug, _splat } = Route.useParams();
  const tab = TABS.find(([id]) => id === _splat)?.[0] ?? "brand";
  return (
    <div className="tab:p-page flex flex-col gap-3 p-4">
      <nav aria-label="Settings tabs" className="flex gap-1 overflow-x-auto">
        {TABS.map(([id, label]) => (
          <NavLink
            aria-current={id === tab ? "page" : undefined}
            className="h-control-md rounded-control hover:bg-muted aria-[current=page]:bg-secondary flex items-center px-3 whitespace-nowrap aria-[current=page]:font-medium"
            href={`/w/${slug}/settings/${id}`}
            key={id}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      {tab === "devices" ? <DevicesPanel /> : null}
      {tab === "team" ? <TeamPanel /> : null}
      {tab === "devices" || tab === "team" ? null : (
        <StubScreen id="settings" />
      )}
    </div>
  );
}
