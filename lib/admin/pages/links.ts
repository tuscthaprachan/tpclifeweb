import "server-only";

import { canEditContent } from "@/lib/admin/content/access";
import { listContentRows } from "@/lib/admin/content/list";
import { CONTENT_TYPES, hasPublicPage, viewPathOf } from "@/lib/admin/content/types";
import { SECTIONS } from "@/lib/content/sections";
import type { ActiveRole } from "@/lib/auth/roles";
import type { AuditExecutor } from "@/lib/db/audit";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { pick, type Locale } from "@/lib/i18n/config";

/** One page an editor can link to. `path` has no language prefix; the editor adds the language of the text being written. */
export interface PageLink {
  id: string;
  title: string;
  subtitle: string;
  path: string;
}

export const PAGE_SEARCH_MIN_CHARS = 2;
const PER_TYPE = 4;
const MAX_RESULTS = 16;

const STATIC_PAGES: ReadonlyArray<{ path: string; key: AdminKey }> = [
  { path: "/", key: "edPageHome" },
  { path: "/services", key: "edPageServices" },
  { path: "/forms", key: "edPageForms" },
  { path: "/getting-around", key: "edPageGettingAround" },
  { path: "/news", key: "edPageNews" },
  { path: "/events", key: "edPageEvents" },
  { path: "/policy", key: "edPagePolicy" },
  { path: "/directory", key: "edPageDirectory" },
  { path: "/faq", key: "edPageFaq" },
  { path: "/about", key: "edPageAbout" },
  { path: "/lost-and-found", key: "edPageLostFound" },
  { path: "/complaints", key: "edPageComplaints" },
  { path: "/borrow", key: "edPageBorrow" },
  { path: "/eat", key: "edPageEat" },
  { path: "/accessibility", key: "edPageAccessibility" },
];

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Pages of the public site matching `q`: the main sections by name in either
 * language, then published content with a public page by title. Only what an
 * editor can already open in the console, and only published rows.
 */
export async function searchPageLinks(db: AuditExecutor, input: { roles: readonly ActiveRole[]; q: string; locale: Locale }): Promise<PageLink[]> {
  const q = norm(input.q).slice(0, 80);
  if (q.length < PAGE_SEARCH_MIN_CHARS || !canEditContent(input.roles)) return [];
  const { locale } = input;

  const hubs = Object.values(SECTIONS).filter(({ path, label }) => `${norm(label.th)} ${norm(label.en)} ${path}`.includes(q)).map(
    ({ path, label }): PageLink => ({ id: `page-${path}`, title: pick(label, locale), subtitle: path, path }),
  );
  const sections = STATIC_PAGES.filter(({ path, key }) => `${norm(a(key, "th"))} ${norm(a(key, "en"))} ${path}`.includes(q)).map(
    ({ path, key }): PageLink => ({ id: `page-${path}`, title: a(key, locale), subtitle: path, path }),
  );

  const defs = CONTENT_TYPES.filter((d) => d.available && d.kind === "collection" && d.columns.title && hasPublicPage(d));
  const perType = await Promise.all(
    defs.map(async (def) => {
      const { rows } = await listContentRows(db, def, { q, limit: PER_TYPE, status: "published", withEditor: true });
      return rows
        .flatMap((row) => {
          const path = viewPathOf(def, row);
          return path ? [{ row, path }] : [];
        })
        .map(
          ({ row, path }): PageLink => ({
            id: `content-${def.key}-${row.id}`,
            title: pick(row.title, locale) || pick({ th: row.title.en, en: row.title.th }, locale) || a("chUntitled", locale),
            subtitle: a(def.labelKey, locale),
            path,
          }),
        );
    }),
  );
  return [...sections, ...hubs, ...perType.flat()].slice(0, MAX_RESULTS);
}
