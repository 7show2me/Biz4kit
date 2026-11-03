import { Button } from "@Biz4kit/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@Biz4kit/ui/components/dropdown-menu";
import { ChevronsUpDown, LogOut, SunMoon } from "lucide-react";
import { useTheme } from "next-themes";

import { ROLE_LABEL } from "@/lib/nav";
import type { Role } from "@/lib/nav";

import { BusinessMark } from "./business-mark";
import type { Workspace } from "./business-mark";

export interface ShellUser {
  email: string;
  name: string;
}

// Profile button at the bottom of the sidebar: the business logo, the business name
// and who is signed in, nothing else (D83). Address and GSTIN stay in Settings.
export function ProfileMenu({
  workspace,
  user,
  role,
  collapsed,
  onSignOut,
}: {
  collapsed?: boolean;
  onSignOut?: () => void;
  role: Role;
  user: ShellUser;
  workspace: Workspace;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account and workspace menu"
        render={
          <Button className="h-auto w-full justify-start" variant="outline" />
        }
      >
        <BusinessMark workspace={workspace} />
        {collapsed ? null : (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate font-semibold">
                {workspace.name}
              </span>
              <span className="text-caption text-muted-foreground block truncate">
                {user.name} · {ROLE_LABEL[role]}
              </span>
            </span>
            <ChevronsUpDown
              aria-hidden="true"
              className="size-icon-sm text-muted-foreground"
            />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64" side="top">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Signed in</DropdownMenuLabel>
          <DropdownMenuItem disabled>
            {user.name} · {user.email}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <SunMoon aria-hidden="true" />
          Light or dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
