import { Queue, QueueEvents } from "bullmq";

import { ENV } from "./env.server";
import { redisConnection } from "./queue/connection";
import { DEFAULT_QUEUE } from "./queue/jobs";
import { db } from "./services";
import type { SmokeProbes } from "./smoke";

const QUEUE_WAIT_MS = 30_000;

// Built only when SMOKE_SECRET is set, so production opens no extra Redis
// connection. Same prefix as the worker, or the job would wait forever.
export const createSmokeProbes = (): SmokeProbes => {
  const options = {
    connection: redisConnection(ENV.REDIS_URL),
    prefix: ENV.QUEUE_PREFIX,
  };
  let queue: Queue | undefined;
  let events: QueueEvents | undefined;

  return {
    async database() {
      // The pool behind drizzle: plain SQL, no query builder needed here.
      const { rows } = await db.$client.query<{
        role: string;
        bypass_rls: boolean;
        superuser: boolean;
        visible: string;
      }>(`
        select current_user::text as role,
               r.rolbypassrls as bypass_rls,
               r.rolsuper as superuser,
               (select count(*) from workspace) as visible
          from pg_roles r
         where r.rolname = current_user`);
      const [row] = rows;
      if (!row) {
        throw new Error("smoke: role not found");
      }
      return {
        role: row.role,
        bypassRls: row.bypass_rls,
        superuser: row.superuser,
        visibleWorkspaces: Number(row.visible),
      };
    },

    async queue(jobName) {
      queue ??= new Queue(DEFAULT_QUEUE, options);
      events ??= new QueueEvents(DEFAULT_QUEUE, options);
      await events.waitUntilReady();
      const job = await queue.add(jobName, {}, { removeOnComplete: true });
      try {
        await job.waitUntilFinished(events, QUEUE_WAIT_MS);
        return { jobId: String(job.id), state: "completed" };
      } catch (error) {
        // A job the worker rejected is an answer, not a timeout.
        if (await job.isFailed()) {
          return { jobId: String(job.id), state: "failed" };
        }
        throw error;
      }
    },
  };
};
