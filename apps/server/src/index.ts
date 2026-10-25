import { appRouter } from "@Biz4kit/api/routers/index";
import { serve } from "@hono/node-server";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import * as Sentry from "@sentry/node";
import { initLogger } from "evlog";
import { createAuthMiddleware } from "evlog/better-auth";
import type { BetterAuthInstance } from "evlog/better-auth";
import { createFsDrain } from "evlog/fs";
import { evlog } from "evlog/hono";
import type { EvlogVariables } from "evlog/hono";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { createContext } from "./context";
import { ENV } from "./env.server";
import "./instrument";
import { health } from "./health";
import { auth } from "./services";

initLogger({
  env: { service: "Biz4kit-server" },
});

const identifyUser = createAuthMiddleware(auth as BetterAuthInstance, {
  exclude: ["/api/auth/**"],
  maskEmail: true,
});

const app = new Hono<EvlogVariables>();

// Before logging and auth: the health check runs every few seconds.
app.route("/", health);

app.use(
  evlog({
    drain: process.env.NODE_ENV === "production" ? undefined : createFsDrain(),
  })
);
app.use("*", async (c, next) => {
  await identifyUser(c.get("log"), c.req.raw.headers, c.req.path);
  return next();
});

app.use(
  "/*",
  cors({
    origin: ENV.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

const nativeAppUrl = "Biz4kit://";
const allowedNativeProtocols = new Set([
  "exp:",
  new URL(nativeAppUrl).protocol,
]);

app.get("/polar/success", (c) => {
  const requestUrl = new URL(c.req.url);
  const returnUrl = requestUrl.searchParams.get("returnUrl") || nativeAppUrl;

  let redirectUrl: URL;
  try {
    redirectUrl = new URL(returnUrl);
  } catch {
    return c.text("Invalid return URL", 400);
  }

  if (!allowedNativeProtocols.has(redirectUrl.protocol)) {
    return c.text("Invalid return URL", 400);
  }

  return c.redirect(redirectUrl.toString(), 302);
});

// Message and stack only, never request input: it can hold customer details.
// Sentry gets the same error after scrubbing (D104).
const logError = (cause: unknown) => {
  console.error(
    cause instanceof Error ? (cause.stack ?? cause.message) : "unknown error"
  );
  Sentry.captureException(cause);
};

app.onError((cause, c) => {
  logError(cause);
  return c.text("Internal Server Error", 500);
});

export const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [onError(logError)],
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [onError(logError)],
});

app.use("/*", async (c, next) => {
  const context = await createContext({ context: c });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context,
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    prefix: "/api-reference",
    context,
  });

  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  return next();
});

app.get("/", (c) => c.text("OK"));

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
