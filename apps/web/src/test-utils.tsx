import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

// Renders a component that uses router links, inside a memory router.
export async function renderInRouter(ui: ReactNode) {
  const root = createRootRoute({ component: () => ui });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: root,
  });
  await router.load();
  return render(<RouterProvider router={router} />);
}
