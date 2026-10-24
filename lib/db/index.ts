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
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";
import { createLazyDb, parsePgliteUrl } from "./lazy";

export type Db = ReturnType<typeof createNeonDb>;

function createNeonDb(url: string) {
  return drizzle(new Pool({ connectionString: url }), { schema });
}

/**
 * Local and CI database: `DATABASE_URL=pglite:memory` (a fresh in-process
 * Postgres per server process) or `pglite:./.pglite` (kept in that directory,
 * for development). PGlite is a devDependency, so it is imported dynamically
 * inside `lib/db/pglite.ts` and only ever loaded when the URL asks for it; a
 * production bundle with a Neon URL never touches it. The first use applies
 * the migrations and runs the content seed. `createLazyDb` lets this stay a
 * synchronous call for the callers that already exist.
 */
function createDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and set it to a Neon connection string, or to pglite:memory for a throwaway local database.",
    );
  }
  const pglite = parsePgliteUrl(url);
  if (pglite) {
    return createLazyDb(async () => (await import("./pglite")).openPglite(pglite)) as unknown as Db;
  }
  return createNeonDb(url);
}

/** True when a database URL is set. Pages that need the database use this to say so plainly instead of failing. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

// On globalThis so every route bundle shares one connection pool (and, for
// pglite, one in-process database) rather than each importing its own copy.
const globalForDb = globalThis as unknown as { __trytpcDb?: Db };

/** The shared database client. Throws a clear error when DATABASE_URL is missing. */
export function getDb(): Db {
  globalForDb.__trytpcDb ??= createDb();
  return globalForDb.__trytpcDb;
}

/**
 * Resolves once a PGlite database has been opened, migrated and seeded; a
 * no-op for Neon. Better Auth's Drizzle adapter needs the real client's own
 * members (see lib/db/lazy.ts), which exist only after the first query ran.
 */
export async function whenDatabaseReady(): Promise<void> {
  if (parsePgliteUrl(process.env.DATABASE_URL ?? "")) await getDb().execute(sql`select 1`);
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
