import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import type { AuditExecutor } from "@/lib/db/audit";
import { forms, type FormRow } from "@/lib/db/schema";
import { CACHE_TAGS, REVALIDATE, cachedRead } from "./cache";
import { ci, iso, ls, lsOpt, ltOpt, opt, richPairOpt, withKeys } from "./map";
import { safeFetch } from "./safe-fetch";
import type { FormRecord } from "./types";

export function toFormRecord(row: FormRow): FormRecord {
  return {
    _id: row.id,
    _type: "form",
    _createdAt: iso(row.createdAt),
    _updatedAt: iso(row.updatedAt),
    title: ls(row.titleTh, row.titleEn),
    slug: { current: row.slug },
    purpose: ls(row.purposeTh, row.purposeEn),
    description: richPairOpt(row.descriptionTh, row.descriptionEn),
    category: row.category,
    owner: row.owner,
    audience: ltOpt(row.audienceTh, row.audienceEn),
    prerequisites: row.prerequisites.length > 0 ? withKeys(row.prerequisites) : undefined,
    requiresSignIn: row.requiresSignIn,
    signInType: opt(row.signInType),
    signInNote: lsOpt(row.signInNoteTh, row.signInNoteEn),
    destinationType: row.destinationType,
    destinationUrl: opt(row.destinationUrl),
    estimatedMinutes: opt(row.estimatedMinutes),
    turnaround: lsOpt(row.turnaroundTh, row.turnaroundEn),
    deadline: opt(row.deadline),
    contact: opt(row.contact),
    isActive: row.isActive,
    isPriority: row.isPriority,
    lastVerified: opt(row.lastVerified),
  };
}

/** Published forms by id, in the order asked for. Used for related-form lists. */
export async function readFormsByIds(db: AuditExecutor, ids: readonly string[]): Promise<Map<string, FormRecord>> {
  const out = new Map<string, FormRecord>();
  if (ids.length === 0) return out;
  const rows = await db
    .select()
    .from(forms)
    .where(and(eq(forms.status, "published"), inArray(forms.id, [...new Set(ids)])));
  for (const row of rows) out.set(row.id, toFormRecord(row));
  return out;
}

/** Active forms, priority first, then A to Z by English title. */
export async function readForms(db: AuditExecutor, priorityOnly = false): Promise<FormRecord[]> {
  const rows = await db
    .select()
    .from(forms)
    .where(
      and(
        eq(forms.status, "published"),
        eq(forms.isActive, true),
        priorityOnly ? eq(forms.isPriority, true) : undefined,
      ),
    )
    .orderBy(desc(forms.isPriority), ci(forms.titleEn), asc(forms.slug));
  return rows.map(toFormRecord);
}

/** One form by slug. Like the CMS query this does not filter on `isActive`: a retired form still has a page that says so. */
export async function readFormBySlug(db: AuditExecutor, slug: string): Promise<FormRecord | null> {
  const [row] = await db
    .select()
    .from(forms)
    .where(and(eq(forms.status, "published"), eq(forms.slug, slug)))
    .limit(1);
  return row ? toFormRecord(row) : null;
}

const cachedForms = cachedRead(["forms"], [CACHE_TAGS.form], REVALIDATE.content, () => readForms(getDb()));
const cachedPriorityForms = cachedRead(["forms-priority"], [CACHE_TAGS.form], REVALIDATE.content, () =>
  readForms(getDb(), true),
);
const cachedFormBySlug = cachedRead(["form-by-slug"], [CACHE_TAGS.form], REVALIDATE.content, (slug: string) =>
  readFormBySlug(getDb(), slug),
);

export async function getForms(): Promise<FormRecord[]> {
  return safeFetch<FormRecord[]>("getForms", () => cachedForms(), []);
}

export async function getPriorityForms(): Promise<FormRecord[]> {
  return safeFetch<FormRecord[]>("getPriorityForms", () => cachedPriorityForms(), []);
}

export async function getFormBySlug(slug: string): Promise<FormRecord | null> {
  return safeFetch<FormRecord | null>("getFormBySlug", () => cachedFormBySlug(slug), null);
}
