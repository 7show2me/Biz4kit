import { createAuth } from "@Biz4kit/auth";
import { createDb } from "@Biz4kit/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db);
