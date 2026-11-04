import { chromium } from "playwright";
import type { Browser, Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadConfig } from "./config";

// Runs against the deployed dev stack (deploy.yml, job `smoke`). It sends no
// personal data: the only rows it touches are counts.
const config = loadConfig(process.env);

const smokeCall = async (path: string) => {
  const res = await fetch(`${config.apiUrl}/__smoke/${path}`, {
    method: "POST",
    headers: { "x-smoke-secret": config.smokeSecret },
  });
  return { status: res.status, body: (await res.json()) as unknown };
};

describe("deployed dev stack", () => {
  let browser: Browser;
  let page: Page;
  const consoleErrors: string[] = [];

  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
  });

  afterAll(async () => {
    await browser.close();
  });

  it("1. the web page loads with no console error", async () => {
    // Dev previews sit behind Vercel sign-in; the automation bypass sets a cookie.
    const url = new URL(config.webUrl);
    url.searchParams.set("x-vercel-protection-bypass", config.bypassSecret);
    url.searchParams.set("x-vercel-set-bypass-cookie", "samesitenone");

    const response = await page.goto(url.toString(), {
      waitUntil: "networkidle",
    });

    expect(response?.status()).toBe(200);
    expect(await page.title()).toContain("Biz4Kit");
    expect(consoleErrors).toEqual([]);
  });

  it("2. the API answers /health", async () => {
    const res = await fetch(`${config.apiUrl}/health`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("3. the browser calls the API from the web origin with no CORS error", async () => {
    // A JSON POST forces a preflight, like the app's own calls.
    const result = await page.evaluate(async (api) => {
      try {
        const res = await fetch(`${api}/rpc/healthCheck`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        return { reached: true, status: res.status };
      } catch (error) {
        return { reached: false, status: 0, error: String(error) };
      }
    }, config.apiUrl);

    expect(result.reached).toBe(true);
    expect(result.status).toBeLessThan(500);
  });

  it("4. the API reads Neon dev as the app role with RLS on", async () => {
    const { status, body } = await smokeCall("db");

    expect(status).toBe(200);
    expect(body).toMatchObject({
      role: "biz4kit_app",
      bypassRls: false,
      superuser: false,
      visibleWorkspaces: 0,
      rlsOn: true,
    });
  });

  it("5. a job goes into the queue and the worker finishes it", async () => {
    const { status, body } = await smokeCall("queue");

    expect(status).toBe(200);
    expect(body).toMatchObject({ state: "completed" });
  });
});
