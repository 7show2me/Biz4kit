import { describe, expect, it } from "vitest";

import { loadConfig } from "./config";

const FULL = {
  API_URL: "https://api.example.test/",
  SMOKE_SECRET: "s".repeat(32),
  VERCEL_AUTOMATION_BYPASS_SECRET: "bypass",
};

describe("loadConfig", () => {
  it("fills the defaults and trims the trailing slash of the API URL", () => {
    const config = loadConfig(FULL);

    expect(config).toMatchObject({
      apiUrl: "https://api.example.test",
      webUrl: "https://biz4kit-dev.vercel.app",
    });
  });

  it("names every missing variable and never shows a value", () => {
    expect(() => loadConfig({ API_URL: "https://x.test" })).toThrow(
      /SMOKE_SECRET.*VERCEL_AUTOMATION_BYPASS_SECRET/su
    );
    expect(() => loadConfig({ API_URL: "https://x.test" })).not.toThrow(
      /x\.test/u
    );
  });
});
