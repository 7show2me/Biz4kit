import { randomUUID } from "node:crypto";

import { takeNumber, withWorkspace } from "../index";
import type { Database } from "../index";
import {
  activityLog,
  booking,
  catalogItem,
  catalogPackage,
  customer,
  device,
  invoice,
  invoiceLine,
  job,
  lead,
  member,
  message,
  messageTemplate,
  payment,
} from "../schema";

// Generated people only (Workflow §PII): no real names, phones or emails.
export const fakePhone = () =>
  `+9190${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;

// One row in every workspace table, all inside the workspace's own context.
export function fillWorkspace(db: Database, workspaceId: string) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [owner] = await tx
      .insert(member)
      .values({
        name: "Test Owner",
        email: `owner-${randomUUID()}@example.com`,
        role: "owner",
        status: "active",
      })
      .returning();
    const [item] = await tx
      .insert(catalogItem)
      .values({ name: "Haircut", unit: "visit", pricePaise: 80_000n })
      .returning();
    await tx.insert(catalogPackage).values({
      name: "Bridal",
      pricePaise: 1_800_000n,
      items: [{ itemId: item?.id ?? null, qty: 1 }],
    });
    const [person] = await tx
      .insert(customer)
      .values({ name: "Test Customer", phone: fakePhone() })
      .returning();
    const customerId = person?.id ?? "";
    const [request] = await tx
      .insert(lead)
      .values({ customerId, type: "quoted", source: "web" })
      .returning();
    const pi = await takeNumber(tx, { series: "PI", fy: "2627" });
    const [bill] = await tx
      .insert(invoice)
      .values({
        kind: "reply",
        customerId,
        leadId: request?.id,
        piNumber: `PI-2627-${String(pi).padStart(4, "0")}`,
      })
      .returning();
    const invoiceId = bill?.id ?? "";
    await tx
      .insert(invoiceLine)
      .values({ invoiceId, name: "Haircut", qty: "1", ratePaise: 80_000n });
    await tx
      .insert(payment)
      .values({ invoiceId, amountPaise: 80_000n, method: "upi" });
    const [slot] = await tx
      .insert(booking)
      .values({
        customerId,
        startAt: new Date("2026-11-02T10:00:00+05:30"),
        endAt: new Date("2026-11-02T11:00:00+05:30"),
      })
      .returning();
    await tx
      .insert(job)
      .values({ customerId, bookingId: slot?.id, title: "Haircut" });
    await tx.insert(messageTemplate).values({
      number: 1,
      event: "price_list",
      name: "Price list",
      body: "Hi {customer_first}",
    });
    await tx.insert(message).values({
      channel: "email",
      status: "sent",
      to: "c@example.com",
      body: "Hi",
    });
    await tx
      .insert(device)
      .values({ memberId: owner?.id ?? "", name: "Test phone" });
    await tx.insert(activityLog).values({
      action: "lead.created",
      text: "New lead",
      recordId: request?.id,
    });
    return { ownerId: owner?.id ?? "", customerId, invoiceId };
  });
}
