import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import type { AuditExecutor } from "@/lib/db/audit";
import { servicePages, type ServiceTextOverrideJson } from "@/lib/db/schema";
import { CACHE_TAGS, REVALIDATE, cachedRead } from "./cache";
import { safeFetch } from "./safe-fetch";
import { mergeServiceText, type ServicePageKey, type ServicePageText } from "./service-pages";

/** The stored overrides from the published Service pages row, or none. */
export async function readServiceTextOverrides(db: AuditExecutor): Promise<Record<string, ServiceTextOverrideJson>> {
  const [row] = await db.select({ texts: servicePages.texts }).from(servicePages).where(eq(servicePages.status, "published")).limit(1);
  return row?.texts ?? {};
}

const cachedOverrides = cachedRead(["service-pages"], [CACHE_TAGS.servicePages], REVALIDATE.content, () => readServiceTextOverrides(getDb()));

/** The wording for one service start page, with the console's edits over the built-in text. */
export async function getServicePageText<P extends ServicePageKey>(page: P): Promise<ServicePageText<P>> {
  const stored = await safeFetch<Record<string, ServiceTextOverrideJson>>("getServicePageText", () => cachedOverrides(), {});
  return mergeServiceText(page, stored);
}
