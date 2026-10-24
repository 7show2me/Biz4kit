import type { Session } from "@Biz4kit/auth";
import type { Database } from "@Biz4kit/db";

export interface Context {
  session: Session | null;
  db: Database;
}
