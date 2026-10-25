import {
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { member, sameWorkspace, tenantColumns, tenantPolicy } from "./tenancy";

export const messageChannel = pgEnum("message_channel", [
  "email",
  "sms",
  "whatsapp",
]);
// Email is sent; SMS and WhatsApp are copied in Phase 1 (D67).
export const messageStatus = pgEnum("message_status", ["sent", "copied"]);

// The 16 ready messages (8 and 9 retired, D93), editable per workspace.
export const messageTemplate = pgTable.withRLS(
  "message_template",
  {
    ...tenantColumns(),
    // The ready-message number shown in the app (1–18).
    number: smallint("number").notNull(),
    event: text("event").notNull(),
    name: text("name").notNull(),
    trigger: text("trigger"),
    audience: text("audience"),
    subject: text("subject"),
    body: text("body").notNull(),
  },
  (t) => [tenantPolicy(), unique().on(t.workspaceId, t.number)]
);

// Sent and shared log (the prototype's outbox).
export const message = pgTable.withRLS(
  "message",
  {
    ...tenantColumns(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    channel: messageChannel("channel").notNull(),
    status: messageStatus("status").notNull(),
    fromName: text("from_name"),
    replyTo: text("reply_to"),
    to: text("to").notNull(),
    subject: text("subject"),
    body: text("body").notNull(),
    templateNumber: smallint("template_number"),
    recordType: text("record_type"),
    recordId: uuid("record_id"),
    byMemberId: uuid("by_member_id"),
  },
  (t) => [
    tenantPolicy(),
    sameWorkspace("message_member_fk", t, t.byMemberId, member),
  ]
);
