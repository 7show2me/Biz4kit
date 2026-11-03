import { describe, expect, it } from "vitest";

import { createAuth } from "../index";

const env = {
  BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-1234",
  BETTER_AUTH_URL: "http://localhost:3000",
  CORS_ORIGIN: "http://localhost:3001",
};

describe("createAuth", () => {
  it("marks a session fresh for 15 minutes only", () => {
    const auth = createAuth(env, {} as never);
    expect(auth.options.session?.freshAge).toBe(15 * 60);
  });

  it("has no Google provider without keys", () => {
    const auth = createAuth(env, {} as never);
    expect(auth.options.socialProviders?.google).toBeUndefined();
  });

  it("has the Google provider with keys", () => {
    const auth = createAuth(
      { ...env, GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" },
      {} as never
    );
    expect(auth.options.socialProviders?.google?.clientId).toBe("id");
  });
});
