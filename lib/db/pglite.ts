/**
 * Opens a PGlite database for `DATABASE_URL=pglite:...` (see `lib/db/index.ts`).
 * Only ever imported dynamically, so PGlite (a devDependency) stays out of
 * production bundles.
 *
 * A fresh database gets the migrations and the full content seed on first use,
 * so `pglite:memory` gives a complete, seeded site with nothing to set up. For
 * `pglite:<directory>` the seed runs only when the directory holds no site
 * settings yet, so content edited in development survives a restart. Do not
 * point two processes at one directory: PGlite is single-process, so use
 * `pglite:memory` for `next build` and for tests.
 */

import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";
import { siteSettings } from "./schema/content/site";
import { seedOrganisations } from "./seed";
import { seedContent } from "./seed/content";

export async function openPglite({ dataDir }: { dataDir: string | undefined }) {
  const client = new PGlite(dataDir ? path.resolve(dataDir) : undefined);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "lib/db/migrations") });
  const existing = await db.select({ id: siteSettings.id }).from(siteSettings).limit(1);
  if (existing.length === 0) {
    await seedOrganisations(db);
    await seedContent(db);
  }
  return db;
}
