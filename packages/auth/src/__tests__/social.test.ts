import { describe, expect, it } from "vitest";

import { socialProviders } from "../social";

describe("Google sign-in config", () => {
  it("is off without keys, so dev starts without Google", () => {
    expect(socialProviders({})).toEqual({});
  });

  it("is off when only one key is set", () => {
    expect(socialProviders({ GOOGLE_CLIENT_ID: "id" })).toEqual({});
    expect(socialProviders({ GOOGLE_CLIENT_SECRET: "secret" })).toEqual({});
  });

  it("turns on with both keys", () => {
    expect(
      socialProviders({
        GOOGLE_CLIENT_ID: "id",
        GOOGLE_CLIENT_SECRET: "secret",
      })
    ).toEqual({ google: { clientId: "id", clientSecret: "secret" } });
  });
});
