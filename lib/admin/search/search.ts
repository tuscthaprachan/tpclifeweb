import "server-only";

import type { ConsoleIconName } from "@/components/admin/icons";
import { canEditContent } from "@/lib/admin/content/access";
import { listContentRows } from "@/lib/admin/content/list";
import { CONTENT_TYPES, contentPath } from "@/lib/admin/content/types";
import { buildConsoleNav } from "@/lib/admin/nav";
import type { ActiveRole } from "@/lib/auth/roles";
import { canUseCaseInbox } from "@/lib/cases/access";
import { listCases } from "@/lib/cases/engine";
import { getServiceDef, SERVICES } from "@/lib/cases/services";
import type { StaffActor } from "@/lib/cases/types";
import type { AuditExecutor } from "@/lib/db/audit";
import { a } from "@/lib/i18n/admin";
import { pick, type Locale } from "@/lib/i18n/config";

/** One hit, in the shape the command palette renders. */
export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  icon: ConsoleIconName;
  group: string;
}

export const SEARCH_MIN_CHARS = 2;
export const SEARCH_MAX_CHARS = 80;
const PER_TYPE = 4;
const CASE_LIMIT = 6;

/**
 * Searches what this person could open anyway: content they can edit (both
 * languages) and cases the case engine lets them see. Content goes through the
 * same list query the content pages use, cases through `listCases`, so
 * wildcard escaping, service access and restricted complaint categories are
 * decided in one place each. `actor` is null for staff with no case role.
 */
export async function searchConsole(
  db: AuditExecutor,
  input: { roles: readonly ActiveRole[]; actor: StaffActor | null; q: string; locale: Locale },
): Promise<SearchResult[]> {
  const q = input.q.trim().slice(0, SEARCH_MAX_CHARS);
  if (q.length < SEARCH_MIN_CHARS) return [];
  const { roles, actor, locale } = input;

  const content = canEditContent(roles) ? contentResults(db, roles, q, locale) : Promise.resolve([]);
  const caseHits = actor && canUseCaseInbox(roles) ? caseResults(db, actor, q, locale) : Promise.resolve([]);
  const [fromContent, fromCases] = await Promise.all([content, caseHits]);
  return [...fromCases, ...fromContent];
}

async function contentResults(db: AuditExecutor, roles: readonly ActiveRole[], q: string, locale: Locale): Promise<SearchResult[]> {
  const iconOf = new Map(buildConsoleNav(roles).groups.flatMap((g) => g.items.map((i) => [i.id, i.icon] as const)));
  const defs = CONTENT_TYPES.filter((d) => d.available && d.kind === "collection" && d.columns.title);
  const perType = await Promise.all(
    defs.map(async (def) => {
      const { rows } = await listContentRows(db, def, { q, limit: PER_TYPE });
      const typeLabel = a(def.labelKey, locale);
      return rows.map(
        (row): SearchResult => ({
          id: `content-${def.key}-${row.id}`,
          title: pick(row.title, locale) || pick({ th: row.title.en, en: row.title.th }, locale) || a("chUntitled", locale),
          subtitle: [typeLabel, row.status ? a(row.status === "published" ? "statusPublished" : "statusDraft", locale) : null].filter(Boolean).join(", "),
          href: contentPath(def, row.id),
          icon: iconOf.get(`content-${def.key}`) ?? "edit",
          group: a("chSearchContent", locale, { type: typeLabel }),
        }),
      );
    }),
  );
  return perType.flat();
}

async function caseResults(db: AuditExecutor, actor: StaffActor, q: string, locale: Locale): Promise<SearchResult[]> {
  const { rows } = await listCases(db, actor, { q, pageSize: CASE_LIMIT });
  return rows.map((row) => ({
    id: `case-${row.id}`,
    title: row.reference,
    subtitle: [pick(getServiceDef(row.service).label, locale), pick(SERVICES[row.service].kinds[row.kind]?.label, locale), row.summary].filter(Boolean).join(", "),
    href: `/admin/cases/${row.id}`,
    icon: "cases",
    group: a("chSearchCases", locale),
  }));
}
