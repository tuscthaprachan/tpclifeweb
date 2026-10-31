/**
 * Mirrors the original open data files so nothing depends on Drive:
 *
 *   npm run open-data:mirror -- --dry-run [--only 01,02]   download and report sizes; touches no database or storage
 *   npm run open-data:mirror -- [--only 01,02]             download, upload as public objects, record on the document row
 *
 * Needs DATABASE_URL and the storage token for the live run. Documents that
 * already have a file key are skipped, so it is safe to re-run.
 */

import { readFileSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { OPEN_DATA_DIR } from "@/lib/open-data/import";
import { parsePgliteUrl } from "@/lib/db/lazy";
import * as schema from "@/lib/db/schema";
import { getStorage, validateUpload } from "@/lib/storage";

interface ManifestEntry {
  n: string;
  driveUrl: string;
  bytes: number;
}

export function downloadUrl(driveUrl: string): string | null {
  const file = /\/file\/d\/([\w-]+)/.exec(driveUrl);
  if (file) return `https://drive.usercontent.google.com/download?id=${file[1]}&export=download&confirm=t`;
  const sheet = /\/spreadsheets\/d\/([\w-]+)/.exec(driveUrl);
  if (sheet) return `https://docs.google.com/spreadsheets/d/${sheet[1]}/export?format=csv`;
  return null;
}

async function download(url: string): Promise<Uint8Array> {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Fall back to the real environment.
  }
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const onlyAt = args.indexOf("--only");
  const only = onlyAt >= 0 ? new Set((args[onlyAt + 1] ?? "").split(",").filter(Boolean)) : null;
  const manifest = (JSON.parse(readFileSync(`${OPEN_DATA_DIR}/manifest.json`, "utf8")) as ManifestEntry[]).filter(
    (entry) => !only || only.has(entry.n),
  );

  let pool: Pool | null = null;
  let closeLite: (() => Promise<void>) | null = null;
  let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
  if (!dryRun) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");
    const local = parsePgliteUrl(url);
    if (local) {
      const opened = await (await import("@/lib/db/pglite")).openPglite(local);
      closeLite = () => opened.$client.close();
      db = opened as unknown as typeof db;
    } else {
      pool = new Pool({ connectionString: url });
      db = drizzle(pool, { schema });
    }
  }

  let failed = 0;
  let total = 0;
  try {
    for (const entry of manifest) {
      const url = downloadUrl(entry.driveUrl);
      if (!url) {
        console.error(`${entry.n}: no download address for ${entry.driveUrl}`);
        failed++;
        continue;
      }
      try {
        const [row] = db
          ? await db
              .select()
              .from(schema.openDataDocuments)
              .where(and(eq(schema.openDataDocuments.owner, "tusc"), eq(schema.openDataDocuments.number, entry.n)))
          : [];
        if (db && !row) throw new Error("no document row; run npm run db:seed first");
        if (row?.fileKey) {
          console.log(`${entry.n}: already mirrored`);
          continue;
        }
        const bytes = await download(url);
        const check = validateUpload(bytes, "document");
        if (!check.ok) throw new Error(`not a PDF or CSV (${check.code})`);
        total += bytes.length;
        if (dryRun || !db || !row) {
          console.log(`${entry.n}: ${bytes.length} bytes, ${check.contentType}, manifest says ${entry.bytes}`);
          continue;
        }
        const stored = await getStorage().put(`open-data/tusc/${row.slug}.${check.extension}`, bytes, {
          visibility: "public",
          contentType: check.contentType,
          maxBytes: 30 * 1024 * 1024,
        });
        await db
          .update(schema.openDataDocuments)
          .set({ fileKey: stored.key, fileUrl: stored.url ?? null, fileBytes: stored.size, fileContentType: stored.contentType })
          .where(eq(schema.openDataDocuments.id, row.id));
        console.log(`${entry.n}: mirrored ${stored.key} (${stored.size} bytes)`);
      } catch (error) {
        failed++;
        console.error(`${entry.n}: ${error instanceof Error ? error.message : error}`);
      }
    }
  } finally {
    await pool?.end();
    await closeLite?.();
  }
  console.log(`${manifest.length - failed} of ${manifest.length} done, ${total} bytes downloaded${dryRun ? " (dry run)" : ""}.`);
  if (failed > 0) process.exit(1);
}

if (process.argv[1]?.endsWith("open-data-mirror.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
