// Personal-data columns (DPDP export and erasure, Legal & compliance). Keep in
// step with the schema; src/pii.test.ts fails when a listed column is missing.
export const PII_COLUMNS = {
  member: ["name", "email", "phone"],
  customer: ["name", "phone", "email", "company", "gstin", "address", "notes"],
  lead: ["brief", "lines", "reject_reason"],
  invoice_line: ["serial"],
  payment: ["reference", "proof", "note"],
  booking: ["notes"],
  job: ["photos"],
  message: ["reply_to", "to", "subject", "body"],
  activity_log: ["text", "diff"],
  device: ["name"],
} as const satisfies Record<string, readonly string[]>;
