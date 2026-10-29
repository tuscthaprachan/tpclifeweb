"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { Grid } from "@/components/ui/Grid";
import { Heading } from "@/components/ui/Heading";
import { Stack } from "@/components/ui/Stack";
import { liveRegionProps } from "@/lib/a11y";
import { localePath, type Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import type { Category, FormRecord, Owner } from "@/lib/content/types";
import { useQueryRecord, type QueryRecord } from "@/lib/use-query";
import { FormCard } from "./FormCard";
import { FormFilters } from "./FormFilters";
import { FormList } from "./FormList";

const CATEGORIES: readonly Category[] = ["transport", "welfare", "activity", "governance"];
const OWNERS: readonly Owner[] = ["tusu", "tusc", "university", "joint"];

function parseCategory(raw: string | undefined): Category | "" {
  return raw !== undefined && (CATEGORIES as readonly string[]).includes(raw) ? (raw as Category) : "";
}

function parseOwner(raw: string | undefined): Owner | "" {
  return raw !== undefined && (OWNERS as readonly string[]).includes(raw) ? (raw as Owner) : "";
}

function parseSignIn(raw: string | undefined): "required" | "none" | "" {
  return raw === "required" || raw === "none" ? raw : "";
}

interface FormsResultsProps {
  locale: Locale;
  forms: FormRecord[];
}

export function LiveFormsResults(props: FormsResultsProps) {
  return <FormsResults {...props} query={useQueryRecord()} />;
}

export function FormsResults({ locale, forms: allForms, query }: FormsResultsProps & { query: QueryRecord }) {
  const category = parseCategory(query.category);
  const owner = parseOwner(query.owner);
  const signIn = parseSignIn(query.signIn);
  const hasActiveFilters = category !== "" || owner !== "" || signIn !== "";

  const filtered = allForms.filter((form) => {
    if (category !== "" && form.category !== category) return false;
    if (owner !== "" && form.owner !== owner) return false;
    if (signIn === "required" && !form.requiresSignIn) return false;
    if (signIn === "none" && form.requiresSignIn) return false;
    return true;
  });

  const priorityForms = filtered.filter((form) => form.isPriority);

  return (
    <>
      <FormFilters key={`${category}|${owner}|${signIn}`} locale={locale} value={{ category, owner, signIn }} hasActiveFilters={hasActiveFilters} />

      {/* 4.1.3: the result count is announced politely whenever it changes. */}
      <p {...liveRegionProps("polite")} className="m-0 text-sm text-ink-600">
        {UI.showing[locale]} {formatNumber(filtered.length, locale)} {UI.of[locale]} {formatNumber(allForms.length, locale)}{" "}
        {UI.results[locale]}
      </p>

      {filtered.length === 0 ? (
        allForms.length === 0 ? (
          <EmptyState title={UI.nothingHere[locale]} />
        ) : (
          <EmptyState
            // TODO: add to UI strings. No shared "no results after filtering"
            // copy exists; UI.searchNoResults is written for the free-text
            // search page ("try another word"), which does not describe a
            // dropdown filter with no matches.
            title={locale === "th" ? "ไม่พบแบบฟอร์มที่ตรงกับตัวกรองที่เลือก" : "No forms match these filters"}
            action={
              <Link href={localePath(locale, "/forms")} className="text-action underline">
                {UI.clearFilters[locale]}
              </Link>
            }
          />
        )
      ) : (
        <>
          {priorityForms.length > 0 ? (
            <Stack space={4}>
              <Heading level={2}>
                {/* TODO: add to UI strings. No shared label exists for the
                    highlighted/priority group of forms shown before the full list. */}
                {locale === "th" ? "แบบฟอร์มที่ใช้บ่อย" : "Frequently used forms"}
              </Heading>
              <Grid minColumnWidth="18rem">
                {priorityForms.map((form) => (
                  <FormCard key={form._id} form={form} locale={locale} headingLevel={3} />
                ))}
              </Grid>
            </Stack>
          ) : null}

          <FormList forms={filtered} locale={locale} headingLevel={2} />
        </>
      )}
    </>
  );
}
