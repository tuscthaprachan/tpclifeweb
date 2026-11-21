import { asc } from "drizzle-orm";
import Form from "next/form";
import { FormPageHeader } from "@/app/admin/content/_list/FormPageHeader";
import { contentTypeBySegment } from "@/app/admin/content/_list/placement";
import { parsePage, queryString, ResultCount } from "@/app/admin/content/_list/parts";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { ConsolePage, EmptyPanel, FilterChips, SearchField, Toolbar } from "@/components/admin/ui";
import { Button, Pagination, Select } from "@/components/ui";
import { requireEditor } from "@/lib/admin/content/access";
import { userNames } from "@/lib/admin/content/list";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { siteText } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { pick } from "@/lib/i18n/config";
import { textKey } from "@/lib/i18n/editable";
import { editableDictionaries } from "@/lib/i18n/site-text-registry";
import { SiteTextForm, type SiteTextRow } from "./SiteTextForm";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("typeSiteText", locale) };
}

type Search = { q?: string; ns?: string; edited?: string; page?: string; saved?: string };

/**
 * Every built-in string on the public site, searchable, a page at a time. A
 * singleton: saving writes the one Site text row.
 */
export default async function SiteTextPage({ searchParams }: { searchParams: Promise<Search> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const needle = q.toLowerCase();
  const editedOnly = params.edited === "1";

  const db = getDb();
  const [row] = await db.select().from(siteText).orderBy(asc(siteText.createdAt)).limit(1);
  const stored = row?.texts ?? {};
  const names = await userNames(db, [row?.updatedBy]);

  const dictionaries = editableDictionaries().sort((x, y) =>
    x.namespace === "ui" ? -1 : y.namespace === "ui" ? 1 : pick(x.label, locale).localeCompare(pick(y.label, locale)),
  );
  const ns = dictionaries.some((d) => d.namespace === params.ns) ? params.ns : undefined;

  const all: SiteTextRow[] = [];
  for (const dict of dictionaries) {
    if (ns && dict.namespace !== ns) continue;
    for (const [key, fallback] of Object.entries(dict.defaults)) {
      const full = textKey(dict.namespace, key);
      const override = stored[full];
      const edited = Boolean(override?.th || override?.en);
      if (editedOnly && !edited) continue;
      const current = { th: override?.th || fallback.th, en: override?.en || fallback.en };
      if (needle && ![full, fallback.th, fallback.en, current.th, current.en].some((s) => s.toLowerCase().includes(needle))) continue;
      all.push({ key: full, group: dict.label, fallback, current, edited });
    }
  }

  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const page = Math.min(parsePage(params.page), totalPages);
  const rows = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const base = { q: q || undefined, ns, edited: editedOnly ? "1" : undefined };
  const href = (extra: Record<string, string | number | undefined>) => `/admin/content/site-text${queryString({ ...base, ...extra })}`;
  const editedCount = Object.values(stored).filter((o) => o.th || o.en).length;

  return (
    <ConsolePage width="wide">
      <FormPageHeader def={contentTypeBySegment("site-text")} locale={locale} mode="page" />
      <p className="m-0 max-w-prose">{a("sitIntro", locale)}</p>
      <Toolbar
        search={
          <SearchField
            label={a("sitSearch", locale)}
            submitLabel={a("sitSearchButton", locale)}
            defaultValue={q}
            hidden={{ ...(ns ? { ns } : {}), ...(editedOnly ? { edited: "1" } : {}) }}
          />
        }
        filters={
          <>
            <FilterChips
              label={a("sitFilterLabel", locale)}
              current={editedOnly ? "edited" : "all"}
              options={[
                { id: "all", label: a("sitFilterAll", locale), href: href({ edited: undefined }) },
                { id: "edited", label: a("sitFilterEdited", locale), href: href({ edited: "1" }), count: editedCount },
              ]}
            />
            <Form action="" className="flex flex-wrap items-end gap-[var(--space-2)]">
              {q ? <input type="hidden" name="q" value={q} /> : null}
              {editedOnly ? <input type="hidden" name="edited" value="1" /> : null}
              <Select
                id="site-text-group"
                name="ns"
                label={a("sitGroup", locale)}
                defaultValue={ns ?? ""}
                options={[
                  { value: "", label: a("sitGroupAll", locale) },
                  ...dictionaries.map((d) => ({ value: d.namespace, label: `${pick(d.label, locale)} (${Object.keys(d.defaults).length})` })),
                ]}
              />
              <Button type="submit" variant="secondary">
                {a("sitGroupApply", locale)}
              </Button>
            </Form>
          </>
        }
      />
      <ResultCount text={a("sitCount", locale, { count: all.length })} />
      {rows.length === 0 ? (
        <EmptyPanel title={a("sitEmpty", locale)} />
      ) : (
        <>
          <SiteTextForm
            locale={locale}
            rows={rows}
            recordId={row?.id ?? null}
            record={
              row
                ? { id: row.id, status: row.status, updatedAt: row.updatedAt.toISOString(), updatedByName: row.updatedBy ? names.get(row.updatedBy) : null }
                : undefined
            }
            saved={params.saved}
            returnQuery={queryString({ ...base, page: page > 1 ? page : undefined })}
          />
          {totalPages > 1 ? <Pagination currentPage={page} totalPages={totalPages} buildHref={(p) => href({ page: p > 1 ? p : undefined })} locale={locale} /> : null}
        </>
      )}
    </ConsolePage>
  );
}
