import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { cases, organisations, places } from "@/lib/db/schema";
import { LOST_FOUND_CATEGORIES } from "@/lib/db/schema/content/enums";
import { categoryLabel } from "@/components/domain/lostfound/categoryLabel";
import { pick, type Locale } from "@/lib/i18n/config";
import type { Option } from "./Forms";

/** The two bodies that run a desk, for select lists. */
export async function deskOptions(db: AuditExecutor, locale: Locale): Promise<Option[]> {
  const rows = await db.select().from(organisations).where(inArray(organisations.slug, ["tusu", "tusc"])).orderBy(asc(organisations.id));
  return rows.map((o) => ({ value: String(o.id), label: pick({ th: o.nameTh, en: o.nameEn }, locale) }));
}

/** Published places, for "where it was found". */
export async function placeOptions(db: AuditExecutor, locale: Locale): Promise<Option[]> {
  const rows = await db.select({ id: places.id, nameTh: places.nameTh, nameEn: places.nameEn }).from(places).where(eq(places.status, "published")).orderBy(asc(places.nameEn)).limit(500);
  return rows.map((p) => ({ value: p.id, label: pick({ th: p.nameTh, en: p.nameEn }, locale) || p.nameEn || p.nameTh }));
}

export function categoryOptions(locale: Locale): Option[] {
  return LOST_FOUND_CATEGORIES.map((value) => ({ value, label: categoryLabel(value, locale) }));
}

/** Reference and status for a few cases, by id. */
export async function caseRefs(db: AuditExecutor, ids: string[]): Promise<Map<string, { reference: string; status: string; kind: string }>> {
  if (ids.length === 0) return new Map();
  const rows = await db.select({ id: cases.id, reference: cases.reference, status: cases.status, kind: cases.kind }).from(cases).where(and(inArray(cases.id, ids)));
  return new Map(rows.map((r) => [r.id, r]));
}
