import { asc } from "drizzle-orm";
import { AdminPage } from "@/components/admin/AdminPage";
import { rowTitle } from "@/components/admin/content/ContentList";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Button, DataTable, EmptyState, Heading, NotificationBanner, Pagination, StatusTag, Timestamp, type DataTableColumn } from "@/components/ui";
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

  const href = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (stallId) params.set("stall", stallId);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `${contentPath(def)}${qs ? `?${qs}` : ""}`;
  };

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
    {
      id: "status",
      header: a("listStatus", locale),
      cell: (row) => <StatusTag tone={row.status === "published" ? "success" : "neutral"} label={a(row.status === "published" ? "statusPublished" : "statusDraft", locale)} />,
    },
    { id: "updated", header: a("listUpdated", locale), cell: (row) => <Timestamp value={row.updatedAt} locale={locale} format="datetime" /> },
    {
      id: "edit",
      header: a("listActions", locale),
      align: "end",
      cell: (row) => (
        <a href={contentPath(def, row.id)}>
          {a("edit", locale)}
          <span className="visually-hidden"> {rowTitle(row.name, locale)}</span>
        </a>
      ),
    },
  ];

  const inputClass = "min-h-[var(--target-min)] rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)]";

  return (
    <AdminPage width="content">
      <Heading level={1}>{chosen ? a("canteenDishesAt", locale, { number: chosen.number, name: stallName(chosen) }) : label}</Heading>
      {notice === "deleted" ? (
        <NotificationBanner variant="success" title={a("listDeleted", locale)}>
          {a("listDeletedNote", locale)}
        </NotificationBanner>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-4)]">
        <form method="get" role="search" className="flex flex-wrap items-end gap-[var(--space-2)]">
          <div className="flex flex-col gap-[var(--space-1)]">
            <label htmlFor="dish-stall" className="text-base font-medium">
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
          <div className="flex flex-col gap-[var(--space-1)]">
            <label htmlFor="content-filter" className="text-base font-medium">
              {a("listFilter", locale)}
            </label>
            <input id="content-filter" type="search" name="q" defaultValue={q} autoComplete="off" className={inputClass} />
          </div>
          <Button type="submit" variant="secondary">
            {a("listFilterApply", locale)}
          </Button>
          {q || stallId ? (
            <Button href={contentPath(def)} variant="quiet">
              {a("listFilterClear", locale)}
            </Button>
          ) : null}
        </form>
        <div className="flex flex-wrap gap-[var(--space-2)]">
          {chosen ? (
            <Button href={`${contentPath(getContentType("canteen-stalls")!, chosen.id)}/prices`} variant="secondary">
              {a("canteenStallPricesLink", locale)}
            </Button>
          ) : null}
          <Button href={`${contentPath(def)}/new${chosen ? `?stall=${chosen.id}` : ""}`}>{a("listAdd", locale, { item: a(def.oneKey, locale) })}</Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={q || stallId ? a("listNoMatches", locale) : a("listEmpty", locale, { label: label.toLowerCase() })} />
      ) : (
        <>
          <DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} caption={a("listCaption", locale, { shown: rows.length, total, label })} />
          <Pagination currentPage={page} totalPages={Math.ceil(total / DISH_PAGE_SIZE)} buildHref={href} locale={locale} />
        </>
      )}
    </AdminPage>
  );
}
