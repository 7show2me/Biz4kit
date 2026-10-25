import { sentryOptions } from "@Biz4kit/monitoring";
import * as Sentry from "@sentry/tanstackstart-react";

import { ENV } from "./env";

// Server-side rendering and server functions (D104). Imported first by server.ts.
Sentry.init(
  sentryOptions({
    dsn: ENV.VITE_SENTRY_DSN,
    environment: ENV.VITE_SENTRY_ENVIRONMENT,
    release: ENV.VITE_SENTRY_RELEASE,
  })
);
