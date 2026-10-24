import type { ErrorEvent } from "@sentry/core";
import { describe, expect, it } from "vitest";

import { scrubEvent, scrubText } from "./scrub";

describe("scrubText", () => {
  it.each([
    ["mail asha@example.com now", "mail [email] now"],
    ["upi asha.k@okhdfcbank paid", "upi [upi] paid"],
    ["call +91 98765 43210", "call [phone]"],
    ["call 9876543210", "call [phone]"],
    ["gst 27AAPFU0939F1ZV", "gst [gstin]"],
    ["pan AAPFU0939F", "pan [pan]"],
  ])("redacts %s", (input, expected) => {
    expect(scrubText(input)).toBe(expected);
  });

  it("leaves ordinary error text alone", () => {
    expect(scrubText("job send-invoice 42 failed after 3 tries")).toBe(
      "job send-invoice 42 failed after 3 tries"
    );
  });
});

const sampleEvent = (): ErrorEvent => ({
  type: undefined,
  message: "reply for asha@example.com failed",
  user: { id: "u_1", email: "asha@example.com", ip_address: "1.2.3.4" },
  request: {
    url: "https://api.biz4kit.com/rpc/reply.send?phone=9876543210",
    method: "POST",
    data: { phone: "9876543210" },
    cookies: { session: "secret" },
    headers: { authorization: "Bearer x", "user-agent": "test" },
    query_string: "phone=9876543210",
  },
  exception: {
    values: [{ type: "Error", value: "no customer 9876543210" }],
  },
  breadcrumbs: [{ message: "sent to asha@example.com", data: { to: "x" } }],
  extra: { body: { name: "Asha" } },
});

describe("scrubEvent", () => {
  it("keeps only the user id", () => {
    expect(scrubEvent(sampleEvent())?.user).toEqual({ id: "u_1" });
  });

  it("drops request body, cookies, headers and query", () => {
    expect(scrubEvent(sampleEvent())?.request).toEqual({
      url: "https://api.biz4kit.com/rpc/reply.send",
      method: "POST",
    });
  });

  it("redacts the message, exception values and breadcrumbs", () => {
    const out = scrubEvent(sampleEvent());

    expect(out?.message).toBe("reply for [email] failed");
    expect(out?.exception?.values?.[0]?.value).toBe("no customer [phone]");
    expect(out?.breadcrumbs).toEqual([{ message: "sent to [email]" }]);
  });

  it("drops extra data, which can hold request input", () => {
    expect(scrubEvent(sampleEvent())?.extra).toBeUndefined();
  });
});
