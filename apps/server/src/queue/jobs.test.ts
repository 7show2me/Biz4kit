import type { Job } from "bullmq";
import { describe, expect, it } from "vitest";

import { processJob } from "./jobs";

const job = (name: string) => ({ name }) as Job;

describe("processJob", () => {
  it("answers a ping so a deploy can prove the worker consumes the queue", async () => {
    await expect(processJob(job("ping"))).resolves.toEqual({ ok: true });
  });

  it("fails an unknown job instead of silently dropping it", async () => {
    await expect(processJob(job("no-such-job"))).rejects.toThrow(
      /unknown job/u
    );
  });
});
