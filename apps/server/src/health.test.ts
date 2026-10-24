import { describe, expect, it } from "vitest";

import { health } from "./health";

describe("GET /health", () => {
  it("returns 200 with status ok, for the ECS and API Gateway checks", async () => {
    const res = await health.request("/health");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("is not cached by API Gateway or browsers", async () => {
    const res = await health.request("/health");

    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("does not answer other methods", async () => {
    const res = await health.request("/health", { method: "POST" });

    expect(res.status).toBe(404);
  });
});
