import { z } from "zod";
import type { FieldKit } from "@/lib/admin/content/fields";
import type { AdminKey } from "@/lib/i18n/admin";
import type { ExternalLinkJson } from "@/lib/db/schema/content/common";
import type { FormPrerequisiteJson } from "@/lib/db/schema/content/forms";

/** A row the staff member added but left empty: nothing typed and no tick. */
export function isBlankRow(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "boolean") return !value;
  if (typeof value === "object") return Object.values(value).every(isBlankRow);
  return false;
}

/**
 * A list of records. Empty rows come out as null instead of being removed, so
 * an error in row 3 still reports "links.2.url" whatever rows came before it.
 */
export function rowList<T extends z.ZodType>(row: T, max: number) {
  return z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(z.preprocess((v) => (isBlankRow(v) ? null : v), row.nullable())).max(max),
  ) as z.ZodType<(z.output<T> | null)[]>;
}

export const kept = <T>(rows: readonly (T | null)[]): T[] => rows.filter((r): r is T => r !== null);

const pair = (p: { th: string; en: string }) => ({ th: p.th, en: p.en });
const optionalPair = (p: { th: string; en: string }) => (p.th || p.en ? pair(p) : undefined);

/** A label as it reads in an error message: "Detail (optional)" becomes "Detail". */
export const bare = (label: string): string => label.replace(/\s*\((?:optional|ไม่บังคับ)\)/, "");

type L = (key: AdminKey) => string;

export function externalLinks(k: FieldKit, L: L) {
  return rowList(
    z.object({
      label: k.bilingual(L("pagesFieldLinkLabel"), { required: true, max: 200 }),
      url: k.url(L("pagesFieldLinkUrl"), { required: true }),
      description: k.bilingual(bare(L("pagesFieldLinkDescription")), { max: 300 }),
      requiresSignIn: k.checkbox(),
    }),
    20,
  );
}

/** The parsed rows as stored in `content_pages.related_links`. */
export function toExternalLinks(rows: ReturnType<typeof externalLinks> extends z.ZodType<infer R> ? R : never): ExternalLinkJson[] {
  return kept(rows).map((r) => ({
    label: pair(r.label),
    url: r.url!,
    ...(optionalPair(r.description) ? { description: optionalPair(r.description) } : {}),
    ...(r.requiresSignIn ? { requiresSignIn: true } : {}),
  }));
}

export function prerequisites(k: FieldKit, L: L) {
  return rowList(
    z.object({
      label: k.bilingual(L("formsFieldPrerequisiteLabel"), { required: true, max: 200 }),
      detail: k.bilingual(bare(L("formsFieldPrerequisiteDetail")), { max: 500 }),
    }),
    30,
  );
}

export function toPrerequisites(rows: ReturnType<typeof prerequisites> extends z.ZodType<infer R> ? R : never): FormPrerequisiteJson[] {
  return kept(rows).map((r) => ({ label: pair(r.label), ...(optionalPair(r.detail) ? { detail: optionalPair(r.detail) } : {}) }));
}
