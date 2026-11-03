// A readable device name from a user-agent string, for the signed-in devices list.
// The IP address is not shown: it is personal data.

const BROWSERS: readonly [RegExp, string][] = [
  [/Edg\//u, "Edge"],
  [/OPR\//u, "Opera"],
  [/Firefox\//u, "Firefox"],
  [/Chrome\//u, "Chrome"],
  [/Safari\//u, "Safari"],
];

const SYSTEMS: readonly [RegExp, string][] = [
  [/iPhone/u, "iPhone"],
  [/iPad/u, "iPad"],
  [/Android/u, "Android"],
  [/Windows/u, "Windows"],
  [/Mac OS X/u, "Mac"],
  [/Linux/u, "Linux"],
];

const firstMatch = (list: readonly [RegExp, string][], text: string) =>
  list.find(([pattern]) => pattern.test(text))?.[1];

export function deviceLabel(userAgent: string | null = ""): {
  name: string;
  phone: boolean;
} {
  const agent = userAgent || "";
  const browser = firstMatch(BROWSERS, agent);
  const system = firstMatch(SYSTEMS, agent);
  const phone = /iPhone|Android.*Mobile/u.test(agent);
  if (!(browser || system)) {
    return { name: "Device", phone: false };
  }
  return {
    name: [browser, system].filter(Boolean).join(" on "),
    phone,
  };
}
