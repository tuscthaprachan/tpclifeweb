import { importOpenData } from "../../open-data/import";
import type { SeedDb } from "./util";

/**
 * The student body open data: the 49 TUSC source documents with their
 * transcriptions, people, bodies, meetings, decisions, budget lines, funds and
 * report data (lib/open-data/import.ts). Inserted if missing and never
 * overwritten, so a re-run keeps every edit made in the admin console.
 * Returns the number of rows added.
 */
export async function seedOpenData(db: SeedDb): Promise<number> {
  const counts = await importOpenData(db);
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}
