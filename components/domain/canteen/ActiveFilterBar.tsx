import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { countActiveValues, defaultFilters, type CanteenFilters } from "@/lib/canteen/params";
import type { Locale } from "@/lib/i18n/config";
import { FilterEditor } from "./FilterEditor";
import { activeChips, filterSummary, type StallNamer } from "./chips";
import { FiltersIcon, RemoveIcon } from "./icons";
import { eatHref } from "./links";
import { EAT, eat, t } from "./strings";

interface ActiveFilterBarProps {
  locale: Locale;
  filters: CanteenFilters;
  /** The route the chips link to, locale free, for example "/eat/dishes". Removing a chip stays on this page. */
  route: string;
  stallName?: StallNamer;
  /** Parameters every chip link keeps, for example `mode` on a page that has several. */
  extra?: Record<string, string>;
  /**
   * The filter form (a `CanteenFilters` element). When given, small screens
   * get an Edit button that opens it in a Dialog. When the form is also a
   * column beside the results, pass the same form here for the Dialog.
   */
  editor?: ReactNode;
  /** Alternative to `editor` for pages with no filter form of their own: where "Edit filters" goes. */
  editHref?: string;
  className?: string;
}

/**
 * The summary line under the header on every /eat page that has filters:
 * "No pork · under 50 baht · 3 filters", with each filter as a removable chip
 * and a way to edit. Chips are plain links, so they work without JavaScript,
 * and each one keeps every other filter. Sticky on tall enough tablets and
 * desktops, in flow on phones, where a sticky bar of wrapped chips would eat
 * the screen (2.4.11 Focus Not Obscured).
 */
export function ActiveFilterBar({ locale, filters, route, stallName, extra, editor, editHref, className }: ActiveFilterBarProps) {
  const chips = activeChips(filters, locale, stallName);
  const count = countActiveValues(filters);
  const cleared = { ...defaultFilters(), sort: filters.sort, group: filters.group };

  return (
    <section
      aria-label={t(EAT.filterBarLabel, locale)}
      className={[
        "z-[50] border-b border-line bg-surface py-[var(--space-3)]",
        "sm:[@media(min-height:40rem)]:sticky sm:[@media(min-height:40rem)]:top-[var(--header-height,4rem)]",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-[var(--space-4)] gap-y-[var(--space-2)]">
        <p className="m-0 text-sm font-medium text-ink-900">{filterSummary(filters, locale, stallName)}</p>
        {editor ? (
          <FilterEditor locale={locale} count={count}>
            {editor}
          </FilterEditor>
        ) : editHref ? (
          <Button href={editHref} variant="secondary" size="sm">
            <FiltersIcon />
            {eat.editFiltersWithCount(locale, count)}
          </Button>
        ) : null}
      </div>

      {chips.length > 0 ? (
        <ul className="m-0 mt-[var(--space-2)] flex list-none flex-wrap items-center gap-[var(--space-2)] p-0">
          {chips.map((chip) => (
            <li key={chip.id}>
              <Link
                href={eatHref(locale, route, chip.without, extra)}
                scroll={false}
                className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-1)] rounded-pill border border-line-strong bg-surface-alt px-[var(--space-3)] py-[var(--space-1)] text-sm font-medium text-ink-900 no-underline hover:border-action hover:text-action"
              >
                <span>
                  {chip.label}
                  <span className="visually-hidden"> ({t(EAT.removeFilter, locale)})</span>
                </span>
                <RemoveIcon />
              </Link>
            </li>
          ))}
          <li>
            <Link href={eatHref(locale, route, cleared, extra)} scroll={false} className="inline-flex min-h-[var(--target-min)] items-center text-sm">
              {t(EAT.clearAll, locale)}
            </Link>
          </li>
        </ul>
      ) : null}
    </section>
  );
}
