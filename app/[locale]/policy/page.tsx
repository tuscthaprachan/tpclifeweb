/**
 * The policy dashboard: every policy from both TUSU and TUSC, combined but
 * always attributed (lib/sanity/types.ts, "Policy tracker"). Filterable by
 * owner, policy area and status through query parameters, working with
 * JavaScript off, via a real `<form method="get">`
 * (components/domain/policy/PolicyFilters.tsx), following the exact pattern
 * of app/[locale]/forms/page.tsx.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ShellContainer } from "@/components/layout/ShellContainer";
import { PolicyFilters, PolicyList, PolicyStatusSummary, STATUS_ORDER, type PolicyAreaOption } from "@/components/domain/policy";
import { EmptyState } from "@/components/ui/EmptyState";
import { Heading } from "@/components/ui/Heading";
import { Stack } from "@/components/ui/Stack";
import { liveRegionProps } from "@/lib/a11y";
import { DEFAULT_LOCALE, isLocale, localePath, pick, type Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { getPolicies } from "@/lib/sanity/queries";
import type { Owner, Policy, PolicyStatus } from "@/lib/sanity/types";
import { alternatesFor } from "@/lib/i18n/metadata";

const OWNERS: readonly Owner[] = ["tusu", "tusc", "university", "joint"];

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseOwner(raw: string | undefined): Owner | "" {
  return raw !== undefined && (OWNERS as readonly string[]).includes(raw) ? (raw as Owner) : "";
}

function parseStatus(raw: string | undefined): PolicyStatus | "" {
  return raw !== undefined && (STATUS_ORDER as readonly string[]).includes(raw) ? (raw as PolicyStatus) : "";
}

/**
 * Distinct policy areas across every policy, not just the filtered set, so
 * the dropdown's own choices never shrink out from under a reader mid-filter.
 * Keyed on the English text (stable across a locale switch, unlike a slug
 * that does not exist for this free-text field), labelled in the active
 * language. Mirrors DirectoryFilterForm's faculty options
 * (components/domain/directory/DirectoryFilterForm.tsx).
 */
function buildAreaOptions(policies: Policy[], locale: Locale): PolicyAreaOption[] {
  const seen = new Map<string, string>();
  for (const policy of policies) {
    const key = policy.policyArea.en.trim();
    if (key.length > 0 && !seen.has(key)) {
      seen.set(key, pick(policy.policyArea, locale));
    }
  }
  return Array.from(seen.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  return {
    alternates: alternatesFor(locale, "/policy"),
    title: UI.policyTracker[locale],
    description: UI.policyIntro[locale],
  };
}

export default async function PolicyDashboardPage({
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
  const owner = parseOwner(firstParam(query.owner));
  const area = (firstParam(query.area) ?? "").trim();
  const status = parseStatus(firstParam(query.status));
  const hasActiveFilters = owner !== "" || area !== "" || status !== "";

  const allPolicies = await getPolicies();
  const areaOptions = buildAreaOptions(allPolicies, locale);

  const filtered = allPolicies.filter((policy) => {
    if (owner !== "" && policy.owner !== owner) return false;
    if (area !== "" && policy.policyArea.en.trim() !== area) return false;
    if (status !== "" && policy.status !== status) return false;
    return true;
  });

  const now = new Date();

  return (
    <ShellContainer className="pb-8 pt-2">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.policyTracker[locale] }]} />

      <Stack space={8}>
        <Stack space={2}>
          <Heading level={1}>{UI.policyTracker[locale]}</Heading>
          <p className="m-0 text-ink-600">{UI.policyIntro[locale]}</p>
        </Stack>

        {allPolicies.length > 0 ? <PolicyStatusSummary policies={filtered} locale={locale} /> : null}

        <PolicyFilters locale={locale} value={{ owner, area, status }} areaOptions={areaOptions} hasActiveFilters={hasActiveFilters} />

        {/* 4.1.3: the result count is announced politely whenever the filters change it. */}
        <p {...liveRegionProps("polite")} className="m-0 text-sm text-ink-600">
          {UI.showing[locale]} {formatNumber(filtered.length, locale)} {UI.of[locale]} {formatNumber(allPolicies.length, locale)}{" "}
          {UI.results[locale]}
        </p>

        {filtered.length === 0 ? (
          allPolicies.length === 0 ? (
            <EmptyState title={UI.nothingHere[locale]} />
          ) : (
            <EmptyState
              // TODO: add to UI strings. No shared "no results after filtering" copy
              // exists; UI.searchNoResults is written for the free-text search page
              // ("try another word"), which does not describe a dropdown filter with
              // no matches.
              title={locale === "th" ? "ไม่พบนโยบายที่ตรงกับตัวกรองที่เลือก" : "No policies match these filters"}
              action={
                <a href={localePath(locale, "/policy")} className="text-action underline">
                  {UI.clearFilters[locale]}
                </a>
              }
            />
          )
        ) : (
          <PolicyList policies={filtered} locale={locale} headingLevel={2} now={now} />
        )}
      </Stack>
    </ShellContainer>
  );
}
