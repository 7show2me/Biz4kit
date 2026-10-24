import { Hono } from "hono";

// Liveness for the ECS container check and API Gateway. Touches no database
// or queue, so a slow dependency never restarts a healthy task.
export const health = new Hono().get("/health", (c) => {
  c.header("Cache-Control", "no-store");
  return c.json({ status: "ok" });
});
