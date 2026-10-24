/**
 * Break-glass access for staff accounts, run from a machine with the production
 * DATABASE_URL:
 *
 *   npm run auth:bootstrap -- <email> <organisation-slug>   first admin invitation (slug: tusu or tusc)
 *   npm run auth:bootstrap -- --recover <email>             24 hour recovery link for an existing admin
 *
 * Both print a link to open in a browser. The link is the only copy of the token
 * (the database keeps just its hash), so run the command again if it is lost.
 * The first form refuses as soon as any admin exists, so it cannot be used to add
 * people later. The second is for when every admin has lost their passkeys and
 * nobody can issue a recovery link from /admin/staff; it is audited like any other.
 *
 * Needs DATABASE_URL and BETTER_AUTH_URL (from the environment or .env.local),
 * and for the first form the organisations seeded (`npm run db:seed`).
 */

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { BootstrapError, runBootstrap, runRecovery } from "@/lib/auth/bootstrap";
import * as schema from "@/lib/db/schema";

const USAGE = [
  "Usage:",
  "  npm run auth:bootstrap -- <email> <organisation-slug>   (slug: tusu or tusc)",
  "  npm run auth:bootstrap -- --recover <email>",
].join("\n");

async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Fall back to the real environment.
  }
  const args = process.argv.slice(2);
  const recover = args[0] === "--recover";
  const [first, second] = recover ? args.slice(1) : args;
  if (!first || (!recover && !second)) {
    console.error(USAGE);
    process.exit(2);
  }
  const url = process.env.DATABASE_URL;
  const baseUrl = process.env.BETTER_AUTH_URL;
  if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");
  if (!baseUrl) throw new Error("BETTER_AUTH_URL is not set. See .env.example.");

  const pool = new Pool({ connectionString: url });
  try {
    const db = drizzle(pool, { schema });
    if (recover) {
      const result = await runRecovery(db, { email: first, baseUrl });
      console.log(`\nRecovery link for ${result.email}.`);
      console.log(`Send it to them privately. It works once, and only before ${result.expiresAt.toISOString()}:\n\n  ${result.link}\n`);
    } else {
      const result = await runBootstrap(db, { email: first, organisationSlug: second as string, baseUrl });
      console.log(`\nAdmin invitation for ${result.email} at ${result.organisationName}.`);
      console.log(`Open this link before ${result.expiresAt.toISOString()}. It lets you create your account by registering a passkey:\n\n  ${result.link}\n`);
    }
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
