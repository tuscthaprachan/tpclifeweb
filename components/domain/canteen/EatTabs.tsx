import Link from "next/link";
import { cx } from "@/components/ui/cx";
import type { CanteenFilters } from "@/lib/canteen/params";
import type { Locale } from "@/lib/i18n/config";
import { eatHref } from "./links";
import { EAT, t } from "./strings";

export type EatTab = "dishes" | "stalls" | "map";

interface EatTabsProps {
  locale: Locale;
  /** Which tab this page is. Leave out on the hub, where none is current. */
  current?: EatTab;
  /** Carried into every tab link, so switching view keeps the filters. */
  filters: CanteenFilters;
  className?: string;
}

const TABS: ReadonlyArray<{ id: EatTab; route: string; label: keyof typeof EAT }> = [
  { id: "dishes", route: "/eat/dishes", label: "tabDishes" },
  { id: "stalls", route: "/eat/stalls", label: "tabStalls" },
  { id: "map", route: "/eat/map", label: "tabMap" },
];

/**
 * Dishes, Stalls and Map as three views of the same filters. Each tab is a real
 * link to its own page (not a client side panel), so it works without
 * JavaScript and the back button does what you expect. Styled like the Tabs
 * component, marked with `aria-current="page"`, and in a `<nav>` rather than
 * a tablist because it navigates.
 */
export function EatTabs({ locale, current, filters, className }: EatTabsProps) {
  return (
    <nav aria-label={t(EAT.tabsLabel, locale)} className={className}>
      <ul className="m-0 flex list-none flex-wrap gap-[var(--space-2)] border-b border-line p-0">
        {TABS.map((tab) => {
          const selected = tab.id === current;
          return (
            <li key={tab.id}>
              <Link
                href={eatHref(locale, tab.route, filters)}
                aria-current={selected ? "page" : undefined}
                className={cx(
                  "inline-flex min-h-[var(--target-min)] items-center border-b-[var(--border-width-thick)] px-[var(--space-3)] py-[var(--space-2)] text-base no-underline",
                  selected ? "border-action font-semibold text-action" : "border-transparent font-medium text-ink-600 hover:text-ink-900",
                )}
              >
                {t(EAT[tab.label], locale)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
