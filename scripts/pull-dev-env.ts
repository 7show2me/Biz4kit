// Pulls the Vercel Development env and gives each package only the keys its
// .env.schema declares (D112). One shared file would hand server secrets to the
// web app, and varlock blocks any response that contains an undeclared value.
// Usage: pnpm env:pull
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseEnv } from "node:util";

const ROOT = path.resolve(import.meta.dirname, "..");

// The db schema imports DATABASE_* from the server; tests also need TEST_*.
const TARGETS: { dir: string; extra?: RegExp }[] = [
  { dir: "apps/server" },
  { dir: "apps/web" },
  { dir: "packages/db", extra: /^(?:TEST_)?DATABASE_/u },
];

const declaredKeys = (dir: string): Set<string> => {
  const schema = readFileSync(path.join(ROOT, dir, ".env.schema"), "utf-8");
  return new Set(
    schema
      .split("\n")
      .map((line) => /^(?<key>[A-Z][A-Z0-9_]*)=/u.exec(line)?.groups?.key)
      .filter((key): key is string => Boolean(key))
  );
};

const quote = (value: string) => JSON.stringify(value);

const tmp = mkdtempSync(path.join(tmpdir(), "biz4kit-env-"));
const pulled = path.join(tmp, ".env");
try {
  // One command string: vercel is a .cmd shim on Windows, so it needs a shell.
  const result = spawnSync(
    `vercel env pull "${pulled}" --environment development --yes`,
    { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], shell: true }
  );
  if (result.status !== 0) {
    throw new Error(
      "vercel env pull failed; run `vercel login` and `vercel link`."
    );
  }
  const env = parseEnv(readFileSync(pulled, "utf-8"));

  for (const { dir, extra } of TARGETS) {
    const keys = declaredKeys(dir);
    const lines = Object.entries(env)
      .filter(([key]) => keys.has(key) || extra?.test(key))
      .map(([key, value]) => `${key}=${quote(value ?? "")}`);
    writeFileSync(
      path.join(ROOT, dir, ".env.local"),
      `# Pulled from Vercel Development by pnpm env:pull. Do not commit.\n${lines.join("\n")}\n`
    );
    // Key names only: values never reach the terminal.
    console.log(`${dir}/.env.local: ${lines.length} keys`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
