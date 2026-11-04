import { describe, expect, it, vi } from "vitest";

import { createSmoke } from "./smoke";
import type { SmokeProbes } from "./smoke";

// Built at run time: a literal looks like a real key to the secret scan.
const SECRET = "t".repeat(40);

const probes = (): SmokeProbes => ({
  database: vi.fn().mockResolvedValue({
    role: "biz4kit_app",
    bypassRls: false,
    superuser: false,
    visibleWorkspaces: 0,
  }),
  queue: vi.fn().mockResolvedValue({ jobId: "1", state: "completed" }),
});

const make = (
  overrides: Partial<Parameters<typeof createSmoke>[0]> = {},
  p: SmokeProbes = probes()
) =>
  createSmoke({ secret: SECRET, environment: "dev", probes: p, ...overrides });

const call = (
  app: ReturnType<typeof createSmoke>,
  path: string,
  secret: string | null = SECRET
) =>
  app.request(path, {
    method: "POST",
    headers: secret === null ? {} : { "x-smoke-secret": secret },
  });

const statusOf = async (
  app: ReturnType<typeof createSmoke>,
  path: string,
  secret: string | null = SECRET
) => {
  const res = await call(app, path, secret);
  return res.status;
};

const jsonOf = async (
  app: ReturnType<typeof createSmoke>,
  path: string
): Promise<unknown> => {
  const res = await call(app, path);
  return res.json();
};

describe("smoke routes are off unless allowed", () => {
  it("answers 404 when no secret is configured", async () => {
    const status = await statusOf(make({ secret: undefined }), "/__smoke/db");

    expect(status).toBe(404);
  });

  it("answers 404 in production even with a secret", async () => {
    const status = await statusOf(
      make({ environment: "production" }),
      "/__smoke/db"
    );

    expect(status).toBe(404);
  });

  it("answers 401 without the secret header", async () => {
    const p = probes();

    const status = await statusOf(make({}, p), "/__smoke/db", null);

    expect(status).toBe(401);
    expect(p.database).not.toHaveBeenCalled();
  });

  it("answers 401 with a wrong secret", async () => {
    const status = await statusOf(make(), "/__smoke/db", "nope");

    expect(status).toBe(401);
  });
});

describe("POST /__smoke/db", () => {
  it("reports the app role with row-level security on", async () => {
    const body = await jsonOf(make(), "/__smoke/db");

    expect(body).toEqual({
      role: "biz4kit_app",
      bypassRls: false,
      superuser: false,
      visibleWorkspaces: 0,
      rlsOn: true,
    });
  });

  it("says rlsOn false when the role bypasses RLS", async () => {
    const p = probes();
    vi.mocked(p.database).mockResolvedValue({
      role: "neondb_owner",
      bypassRls: true,
      superuser: false,
      visibleWorkspaces: 3,
    });

    const body = await jsonOf(make({}, p), "/__smoke/db");

    expect(body).toMatchObject({ rlsOn: false });
  });
});

describe("POST /__smoke/queue", () => {
  it("runs a ping job and returns once the worker finished it", async () => {
    const p = probes();

    const body = await jsonOf(make({}, p), "/__smoke/queue");

    expect(body).toEqual({ jobId: "1", state: "completed" });
    expect(p.queue).toHaveBeenCalledWith("ping");
  });

  it("answers 504 when the worker does not finish in time", async () => {
    const p = probes();
    vi.mocked(p.queue).mockRejectedValue(new Error("timeout"));

    const status = await statusOf(make({}, p), "/__smoke/queue");

    expect(status).toBe(504);
  });
});
