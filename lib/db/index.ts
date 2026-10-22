import "server-only";

/**
 * Server-only Drizzle client for Neon.
 *
 * Driver choice: `drizzle-orm/neon-serverless` (Pool over WebSocket), not
 * `neon-http`. Server Actions that write a row and its audit entry need an
 * interactive transaction, which the HTTP driver cannot do (it only supports
 * batched statements). The pool is created lazily and cached per server
 * instance; Vercel's Fluid compute reuses instances, so connections are shared.
 * Node 22+ provides the global WebSocket the driver needs.
 *
 * Nothing here reads `DATABASE_URL` at import time. The error is thrown the
 * first time the database is actually used, so `next build` and pages that
 * never touch the database keep working without one.
 */

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>;

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and set it to a Neon connection string.",
    );
  }
  return drizzle(new Pool({ connectionString: url }), { schema });
}

let cached: Db | undefined;

/** The shared database client. Throws a clear error when DATABASE_URL is missing. */
export function getDb(): Db {
  cached ??= createDb();
  return cached;
}

/** Lazy convenience handle: resolves the client on first property access. */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const client = getDb();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export { schema };
