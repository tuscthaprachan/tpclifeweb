import "server-only";

import { eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import type { AuditExecutor } from "@/lib/db/audit";
import { siteText } from "@/lib/db/schema";
import { getTextOverrides, setTextOverrides, type TextOverrides } from "@/lib/i18n/editable";
import { CACHE_TAGS, REVALIDATE, cachedRead } from "./cache";
import { safeFetchResult } from "./safe-fetch";

/** The stored overrides from the published Site text row, or none. */
export async function readSiteTextOverrides(db: AuditExecutor): Promise<TextOverrides> {
  const [row] = await db.select({ texts: siteText.texts }).from(siteText).where(eq(siteText.status, "published")).limit(1);
  return row?.texts ?? {};
}

const cachedOverrides = cachedRead(["site-text"], [CACHE_TAGS.siteText], REVALIDATE.content, () => readSiteTextOverrides(getDb()));

/**
 * Loads the published overrides and applies them to every editable
 * dictionary in this process. The root layouts await this before rendering
 * anything else; share images and emails call it too. Returns what it applied,
 * for the browser boot script. Never throws: without a database the site keeps
 * its built-in text.
 */
export async function ensureSiteText(): Promise<TextOverrides> {
  if (!isDatabaseConfigured()) return getTextOverrides();
  const result = await safeFetchResult<TextOverrides | null>("ensureSiteText", () => loadOverrides(), null);
  // A failed or skipped read keeps whatever this process already shows.
  if (!result.ok || result.data === null) return getTextOverrides();
  setTextOverrides(result.data);
  return result.data;
}

/**
 * The cached read, or null outside a Next request (unit tests, scripts), where
 * the data cache does not exist. Emails and pages always run inside one.
 */
async function loadOverrides(): Promise<TextOverrides | null> {
  try {
    return await cachedOverrides();
  } catch (error) {
    if (error instanceof Error && error.message.includes("incrementalCache missing")) return null;
    throw error;
  }
}
