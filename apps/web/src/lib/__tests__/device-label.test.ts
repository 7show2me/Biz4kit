import { describe, expect, it } from "vitest";

import { deviceLabel } from "../device-label";

describe("deviceLabel", () => {
  it("names Chrome on Windows", () => {
    expect(
      deviceLabel(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
      )
    ).toEqual({ name: "Chrome on Windows", phone: false });
  });

  it("names Chrome on Android as a phone", () => {
    expect(
      deviceLabel(
        "Mozilla/5.0 (Linux; Android 14; Moto G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36"
      )
    ).toEqual({ name: "Chrome on Android", phone: true });
  });

  it("names Safari on iPhone as a phone", () => {
    expect(
      deviceLabel(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      )
    ).toEqual({ name: "Safari on iPhone", phone: true });
  });

  it("falls back to Device for an empty or unknown agent", () => {
    expect(deviceLabel("")).toEqual({ name: "Device", phone: false });
    expect(deviceLabel(null)).toEqual({ name: "Device", phone: false });
  });
});
