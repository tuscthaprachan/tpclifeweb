import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit reads no .env files itself, so load `.env.local` here when it
 * exists. `generate` and `studio` never need a live database; `migrate` does.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: rely on the real environment (CI, Vercel).
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema/index.ts",
  out: "./lib/db/migrations",
  dbCredentials: {
    // `generate` ignores this; the placeholder only keeps the config valid.
    url: process.env.DATABASE_URL ?? "postgres://placeholder@localhost/placeholder",
  },
});
