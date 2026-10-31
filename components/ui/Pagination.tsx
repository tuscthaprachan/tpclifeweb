import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { cx } from "./cx";
import { ArrowLeftIcon, ArrowRightIcon } from "./icons";
import { paginationWindow } from "./pagination-window";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  /** Builds a real URL for a given page, query-param driven, so this works with JavaScript off. */
  buildHref: (page: number) => string;
  locale: Locale;
  className?: string;
}

const ITEM_CLASS =
  "inline-flex min-h-[var(--target-min)] min-w-[var(--target-min)] items-center justify-center gap-[var(--space-1)] rounded-control px-[var(--space-2)] py-[var(--space-1)] tabular-nums";
const LINK_CLASS = cx(ITEM_CLASS, "border border-line-strong font-medium text-action no-underline hover:bg-surface-alt hover:text-action-hover hover:underline");
const CURRENT_CLASS = cx(ITEM_CLASS, "border border-ink-900 bg-ink-900 font-bold text-surface no-underline");

/**
 * Numbered pages with gaps, previous and next, and "Page X of Y" above the
 * list (the ONS pattern). The current page is a link with `aria-current` so
 * the list reads the same to everyone. `flex-wrap` is the 1.4.10 Reflow
 * guard: at 320px the numbers wrap onto a second line instead of scrolling.
 */
export function Pagination({ currentPage, totalPages, buildHref, locale, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const previousPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;
  const items = paginationWindow(currentPage, totalPages);

  return (
    <nav aria-label={UI.pagination[locale]} className={cx("flex flex-col gap-[var(--space-2)]", className)}>
      <p className="m-0 text-sm text-ink-600">
        {UI.page[locale]} {formatNumber(currentPage, locale)} {UI.of[locale]} {formatNumber(totalPages, locale)}
      </p>

      <ul className="m-0 flex list-none flex-wrap items-center gap-[var(--space-1)] p-0">
        {previousPage ? (
          <li>
            <Link href={buildHref(previousPage)} className={LINK_CLASS} rel="prev">
              <ArrowLeftIcon />
              <span className="visually-hidden">{UI.odPreviousPageTo[locale].replace("{n}", formatNumber(previousPage, locale))}</span>
            </Link>
          </li>
        ) : null}

        {items.map((item, index) =>
          item === "gap" ? (
            <li key={`gap-${index}`} aria-hidden="true" className={cx(ITEM_CLASS, "text-ink-600")}>
              ...
            </li>
          ) : (
            <li key={item}>
              <Link href={buildHref(item)} className={item === currentPage ? CURRENT_CLASS : LINK_CLASS} aria-current={item === currentPage ? "page" : undefined}>
                <span className="visually-hidden">{UI.page[locale]} </span>
                {formatNumber(item, locale)}
              </Link>
            </li>
          ),
        )}

        {nextPage ? (
          <li>
            <Link href={buildHref(nextPage)} className={LINK_CLASS} rel="next">
              <span className="visually-hidden">{UI.odNextPageTo[locale].replace("{n}", formatNumber(nextPage, locale))}</span>
              <ArrowRightIcon />
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
