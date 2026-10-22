/**
 * Seed script: `npm run db:seed`. Idempotent, so safe to re-run. Seeds the two
 * organisations and all website content (lib/db/seed/*: site settings, forms,
 * shuttle, directory, handbook pages, FAQs, places, the surveyed canteen).
 * Staff accounts are invited in-app, never seeded. Re-running overwrites the
 * seeded fields of seeded rows, so do not run it against a database whose
 * editors have changed them.
 *
 * Names match STUDENT_BODIES in data/harvested-inventory.ts. Run with tsx, so
 * this file imports no `server-only` module and builds its own connection.
 */

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import type { AuditExecutor } from "./audit";
import { organisations } from "./schema/organisations";
import { seedContent } from "./seed/content";

export const ORGANISATION_SEED = [
  {
    slug: "tusu",
    nameTh: "องค์การนักศึกษามหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์",
    nameEn: "Thammasat University Student Union, Tha Prachan",
  },
  {
    slug: "tusc",
    nameTh: "สภานักศึกษามหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์",
    nameEn: "Thammasat University Student Council, Tha Prachan",
  },
] as const;

/** Upsert TUSU and TUSC by slug. */
export async function seedOrganisations(db: AuditExecutor): Promise<void> {
  await db
    .insert(organisations)
    .values([...ORGANISATION_SEED])
    .onConflictDoUpdate({
      target: organisations.slug,
      set: { nameTh: sql`excluded.name_th`, nameEn: sql`excluded.name_en` },
    });
}

async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Fall back to the real environment.
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");
  const pool = new Pool({ connectionString: url });
  try {
    const db = drizzle(pool, { schema: await import("./schema") });
    await seedOrganisations(db);
    console.log(`Seeded ${ORGANISATION_SEED.length} organisations.`);
    await seedContent(db);
    console.log("Seeded website content.");
  } finally {
    await pool.end();
  }
}

// Only run when executed directly (tsx lib/db/seed.ts), not when imported by tests.
if (process.argv[1]?.endsWith("seed.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
