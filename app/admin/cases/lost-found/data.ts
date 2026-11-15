import "server-only";

import { and, asc, inArray } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { cases, organisations } from "@/lib/db/schema";
import { LOST_FOUND_CATEGORIES } from "@/lib/db/schema/content/enums";
import { categoryLabel } from "@/components/domain/lostfound/categoryLabel";
import { pick, type Locale } from "@/lib/i18n/config";
import type { Option } from "./Forms";

/** The two bodies that run a desk, for select lists. */
export async function deskOptions(db: AuditExecutor, locale: Locale): Promise<Option[]> {
  const rows = await db.select().from(organisations).where(inArray(organisations.slug, ["tusu", "tusc"])).orderBy(asc(organisations.id));
  return rows.map((o) => ({ value: String(o.id), label: pick({ th: o.nameTh, en: o.nameEn }, locale) }));
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
