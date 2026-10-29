import { DataTable, Heading, InsetText, StatusTag, type DataTableColumn } from "@/components/ui";
import type { DayAvailability, DayItem } from "@/lib/borrowing/calendar";
import type { Locale } from "@/lib/i18n/config";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import { itemName, monthHref } from "./AvailabilityMonth";
import { av } from "./strings";

interface DayItemsProps {
  locale: Locale;
  data: DayAvailability;
  basePath: string;
  /** Outline depth of the day heading; each category sits one below. */
  headingLevel?: 2 | 3;
}

/** Every active item on one day, a table per category, each item linking to its month. */
export function DayItems({ locale, data, basePath, headingLevel = 2 }: DayItemsProps) {
  const date = formatDate(data.day, locale);
  const month = data.day.slice(0, 7);
  const blocked = data.past ? av("dayPast", locale) : !data.deskOpen ? av("dayClosed", locale) : null;

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <Heading level={headingLevel} className="m-0">
        {av("dayHeading", locale, { date })}
      </Heading>
      {blocked ? (
        <InsetText>
          <p className="m-0">{blocked}</p>
        </InsetText>
      ) : null}
      {data.categories.length === 0 ? <p className="m-0">{av("noItems", locale)}</p> : null}
      {data.categories.map(({ category, tooSoon, items }) => {
        const reason = data.past ? "past" : !data.deskOpen ? "closed" : tooSoon ? "tooSoon" : null;
        const columns: DataTableColumn<DayItem>[] = [
          {
            id: "item",
            header: av("colItem", locale),
            cell: (row) => (
              <a href={monthHref(basePath, row.item.slug, month)}>
                {itemName(row.item, locale)}
                <span className="visually-hidden">: {av("viewMonth", locale)}</span>
              </a>
            ),
          },
          { id: "free", header: av("colFree", locale), cell: (row) => <FreeCell row={row} locale={locale} reason={reason} /> },
          { id: "total", header: av("colTotal", locale), align: "end", cell: (row) => formatNumber(row.lendable, locale) },
        ];
        return (
          <section key={category.id} className="flex flex-col gap-[var(--space-2)]">
            <Heading level={(headingLevel + 1) as 3 | 4} className="m-0">
              {itemName(category, locale)}
            </Heading>
            {tooSoon && !blocked ? <p className="m-0 text-ink-600">{av("dayTooSoon", locale)}</p> : null}
            <DataTable columns={columns} rows={items} getRowKey={(row) => row.item.id} caption={av("dayCaption", locale, { category: itemName(category, locale), date })} />
          </section>
        );
      })}
    </div>
  );
}

function FreeCell({ row, locale, reason }: { row: DayItem; locale: Locale; reason: "past" | "closed" | "tooSoon" | null }) {
  if (reason) return <StatusTag tone={reason === "tooSoon" ? "info" : "neutral"} label={av(reason, locale)} />;
  if (row.free === 0) return <StatusTag tone="error" label={av("none", locale)} />;
  return <StatusTag tone="success" label={av("free", locale, { count: formatNumber(row.free, locale) })} />;
}
