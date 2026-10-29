"use client";

/**
 * The lost and found register: every open report, filterable by kind,
 * category and status, paginated. Filters are query-param driven
 * (this file reads them; components/domain/lostfound/LostFoundFilters.tsx
 * renders the real `<form method="get">` that writes them) and the whole
 * register is passed in, so the page works identically with JavaScript on or
 * off (CONTRIBUTING.md, "search, filtering and pagination must work with
 * JavaScript off"). The static page filters in the browser from the URL; a
 * direct load of a filtered URL is rendered on the server by the same code.
 *
 * `status` defaults to "open" when the query string does not mention it at
 * all, which is what a reader arriving fresh wants: a resolved or withdrawn
 * entry is not usually what someone is looking for. Choosing "All" in the
 * filter bar submits `status=` (present, empty), which this file reads as
 * "no status filter", not as "fall back to the default".
 */

import Link from "next/link";

import { EmptyState } from "@/components/ui/EmptyState";
import { Grid } from "@/components/ui/Grid";
import { Pagination } from "@/components/ui/Pagination";
import { Stack } from "@/components/ui/Stack";
import { liveRegionProps } from "@/lib/a11y";
import { localePath, type Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { useQueryRecord, type QueryRecord } from "@/lib/use-query";
import type { LostFoundCategory, LostFoundKind, LostFoundStatus } from "@/lib/content/types";
import { LostFoundCard, type LostFoundCardItem } from "./LostFoundCard";
import { LostFoundFilters } from "./LostFoundFilters";
import { LOST_FOUND_CATEGORIES } from "./categoryLabel";
import { LOST_FOUND_STATUSES } from "./statusLabel";

export const LOST_FOUND_PAGE_SIZE = 24;
const KINDS: readonly LostFoundKind[] = ["lost", "found"];

function parseKind(raw: string | undefined): LostFoundKind | "" {
  return raw !== undefined && (KINDS as readonly string[]).includes(raw) ? (raw as LostFoundKind) : "";
}

function parseCategory(raw: string | undefined): LostFoundCategory | "" {
  return raw !== undefined && (LOST_FOUND_CATEGORIES as readonly string[]).includes(raw) ? (raw as LostFoundCategory) : "";
}

/** "" is a valid, explicit choice (the "All" option), distinct from the param being absent entirely. */
function parseStatus(raw: string | undefined): LostFoundStatus | "" {
  if (raw === undefined) return "open";
  return (LOST_FOUND_STATUSES as readonly string[]).includes(raw) ? (raw as LostFoundStatus) : "";
}

function parsePage(raw: string | undefined): number {
  const n = raw !== undefined ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function buildQuery(params: { kind: string; category: string; status: string; page?: number }): string {
  const search = new URLSearchParams();
  if (params.kind) search.set("kind", params.kind);
  if (params.category) search.set("category", params.category);
  // "status" is written even when empty, so "All" round-trips as an explicit
  // choice rather than reverting to the "open" default on the next request.
  search.set("status", params.status);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

interface LostFoundResultsProps {
  locale: Locale;
  /** The whole register, newest occurrence first. */
  items: LostFoundCardItem[];
}

export function LiveLostFoundResults(props: LostFoundResultsProps) {
  return <LostFoundResults {...props} query={useQueryRecord()} />;
}

export function LostFoundResults({ locale, items: allItems, query }: LostFoundResultsProps & { query: QueryRecord }) {
  const kind = parseKind(query.kind);
  const category = parseCategory(query.category);
  const status = parseStatus(query.status);
  const page = parsePage(query.page);
  const hasActiveFilters = kind !== "" || category !== "" || status !== "open";

  const matching = allItems.filter(
    (item) =>
      (kind === "" || item.kind === kind) && (category === "" || item.category === category) && (status === "" || item.status === status),
  );
  const total = matching.length;
  const items = matching.slice((page - 1) * LOST_FOUND_PAGE_SIZE, page * LOST_FOUND_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / LOST_FOUND_PAGE_SIZE));

  return (
    <>
      <LostFoundFilters
        key={`${kind}|${category}|${status}`}
        locale={locale}
        value={{ kind, category, status }}
        hasActiveFilters={hasActiveFilters}
      />

      {/* 4.1.3: the result count is announced politely whenever it changes. */}
      <p {...liveRegionProps("polite")} className="m-0 text-sm text-ink-600">
        {UI.showing[locale]} {formatNumber(items.length, locale)} {UI.of[locale]} {formatNumber(total, locale)} {UI.results[locale]}
      </p>

      {items.length === 0 ? (
        <EmptyState
          title={UI.noLostFoundItems[locale]}
          action={
            hasActiveFilters ? (
              <Link href={localePath(locale, "/lost-and-found")} className="text-action underline">
                {UI.clearFilters[locale]}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Stack space={6}>
          <Grid minColumnWidth="18rem">
            {items.map((item) => (
              <LostFoundCard key={item._id} item={item} locale={locale} headingLevel={2} />
            ))}
          </Grid>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            locale={locale}
            buildHref={(targetPage) => localePath(locale, `/lost-and-found${buildQuery({ kind, category, status, page: targetPage })}`)}
          />
        </Stack>
      )}
    </>
  );
}
