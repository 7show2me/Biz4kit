import type { ErrorEvent } from "@sentry/core";

import { scrubEvent } from "./scrub";

export { scrubEvent, scrubText } from "./scrub";

interface MonitoringConfig {
  dsn: string | undefined;
  environment?: string;
  release?: string;
}

// Shared Sentry options for the API, workers and web app (D104). An empty DSN
// (local dev, CI) turns Sentry off. Errors only: no tracing on the free plan.
export const sentryOptions = ({
  dsn,
  environment,
  release,
}: MonitoringConfig) => ({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment,
  release,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend: (event: ErrorEvent): ErrorEvent | null => scrubEvent(event),
});
