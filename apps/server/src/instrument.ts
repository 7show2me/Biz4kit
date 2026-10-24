import { sentryOptions } from "@Biz4kit/monitoring";
import * as Sentry from "@sentry/node";

import { ENV } from "./env.server";

// Side-effect import in the API and the worker: starts Sentry before they serve.
Sentry.init(
  sentryOptions({
    dsn: ENV.SENTRY_DSN,
    environment: ENV.SENTRY_ENVIRONMENT,
    release: ENV.SENTRY_RELEASE,
  })
);
