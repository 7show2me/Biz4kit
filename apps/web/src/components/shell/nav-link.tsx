import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<"a">, "href"> & { href: string };

// One place for the type cast: nav.ts builds URLs from data, and the generated route
// tree types `to` as a union of literal paths.
export function NavLink({ href, children, ...props }: Props) {
  return (
    <Link to={href as "/"} {...props}>
      {children}
    </Link>
  );
}
