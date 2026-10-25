import type { Job } from "bullmq";

export const DEFAULT_QUEUE = "default";

// Real jobs (emails, reminders) arrive with their WBS packages. `ping` lets a
// deploy prove the worker is consuming the queue.
export const processJob = (job: Job): Promise<{ ok: true }> => {
  if (job.name === "ping") {
    return Promise.resolve({ ok: true });
  }
  return Promise.reject(new Error(`unknown job "${job.name}"`));
};
