import { Badge } from "@Biz4kit/ui/components/badge";

import { statusOf } from "@/lib/status";
import type { Family } from "@/lib/status";

import { Icon } from "./icon";

export function StatusPill({
  family,
  value,
  className,
}: {
  className?: string;
  family: Family;
  value: string;
}) {
  const status = statusOf(family, value);
  return (
    <Badge
      className={className}
      data-status={value}
      variant={status.tone === "destructive" ? "critical" : status.tone}
    >
      <Icon className="size-icon-sm" name={status.icon} />
      {status.label}
    </Badge>
  );
}
