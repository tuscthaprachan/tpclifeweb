import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { cx } from "./cx";
import { ArrowLeftIcon, ArrowRightIcon } from "./icons";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  /** Builds a real URL for a given page, query-param driven, so this works with JavaScript off. */
  buildHref: (page: number) => string;
  locale: Locale;
  className?: string;
}

const LINK_CLASS =
  "inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-1)] rounded-control px-[var(--space-2)] py-[var(--space-1)] font-medium text-action no-underline hover:bg-surface-alt hover:text-action-hover hover:underline";

export function Pagination({ currentPage, totalPages, buildHref, locale, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const previousPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  return (
    <nav
      aria-label={UI.pagination[locale]}
      /*
       * `flex-wrap` is the 1.4.10 Reflow guard here: "previous"/"next" carry
       * full Thai words plus an icon, and at 320px the three pieces
       * (previous, page count, next) can outgrow the viewport if forced onto
       * one line. Wrapping lets the page-count text drop to its own line
       * rather than forcing the whole nav to scroll sideways.
       */
      className={cx("flex flex-wrap items-center justify-between gap-[var(--space-4)]", className)}
    >
      {previousPage ? (
        <Link href={buildHref(previousPage)} className={LINK_CLASS} rel="prev">
          <ArrowLeftIcon />
          {UI.previousPage[locale]}
        </Link>
      ) : (
        <span />
      )}

      <p className="m-0 text-sm text-ink-600">
        {UI.page[locale]} {formatNumber(currentPage, locale)} {UI.of[locale]} {formatNumber(totalPages, locale)}
      </p>

      {nextPage ? (
        <Link href={buildHref(nextPage)} className={LINK_CLASS} rel="next">
          {UI.nextPage[locale]}
          <ArrowRightIcon />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
