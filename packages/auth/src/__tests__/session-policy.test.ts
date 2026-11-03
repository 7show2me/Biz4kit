import { describe, expect, it } from "vitest";

import { REAUTH_MAX_AGE_SECONDS, needsReauth } from "../session-policy";

const T0 = new Date("2026-11-04T10:00:00Z");
const after = (seconds: number) => new Date(T0.getTime() + seconds * 1000);

describe("re-auth before billing and delete (prep Architecture: 15 minutes)", () => {
  it("uses 15 minutes", () => {
    expect(REAUTH_MAX_AGE_SECONDS).toBe(15 * 60);
  });

  it("does not ask inside 15 minutes", () => {
    expect(needsReauth(T0, after(14 * 60 + 59))).toBe(false);
  });

  it("asks at exactly 15 minutes and later", () => {
    expect(needsReauth(T0, after(15 * 60))).toBe(true);
    expect(needsReauth(T0, after(60 * 60))).toBe(true);
  });

  it("asks when the session start time is unknown", () => {
    expect(needsReauth(null, T0)).toBe(true);
    expect(needsReauth(undefined, T0)).toBe(true);
  });

  it("accepts an ISO string for the start time", () => {
    expect(needsReauth(T0.toISOString(), after(60))).toBe(false);
  });
});
