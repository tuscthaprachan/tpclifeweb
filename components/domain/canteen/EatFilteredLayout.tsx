import type { ReactNode } from "react";
import { Heading } from "@/components/ui/Heading";
import { indexCanteen } from "@/lib/canteen/derive";
import type { FacetCounts } from "@/lib/canteen/filter";
import type { CanteenFilters as Filters } from "@/lib/canteen/params";
import { pick, localePath, type Locale } from "@/lib/i18n/config";
import type { CanteenData } from "@/lib/sanity/types";
import { ActiveFilterBar } from "./ActiveFilterBar";
import { CanteenFilters } from "./CanteenFilters";
import { EAT, t } from "./strings";

interface EatFilteredLayoutProps {
  locale: Locale;
  data: CanteenData;
  filters: Filters;
  counts: FacetCounts;
  /** This page's locale free route, for example "/eat/dishes". The chips and the form point here. */
  route: string;
  display?: "dishes" | "none";
  /** Request parameters the form must keep, for example `seed`. */
  carry?: Record<string, string>;
  /** The results. They sit to the right of the filter column on desktop. */
  children: ReactNode;
}

/**
 * The browse layout shared by every /eat page that filters: the sticky
 * summary bar, the filter form as a left column from `md` up, and the results.
 *
 * On a phone the form is not in the column. With JavaScript the bar's Edit
 * button opens it in a Dialog. Without JavaScript the same form is included
 * inside `<noscript>` above the results and the Edit link jumps to it, so
 * filtering works either way. The three copies of the form get different id
 * prefixes so no label ever points at another copy's input.
 */
export function EatFilteredLayout({ locale, data, filters, counts, route, display = "dishes", carry, children }: EatFilteredLayoutProps) {
  const index = indexCanteen(data);
  const stalls = index.stallsInWalkOrder;
  const action = localePath(locale, route);
  const stallName = (slug: string) => {
    const stall = index.stallBySlug.get(slug);
    return stall ? pick(stall.name, locale) : undefined;
  };

  const form = (idPrefix: string) => (
    <CanteenFilters
      locale={locale}
      filters={filters}
      counts={counts}
      stalls={stalls}
      action={action}
      idPrefix={idPrefix}
      display={display}
      carry={carry}
    />
  );

  return (
    <>
      <ActiveFilterBar locale={locale} filters={filters} route={route} stallName={stallName} editor={form("dlg")} />

      {/*
        The summary bar is sticky under the sticky header, so anything focused below it needs room for both
        (2.4.11 Focus Not Obscured). The global rule only clears the header.
      */}
      <div className="mt-[var(--space-4)] grid gap-[var(--space-8)] md:grid-cols-[17rem_minmax(0,1fr)] md:items-start [&_:is(a,button,input,select,summary)]:scroll-mt-[calc(var(--header-height,4rem)+9rem)]">
        <section aria-labelledby="eat-filters-column-title" className="hidden md:block">
          <Heading level={2} id="eat-filters-column-title" className="m-0 mb-[var(--space-4)] text-xl">
            {t(EAT.filtersTitle, locale)}
          </Heading>
          {form("col")}
        </section>

        <div className="min-w-0">
          <noscript>
            <section id="eat-filters" aria-labelledby="eat-filters-inline-title" className="mb-[var(--space-8)] md:hidden">
              <Heading level={2} id="eat-filters-inline-title" className="m-0 mb-[var(--space-4)] text-xl">
                {t(EAT.filtersTitle, locale)}
              </Heading>
              {form("inline")}
            </section>
          </noscript>
          {children}
        </div>
      </div>
    </>
  );
}
