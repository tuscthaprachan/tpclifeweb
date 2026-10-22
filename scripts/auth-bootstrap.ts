/**
 * Makes the first admin invite: `npm run auth:bootstrap -- <email> <organisation-slug>`
 *
 * Prints a link to open in a browser. The link is the only copy of the token
 * (the database keeps just its hash), so run it again if it is lost. It refuses
 * as soon as any admin exists, so it cannot be used to add people later.
 *
 * Needs DATABASE_URL and BETTER_AUTH_URL (from the environment or .env.local),
 * and the organisations seeded (`npm run db:seed`).
 */

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { BootstrapError, runBootstrap } from "@/lib/auth/bootstrap";
import * as schema from "@/lib/db/schema";

async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Fall back to the real environment.
  }
  const [email, organisationSlug] = process.argv.slice(2);
  if (!email || !organisationSlug) {
    console.error("Usage: npm run auth:bootstrap -- <email> <organisation-slug>   (slug: tusu or tusc)");
    process.exit(2);
  }
  const url = process.env.DATABASE_URL;
  const baseUrl = process.env.BETTER_AUTH_URL;
  if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");
  if (!baseUrl) throw new Error("BETTER_AUTH_URL is not set. See .env.example.");

  const pool = new Pool({ connectionString: url });
  try {
    const result = await runBootstrap(drizzle(pool, { schema }), { email, organisationSlug, baseUrl });
    console.log(`\nAdmin invitation for ${result.email} at ${result.organisationName}.`);
    console.log(`Open this link before ${result.expiresAt.toISOString()}:\n\n  ${result.link}\n`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  if (error instanceof BootstrapError) {
    console.error(`\n${error.message}\n`);
    process.exit(1);
  }
  console.error(error);
  process.exit(1);
});
