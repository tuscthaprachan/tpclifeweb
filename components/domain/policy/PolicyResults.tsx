"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { liveRegionProps } from "@/lib/a11y";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import type { Owner, Policy, PolicyStatus } from "@/lib/content/types";
import { useQueryRecord, type QueryRecord } from "@/lib/use-query";
import { PolicyFilters, type PolicyAreaOption } from "./PolicyFilters";
import { PolicyList } from "./PolicyList";
import { PolicyStatusSummary } from "./PolicyStatusSummary";
import { STATUS_ORDER } from "./statusLabels";

const OWNERS: readonly Owner[] = ["tusu", "tusc", "university", "joint"];

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

interface PolicyResultsProps {
  locale: Locale;
  policies: Policy[];
  /** ISO. When the server worked the page out; the staleness lines are measured against it so server and browser agree. */
  generatedAt: string;
}

export function LivePolicyResults(props: PolicyResultsProps) {
  return <PolicyResults {...props} query={useQueryRecord()} />;
}

export function PolicyResults({ locale, policies: allPolicies, generatedAt, query }: PolicyResultsProps & { query: QueryRecord }) {
  const owner = parseOwner(query.owner);
  const area = (query.area ?? "").trim();
  const status = parseStatus(query.status);
  const hasActiveFilters = owner !== "" || area !== "" || status !== "";

  const areaOptions = buildAreaOptions(allPolicies, locale);

  const filtered = allPolicies.filter((policy) => {
    if (owner !== "" && policy.owner !== owner) return false;
    if (area !== "" && policy.policyArea.en.trim() !== area) return false;
    if (status !== "" && policy.status !== status) return false;
    return true;
  });

  const now = new Date(generatedAt);

  return (
    <>
      {allPolicies.length > 0 ? <PolicyStatusSummary policies={filtered} locale={locale} /> : null}

      <PolicyFilters
        key={`${owner}|${area}|${status}`}
        locale={locale}
        value={{ owner, area, status }}
        areaOptions={areaOptions}
        hasActiveFilters={hasActiveFilters}
      />

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
              <Link href={localePath(locale, "/policy")} className="text-action underline">
                {UI.clearFilters[locale]}
              </Link>
            }
          />
        )
      ) : (
        <PolicyList policies={filtered} locale={locale} headingLevel={2} now={now} />
      )}
    </>
  );
}
