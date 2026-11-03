// The business's own logo, or its initials when it has none (D78). Business colours
// reach customer pages only; here the mark sits on neutral workspace chrome.

export interface Workspace {
  logoUrl?: string;
  name: string;
  slug: string;
}

export const initialsOf = (name: string) =>
  name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

export function BusinessMark({
  workspace,
  className = "size-8",
}: {
  className?: string;
  workspace: Workspace;
}) {
  if (workspace.logoUrl) {
    return (
      <img
        alt={workspace.name}
        className={`${className} rounded-pill bg-background shrink-0 object-contain`}
        src={workspace.logoUrl}
      />
    );
  }
  return (
    <span
      className={`${className} rounded-pill bg-secondary text-caption text-secondary-foreground flex shrink-0 items-center justify-center font-semibold`}
    >
      {initialsOf(workspace.name)}
    </span>
  );
}
