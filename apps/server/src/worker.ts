import * as Sentry from "@sentry/node";
import { Worker } from "bullmq";

import "./instrument";
import { ENV } from "./env.server";
import { redisConnection } from "./queue/connection";
import { DEFAULT_QUEUE, processJob } from "./queue/jobs";

// Same image as the API, started with `node dist/worker.mjs` (D28, D38).
// Upstash free plan caps commands (D33): a long drain delay and stalled check
// keep an idle worker from polling Redis every few seconds.
const worker = new Worker(DEFAULT_QUEUE, processJob, {
  connection: redisConnection(ENV.REDIS_URL),
  drainDelay: 60,
  stalledInterval: 120_000,
});

worker.on("failed", (job, error) => {
  // Job name and id only: job data can hold customer details.
  console.error(
    `job ${job?.name ?? "unknown"} ${job?.id ?? ""} failed: ${error.message}`
  );
  Sentry.captureException(error, { tags: { job: job?.name ?? "unknown" } });
});

const shutdown = async () => {
  await worker.close();
  await Sentry.close(2000);
  process.exit(0);
};

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);

console.log(`worker listening on queue "${DEFAULT_QUEUE}"`);
