import { createHash, timingSafeEqual } from "node:crypto";

import { Hono } from "hono";

// Test-only routes for the post-deploy smoke test (.github/workflows/deploy.yml).
// Off unless SMOKE_SECRET is set, never on in production, and every call needs
// the secret in a header. They read and write no customer data.
export interface DatabaseReport {
  bypassRls: boolean;
  role: string;
  superuser: boolean;
  // Workspace rows the role sees with no workspace chosen. RLS makes it 0.
  visibleWorkspaces: number;
}

export interface QueueReport {
  jobId: string;
  state: "completed" | "failed";
}

export interface SmokeProbes {
  database: () => Promise<DatabaseReport>;
  queue: (jobName: string) => Promise<QueueReport>;
}

export interface SmokeConfig {
  // dev or production (SENTRY_ENVIRONMENT).
  environment: string | undefined;
  probes: SmokeProbes;
  secret: string | undefined;
}

const digest = (value: string) => createHash("sha256").update(value).digest();

const matches = (given: string | undefined, secret: string) =>
  timingSafeEqual(digest(given ?? ""), digest(secret));

export const createSmoke = ({ secret, environment, probes }: SmokeConfig) => {
  const app = new Hono();

  app.use("/__smoke/*", (c, next) => {
    if (!secret || environment === "production") {
      return Promise.resolve(c.notFound());
    }
    if (!matches(c.req.header("x-smoke-secret"), secret)) {
      return Promise.resolve(c.json({ error: "unauthorized" }, 401));
    }
    c.header("Cache-Control", "no-store");
    return next();
  });

  app.post("/__smoke/db", async (c) => {
    const report = await probes.database();
    const rlsOn =
      !report.bypassRls && !report.superuser && report.visibleWorkspaces === 0;
    return c.json({ ...report, rlsOn });
  });

  app.post("/__smoke/queue", async (c) => {
    try {
      return c.json(await probes.queue("ping"));
    } catch {
      return c.json({ error: "worker did not finish in time" }, 504);
    }
  });

  return app;
};
