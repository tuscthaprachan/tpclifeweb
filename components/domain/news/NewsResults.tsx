"use client";

import type { ReactNode } from "react";
import { EmptyState, Grid, Pagination } from "@/components/ui";
import { localePath, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { useQueryRecord, type QueryRecord } from "@/lib/use-query";

function parsePage(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

interface NewsResultsProps {
  locale: Locale;
  /** One entry per page of cards, rendered on the server. */
  pages: ReactNode[];
}

export function LiveNewsResults(props: NewsResultsProps) {
  return <NewsResults {...props} query={useQueryRecord()} />;
}

export function NewsResults({ locale, pages, query }: NewsResultsProps & { query: QueryRecord }) {
  const page = parsePage(query.page);
  const totalPages = Math.max(1, pages.length);
  const items = pages[page - 1];

  if (items === undefined) return <EmptyState title={UI.nothingHere[locale]} />;

  return (
    <>
      <Grid minColumnWidth="18rem">{items}</Grid>
      <Pagination
        currentPage={Math.min(page, totalPages)}
        totalPages={totalPages}
        buildHref={(targetPage) => `${localePath(locale, "/news")}?page=${targetPage}`}
        locale={locale}
      />
    </>
  );
}

