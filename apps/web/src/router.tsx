import { sentryOptions } from "@Biz4kit/monitoring";
import * as Sentry from "@sentry/tanstackstart-react";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import Loader from "./components/loader";
import { ENV } from "./env";
import { routeTree } from "./routeTree.gen";
import { createQueryClient, orpc } from "./utils/orpc";

export const getRouter = () => {
  const queryClient = createQueryClient();

  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    context: { orpc, queryClient },
    defaultPendingComponent: () => <Loader />,
    defaultNotFoundComponent: () => <div>Not Found</div>,
  });

  // Browser errors (D104); the server side starts in instrument.server.ts.
  if (!(router.isServer || Sentry.isInitialized())) {
    Sentry.init(
      sentryOptions({
        dsn: ENV.VITE_SENTRY_DSN,
        environment: ENV.VITE_SENTRY_ENVIRONMENT,
        release: ENV.VITE_SENTRY_RELEASE,
      })
    );
  }

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  });

  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
