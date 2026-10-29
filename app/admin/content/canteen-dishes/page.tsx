import { asc } from "drizzle-orm";
import { contentPlacement } from "@/app/admin/content/_list/placement";
import { PublishState, queryString, ResultCount, RowAction } from "@/app/admin/content/_list/parts";
import { ConsoleIcon } from "@/components/admin/icons";
import { ConsolePage, EmptyPanel, PageHeader, SearchField, Toolbar } from "@/components/admin/ui";
import { rowTitle } from "@/components/admin/content/ContentList";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Button, DataTable, NotificationBanner, Pagination, Timestamp, type DataTableColumn } from "@/components/ui";
import { requireEditor } from "@/lib/admin/content/access";
import { isUuid } from "@/lib/admin/content/form-state";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { canteenStalls } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { pick } from "@/lib/i18n/config";
import { DISH_PAGE_SIZE, listDishRows, type DishListRow } from "./list";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("typeCanteenDishes", locale) };
}

type SearchParams = { q?: string; stall?: string; page?: string; notice?: string };

/** The dish list: about 750 rows, so it filters by stall and by text and pages. */
export default async function CanteenDishListPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const { q, stall, page: pageParam, notice } = await searchParams;
  const db = getDb();
  const def = getContentType("canteen-dishes")!;
  const stallId = stall && isUuid(stall) ? stall : undefined;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const [stalls, { rows, total }] = await Promise.all([
    db.select({ id: canteenStalls.id, number: canteenStalls.number, nameTh: canteenStalls.nameTh, nameEn: canteenStalls.nameEn }).from(canteenStalls).orderBy(asc(canteenStalls.number)),
    listDishRows(db, { stallId, q, page }),
  ]);
  const chosen = stalls.find((s) => s.id === stallId);
  const stallName = (s: { nameTh: string; nameEn: string }) => pick({ th: s.nameTh || s.nameEn, en: s.nameEn || s.nameTh }, locale);
  const stallByNumber = new Map(stalls.map((s) => [s.number, s]));
  const label = a(def.labelKey, locale);

  const href = (p: number) => `${contentPath(def)}${queryString({ q, stall: stallId, page: p > 1 ? p : undefined })}`;

  const columns: DataTableColumn<DishListRow>[] = [
    {
      id: "name",
      header: a("canteenColName", locale),
      cell: (row) => (
        <a href={contentPath(def, row.id)} className="font-medium">
          {rowTitle(row.name, locale)}
        </a>
      ),
    },
    {
      id: "stall",
      header: a("canteenColStall", locale),
      cell: (row) => {
        const s = stallByNumber.get(row.stallNumber);
        return s ? `${s.number}. ${stallName(s)}` : String(row.stallNumber);
      },
    },
    { id: "price", header: a("canteenColPrice", locale), align: "end", cell: (row) => row.price },
    { id: "checked", header: a("canteenColChecked", locale), cell: (row) => row.checkedOn },
    { id: "status", header: a("listStatus", locale), cell: (row) => <PublishState published={row.status === "published"} locale={locale} /> },
    { id: "updated", header: a("listUpdated", locale), cell: (row) => <Timestamp value={row.updatedAt} locale={locale} format="datetime" /> },
    {
      id: "edit",
      header: a("listActions", locale),
      align: "end",
      cell: (row) => (
        <RowAction href={contentPath(def, row.id)} icon="edit" name={rowTitle(row.name, locale)}>
          {a("edit", locale)}
        </RowAction>
      ),
    },
  ];

  const inputClass = "min-h-[var(--target-min)] rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)]";
  const place = contentPlacement(def);
  const addLabel = a("listAdd", locale, { item: a(def.oneKey, locale) });
  const add = (
    <Button href={`${contentPath(def)}/new${chosen ? `?stall=${chosen.id}` : ""}`} icon={<ConsoleIcon name="add" />}>
      {addLabel}
    </Button>
  );

  return (
    <ConsolePage width="wide">
      <PageHeader
        title={chosen ? a("canteenDishesAt", locale, { number: chosen.number, name: stallName(chosen) }) : label}
        icon={place.icon}
        description={a(def.descriptionKey, locale)}
        actions={
          <>
            {chosen ? (
              <Button href={`${contentPath(getContentType("canteen-stalls")!, chosen.id)}/prices`} variant="secondary" icon={<ConsoleIcon name="edit" />}>
                {a("canteenStallPricesLink", locale)}
              </Button>
            ) : null}
            {add}
          </>
        }
      />
      {notice === "deleted" ? (
        <NotificationBanner variant="success" title={a("listDeleted", locale)}>
          {a("listDeletedNote", locale)}
        </NotificationBanner>
      ) : null}
      <Toolbar
        search={<SearchField label={a("ccSearchLabel", locale, { label: label.toLowerCase() })} submitLabel={a("ccSearchSubmit", locale)} defaultValue={q} hidden={stallId ? { stall: stallId } : undefined} />}
        filters={
          <form method="get" className="flex flex-wrap items-end gap-[var(--space-2)]">
            {q ? <input type="hidden" name="q" value={q} /> : null}
            <div className="flex flex-col gap-[var(--space-1)]">
              <label htmlFor="dish-stall" className="text-sm font-medium">
                {a("canteenFilterStall", locale)}
              </label>
              <select id="dish-stall" name="stall" defaultValue={stallId ?? ""} className={`${inputClass} max-w-[20rem]`}>
                <option value="">{a("canteenFilterAllStalls", locale)}</option>
                {stalls.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.number}. {stallName(s)}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="secondary">
              {a("ccShowStall", locale)}
            </Button>
          </form>
        }
      />

      {rows.length === 0 ? (
        q || stallId ? (
          <EmptyPanel
            icon="search"
            title={a("listNoMatches", locale)}
            action={
              <Button href={contentPath(def)} variant="secondary">
                {a("ccClearFilters", locale)}
              </Button>
            }
          >
            {a("ccNoMatchesHint", locale)}
          </EmptyPanel>
        ) : (
          <EmptyPanel icon={place.icon} title={a("listEmpty", locale, { label: label.toLowerCase() })} action={add}>
            {a("ccEmptyHint", locale)}
          </EmptyPanel>
        )
      ) : (
        <>
          <ResultCount text={a("ccResultCount", locale, { total })} />
          <DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} caption={a("listCaption", locale, { shown: rows.length, total, label })} />
          <Pagination currentPage={page} totalPages={Math.ceil(total / DISH_PAGE_SIZE)} buildHref={href} locale={locale} />
        </>
      )}
    </ConsolePage>
  );
}
