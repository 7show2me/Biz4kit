const DEFAULT_PORT = 6379;
const INVALID_URL =
  "REDIS_URL must be a redis:// or rediss:// URL (the Upstash TCP endpoint)";

export interface RedisConnectionOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  tls?: Record<string, never>;
  // BullMQ workers need null so blocking commands are never retried mid-call.
  maxRetriesPerRequest: null;
}

const parse = (url: string): URL => {
  try {
    return new URL(url);
  } catch {
    // The URL may hold a password: never echo it.
    throw new Error(INVALID_URL);
  }
};

const decoded = (value: string): string | undefined =>
  value ? decodeURIComponent(value) : undefined;

// Upstash (D33) gives a rediss:// URL; docker compose uses plain redis://.
export const redisConnection = (url: string): RedisConnectionOptions => {
  const parsed = parse(url);
  if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
    throw new Error(INVALID_URL);
  }

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : DEFAULT_PORT,
    username: decoded(parsed.username),
    password: decoded(parsed.password),
    maxRetriesPerRequest: null,
    ...(parsed.protocol === "rediss:" ? { tls: {} } : {}),
  };
};
