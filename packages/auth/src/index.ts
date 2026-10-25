import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { expo } from "@better-auth/expo";
import type { Database } from "@Biz4kit/db";
import * as schema from "@Biz4kit/db/schema/auth";
import { polar, checkout, portal } from "@polar-sh/better-auth";
import { betterAuth } from "better-auth";

import { createPolarClient } from "./lib/payments";

export interface AuthConfig {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  CORS_ORIGIN: string;
  POLAR_ACCESS_TOKEN?: string;
  POLAR_SUCCESS_URL?: string;
}

// Polar billing is Phase 2 (D98, WBS 5.5): without a token there is no Polar
// plugin, so sign-up never calls Polar. Products are set in 5.5.
function polarPlugins({ POLAR_ACCESS_TOKEN, POLAR_SUCCESS_URL }: AuthConfig) {
  if (!POLAR_ACCESS_TOKEN) {
    return [];
  }
  return [
    polar({
      client: createPolarClient({ POLAR_ACCESS_TOKEN }),
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [{ productId: "your-product-id", slug: "pro" }],
          successUrl: POLAR_SUCCESS_URL,
          authenticatedUsersOnly: true,
        }),
        portal(),
      ],
    }),
  ];
}

export function createAuth(
  env: AuthConfig,
  database: Database,
  desktopOrigins: readonly string[] = []
) {
  return betterAuth({
    database: drizzleAdapter(database, {
      provider: "pg",
      schema,
    }),
    trustedOrigins: [
      env.CORS_ORIGIN,
      ...desktopOrigins,
      "Biz4kit://",
      "exp://",
      "http://localhost:8081",
    ],
    emailAndPassword: { enabled: true },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
    plugins: [...polarPlugins(env), expo()],
  });
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
