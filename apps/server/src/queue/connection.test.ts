import { describe, expect, it } from "vitest";

import { redisConnection } from "./connection";

// Generated test values; not real credentials.
const PASSWORD = "test-password-not-real";

describe("redisConnection", () => {
  it("uses TLS for an Upstash rediss:// URL (D33)", () => {
    const options = redisConnection(`rediss://default:${PASSWORD}@example.upstash.io:6379`);

    expect(options).toMatchObject({
      host: "example.upstash.io",
      port: 6379,
      username: "default",
      password: PASSWORD,
      tls: {},
    });
  });

  it("sets maxRetriesPerRequest to null, as BullMQ workers require", () => {
    const options = redisConnection("redis://localhost:6379");

    expect(options.maxRetriesPerRequest).toBeNull();
  });

  it("uses plain TCP for the local docker compose redis:// URL", () => {
    const options = redisConnection("redis://redis:6379");

    expect(options).toMatchObject({ host: "redis", port: 6379 });
    expect(options.tls).toBeUndefined();
  });

  it("refuses an empty URL", () => {
    expect(() => redisConnection("")).toThrow(/REDIS_URL/u);
  });

  it("refuses the Upstash REST URL (BullMQ needs the TCP endpoint, D29)", () => {
    expect(() => redisConnection("https://example.upstash.io")).toThrow(/REDIS_URL/u);
  });

  it("never puts the password in the error message", () => {
    expect(() => redisConnection(`http://default:${PASSWORD}@example.upstash.io`)).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining(PASSWORD) }),
    );
  });
});
