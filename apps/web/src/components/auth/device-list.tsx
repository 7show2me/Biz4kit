import { Button } from "@Biz4kit/ui/components/button";
import { Laptop, LogOut, Smartphone } from "lucide-react";

export interface DeviceRow {
  current: boolean;
  id: string;
  // ISO time of the last activity.
  lastActive: string;
  name: string;
  phone: boolean;
}

const formatTime = (iso: string) => iso.slice(0, 16).replace("T", " ");

// Signed-in devices: one row per session, each revocable except this one (WBS 1.3).
export function DeviceList({
  devices,
  onRevoke,
  revokingId,
}: {
  devices: readonly DeviceRow[];
  onRevoke: (id: string) => void;
  revokingId?: string;
}) {
  if (devices.length === 0) {
    return (
      <p className="text-muted-foreground">
        No signed-in devices. When you sign in on a phone or computer, it shows
        here and you can sign it out.
      </p>
    );
  }
  return (
    <ul className="divide-border divide-y">
      {devices.map((d) => (
        <li className="flex items-center gap-3 py-2.5" key={d.id}>
          <span className="size-control-md rounded-control bg-muted text-muted-foreground flex shrink-0 items-center justify-center">
            {d.phone ? (
              <Smartphone aria-hidden="true" className="size-icon" />
            ) : (
              <Laptop aria-hidden="true" className="size-icon" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {d.name}
              {d.current ? (
                <span className="bg-muted text-caption text-muted-foreground ml-1 rounded-xs px-1.5">
                  This device
                </span>
              ) : null}
            </p>
            <p className="text-caption text-muted-foreground truncate">
              Last active {formatTime(d.lastActive)}
            </p>
          </div>
          {d.current ? null : (
            <Button
              disabled={revokingId === d.id}
              onClick={() => onRevoke(d.id)}
              size="sm"
              variant="outline"
            >
              <LogOut aria-hidden="true" />
              Sign out
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
