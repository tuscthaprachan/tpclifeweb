/**
 * Small helpers shared by the read modules: turning columns into the contract
 * shapes in `lib/content/types.ts`. Pure, so they can be unit tested.
 */

import { sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import type { LocaleRichText } from "@/lib/rich-text/types";
import type { LocaleString, LocaleText } from "./types";

export function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export function isoOrUndefined(value: Date | string | null | undefined): string | undefined {
  return value == null ? undefined : iso(value);
}

/** A bilingual pair that is always present. */
export function ls(th: string | null | undefined, en: string | null | undefined): LocaleString {
  return { th: th ?? "", en: en ?? "" };
}

/** A bilingual pair that is optional: absent when both sides are empty. */
export function lsOpt(th: string | null | undefined, en: string | null | undefined): LocaleString | undefined {
  return th || en ? ls(th, en) : undefined;
}

/** As `lsOpt`, for the multi-line `LocaleText` fields. */
export const ltOpt: (th: string | null | undefined, en: string | null | undefined) => LocaleText | undefined = lsOpt;

/** `null` becomes absent, so optional contract fields stay optional. */
export function opt<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}

/** An empty list becomes absent, matching how the CMS omitted unset arrays. */
export function optList<T>(list: readonly T[] | null | undefined): T[] | undefined {
  return list && list.length > 0 ? [...list] : undefined;
}

const EMPTY_DOC = { type: "doc" as const, content: [] };

/** A required rich text field (one document per language). */
export function richPair(th: LocaleRichText["th"] | null | undefined, en: LocaleRichText["en"] | null | undefined): LocaleRichText {
  return { th: th ?? EMPTY_DOC, en: en ?? EMPTY_DOC };
}

/** An optional rich text field: absent when neither language has a document. */
export function richPairOpt(th: LocaleRichText["th"] | null | undefined, en: LocaleRichText["en"] | null | undefined): LocaleRichText | undefined {
  return th || en ? richPair(th, en) : undefined;
}

/**
 * Entries kept inside a jsonb column have no id of their own. Components key
 * their lists on `_key`, so give each entry a stable one from its position.
 */
export function withKeys<T extends object>(list: readonly T[] | null | undefined): Array<T & { _key: string }> {
  return (list ?? []).map((item, index) => ({ ...item, _key: String(index) }));
}

/** Case-insensitive ordering on a text column, the same on every collation. */
export function ci(column: PgColumn): SQL {
  return sql`lower(${column})`;
}

/** Group rows by a key column, keeping their incoming order. */
export function groupBy<T, K>(rows: readonly T[], key: (row: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = out.get(k);
    if (list) list.push(row);
    else out.set(k, [row]);
  }
  return out;
}
