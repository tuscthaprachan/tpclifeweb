/**
 * The lost and found register: every open report, filterable by kind,
 * category and status, paginated. Filters are query-param driven
 * (this file reads them; components/domain/lostfound/LostFoundFilters.tsx
 * renders the real `<form method="get">` that writes them) and pagination
 * comes straight from `getLostFoundPage`'s GROQ `[$start...$end]` slice, so
 * the whole page works identically with JavaScript on or off (CONTRIBUTING.md,
 * "search, filtering and pagination must work with JavaScript off").
 *
 * `status` defaults to "open" when the query string does not mention it at
 * all, which is what a reader arriving fresh wants: a resolved or withdrawn
 * entry is not usually what someone is looking for. Choosing "All" in the
 * filter bar submits `status=` (present, empty), which this file reads as
 * "no status filter", not as "fall back to the default".
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { Stack } from "@/components/ui/Stack";
import { Heading } from "@/components/ui/Heading";
import { Cluster } from "@/components/ui/Cluster";
import { Grid } from "@/components/ui/Grid";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { LostFoundCard, LostFoundFilters } from "@/components/domain/lostfound";
import { LOST_FOUND_CATEGORIES } from "@/components/domain/lostfound/categoryLabel";
import { LOST_FOUND_STATUSES } from "@/components/domain/lostfound/statusLabel";
import { liveRegionProps } from "@/lib/a11y";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { alternatesFor } from "@/lib/i18n/metadata";
import { getLostFoundPage } from "@/lib/sanity/queries";
import type { LostFoundCategory, LostFoundKind, LostFoundStatus } from "@/lib/sanity/types";

const PAGE_SIZE = 24;
const KINDS: readonly LostFoundKind[] = ["lost", "found"];

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  return {
    alternates: alternatesFor(locale, "/lost-and-found"),
    title: UI.lostAndFound[locale],
    description: UI.lostAndFoundIntro[locale],
  };
}

export default async function LostAndFoundIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const query = await searchParams;
  const kind = parseKind(firstParam(query.kind));
  const category = parseCategory(firstParam(query.category));
  const status = parseStatus(firstParam(query.status));
  const page = parsePage(firstParam(query.page));
  const hasActiveFilters = kind !== "" || category !== "" || status !== "open";

  const { items, total } = await getLostFoundPage(
    { kind: kind || null, category: category || null, status: status || null },
    page,
    PAGE_SIZE,
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Container className="pb-8 pt-2">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.lostAndFound[locale] }]} />

      <Stack space={8}>
        <Stack space={4}>
          <Stack space={2}>
            <Heading level={1}>{UI.lostAndFound[locale]}</Heading>
            <p className="m-0 text-ink-600">{UI.lostAndFoundIntro[locale]}</p>
          </Stack>
          {/* Prominent, since reporting something is the action most readers who cannot find their item actually want. */}
          <Cluster space={3}>
            <Button href={localePath(locale, "/lost-and-found/report?kind=lost")}>{UI.reportLostItem[locale]}</Button>
            <Button href={localePath(locale, "/lost-and-found/report?kind=found")} variant="secondary">
              {UI.reportFoundItem[locale]}
            </Button>
          </Cluster>
        </Stack>

        <LostFoundFilters locale={locale} value={{ kind, category, status }} hasActiveFilters={hasActiveFilters} />

        {/* 4.1.3: the result count is announced politely whenever it changes. */}
        <p {...liveRegionProps("polite")} className="m-0 text-sm text-ink-600">
          {UI.showing[locale]} {formatNumber(items.length, locale)} {UI.of[locale]} {formatNumber(total, locale)} {UI.results[locale]}
        </p>

        {items.length === 0 ? (
          <EmptyState
            title={UI.noLostFoundItems[locale]}
            action={
              hasActiveFilters ? (
                <a href={localePath(locale, "/lost-and-found")} className="text-action underline">
                  {UI.clearFilters[locale]}
                </a>
              ) : undefined
            }
          />
        ) : (
          <Stack space={6}>
            <Grid minColumnWidth="18rem">
              {items.map((item) => (
                <LostFoundCard key={item._id} item={item} locale={locale} headingLevel={3} />
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
      </Stack>
    </Container>
  );
}
