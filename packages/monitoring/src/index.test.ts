import { describe, expect, it } from "vitest";

import { sentryOptions } from "./index";

describe("sentryOptions", () => {
  it("is off without a DSN, so local dev and CI send nothing", () => {
    expect(sentryOptions({ dsn: "" }).enabled).toBe(false);
  });

  it("never sends default PII and scrubs every event", () => {
    const options = sentryOptions({ dsn: "https://k@o1.ingest.sentry.io/1" });

    expect(options.enabled).toBe(true);
    expect(options.sendDefaultPii).toBe(false);
    expect(
      options.beforeSend({ type: undefined, message: "to asha@example.com" })
        ?.message
    ).toBe("to [email]");
  });

  it("tags the environment and release", () => {
    const options = sentryOptions({
      dsn: "https://k@o1.ingest.sentry.io/1",
      environment: "staging",
      release: "abc123",
    });

    expect(options.environment).toBe("staging");
    expect(options.release).toBe("abc123");
  });
});
