/**
 * The forms index: every active form, filterable by category, owner and
 * whether sign-in is required. Filters are query-param driven
 * (app/[locale]/forms/page.tsx reads them here; components/domain/form/FormFilters.tsx
 * renders the real `<form method="get">` that writes them), so the page
 * works identically with JavaScript on or off and survives a reload or a
 * back navigation (3.3.7).
 */

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ShellContainer } from "@/components/layout/ShellContainer";
import { FormCard, FormFilters, FormList } from "@/components/domain/form";
import { EmptyState } from "@/components/ui/EmptyState";
import { Grid } from "@/components/ui/Grid";
import { Heading } from "@/components/ui/Heading";
import { Stack } from "@/components/ui/Stack";
import { liveRegionProps } from "@/lib/a11y";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { getForms } from "@/lib/content";
import type { Category, Owner } from "@/lib/content/types";
import { alternatesFor } from "@/lib/i18n/metadata";

const CATEGORIES: readonly Category[] = ["transport", "welfare", "activity", "governance"];
const OWNERS: readonly Owner[] = ["tusu", "tusc", "university", "joint"];

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseCategory(raw: string | undefined): Category | "" {
  return raw !== undefined && (CATEGORIES as readonly string[]).includes(raw) ? (raw as Category) : "";
}

function parseOwner(raw: string | undefined): Owner | "" {
  return raw !== undefined && (OWNERS as readonly string[]).includes(raw) ? (raw as Owner) : "";
}

function parseSignIn(raw: string | undefined): "required" | "none" | "" {
  return raw === "required" || raw === "none" ? raw : "";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  return {
    alternates: alternatesFor(locale, "/forms"),
    title: UI.forms[locale],
    description: UI.formsIntro[locale],
  };
}

export default async function FormsIndexPage({
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
  const category = parseCategory(firstParam(query.category));
  const owner = parseOwner(firstParam(query.owner));
  const signIn = parseSignIn(firstParam(query.signIn));
  const hasActiveFilters = category !== "" || owner !== "" || signIn !== "";

  const allForms = await getForms();

  const filtered = allForms.filter((form) => {
    if (category !== "" && form.category !== category) return false;
    if (owner !== "" && form.owner !== owner) return false;
    if (signIn === "required" && !form.requiresSignIn) return false;
    if (signIn === "none" && form.requiresSignIn) return false;
    return true;
  });

  const priorityForms = filtered.filter((form) => form.isPriority);

  return (
    <ShellContainer className="pb-8 pt-2">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.forms[locale] }]} />

      <Stack space={8}>
        <Stack space={2}>
          <Heading level={1}>{UI.forms[locale]}</Heading>
          <p className="m-0 text-ink-600">{UI.formsIntro[locale]}</p>
        </Stack>

        <FormFilters locale={locale} value={{ category, owner, signIn }} hasActiveFilters={hasActiveFilters} />

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
      </Stack>
    </ShellContainer>
  );
}
