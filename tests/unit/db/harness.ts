/**
 * In-memory Postgres (PGlite) with the real migrations applied, so database
 * tests run in CI with no Neon. Each call returns a fresh, isolated database.
 */

import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { fileURLToPath } from "node:url";
import * as schema from "@/lib/db/schema";
import { seedOrganisations } from "@/lib/db/seed";

const MIGRATIONS = fileURLToPath(new URL("../../../lib/db/migrations", import.meta.url));

export async function createTestDb() {
  const client = new PGlite({ extensions: { pg_trgm } });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  await seedOrganisations(db);
  return { db, client };
}

let counter = 0;

/** Insert a minimal user row and return its id. */
export async function makeUser(db: Awaited<ReturnType<typeof createTestDb>>["db"], name = "Test") {
  const id = `user_${++counter}`;
  await db.insert(schema.user).values({ id, name, email: `${id}@example.test` });
  return id;
}
