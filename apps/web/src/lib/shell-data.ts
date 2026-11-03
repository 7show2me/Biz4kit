import { DEFAULT_MODULES } from "@/lib/nav";
import type { Modules, Role } from "@/lib/nav";

export interface ShellData {
  counts: Record<string, number>;
  managerApprovals: boolean;
  modules: Modules;
  role: Role;
  unreadCount: number;
  user: { email: string; name: string };
  workspace: { logoUrl?: string; name: string; slug: string };
}

const NO_COUNTS: Record<string, number> = {};

// Placeholder until the workspace (WBS 1.4) and the session (WBS 1.3) feed the shell.
// It invents no business fact: the name is the slug, the role is Owner, Lite mode is on.
export function placeholderShellData(slug: string): ShellData {
  return {
    counts: NO_COUNTS,
    managerApprovals: false,
    modules: DEFAULT_MODULES,
    role: "owner",
    unreadCount: 0,
    user: { email: "", name: "You" },
    workspace: { name: slug, slug },
  };
}
