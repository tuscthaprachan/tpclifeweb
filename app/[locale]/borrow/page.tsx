/**
 * Start page for borrowing equipment. The journey itself is a series of
 * question pages ([step]) that work without JavaScript; this page says what
 * can be borrowed, how far ahead to ask and what to bring, and opens the
 * draft. Nothing is stored until "Start now" is pressed.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button, Container, Heading, InsetText, NotificationBanner, Stack } from "@/components/ui";
import { listInventory, type InventoryCategory } from "@/lib/borrowing/availability";
import { MAX_ADVANCE_DAYS, MAX_LOAN_DAYS } from "@/lib/borrowing/constants";
import { isPiiAvailable } from "@/lib/crypto/pii";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, localePath, pick, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { beginJourney } from "./_journey/actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/borrow"),
    title: UI.brServiceName[locale],
    description: UI.brIntro[locale],
  };
}

async function readCategories(): Promise<InventoryCategory[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    return (await listInventory(getDb(), { activeOnly: true })).filter((c) => c.items.length > 0);
  } catch (error) {
    console.error("[borrowing] could not read the equipment list", error instanceof Error ? error.message : error);
    return [];
  }
}

export default async function BorrowStartPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const query = await searchParams;
  const available = isDatabaseConfigured() && isPiiAvailable();
  const categories = await readCategories();

  return (
    <Container width="narrow">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.brServiceName[locale] }]} />
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Stack space={2}>
          <Heading level={1}>{UI.brServiceName[locale]}</Heading>
          <p className="m-0 text-ink-900">{UI.brIntro[locale]}</p>
        </Stack>

        {first(query.expired) === "1" ? (
          <NotificationBanner variant="info" title={UI.brExpiredTitle[locale]}>
            {UI.brExpiredBody[locale]}
          </NotificationBanner>
        ) : null}
        {first(query.problem) === "1" ? (
          <NotificationBanner variant="warning" title={UI.errorTitle[locale]}>
            {UI.brSubmitFailed[locale]}
          </NotificationBanner>
        ) : null}

        {categories.length > 0 ? (
          <Stack space={2} as="section">
            <Heading level={2}>{UI.brCanBorrow[locale]}</Heading>
            <ul className="m-0 flex list-none flex-col gap-[var(--space-3)] p-0">
              {categories.map((c) => {
                const hint = pick({ th: c.hintTh, en: c.hintEn }, locale);
                return (
                  <li key={c.id}>
                    <span className="font-semibold">{pick({ th: c.nameTh, en: c.nameEn }, locale)}</span>
                    {hint ? <span className="block text-ink-900">{hint}</span> : null}
                    <span className="block text-sm text-ink-600">
                      {UI.brCategoryRules[locale].replace("{n}", String(c.noticeWorkingDays)).replace("{cards}", String(c.depositCards))}
                      {c.maxPerRequest != null ? ` ${UI.brCategoryMax[locale].replace("{max}", String(c.maxPerRequest))}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Stack>
        ) : null}

        <Stack space={2} as="section">
          <Heading level={2}>{UI.brYouWillNeed[locale]}</Heading>
          <ul className="m-0 flex list-disc flex-col gap-[var(--space-1)] pl-[var(--space-6)]">
            <li>{UI.brNeed1[locale]}</li>
            <li>{UI.brNeed2[locale]}</li>
            <li>{UI.brNeed3[locale]}</li>
            <li>{UI.brNeed4[locale]}</li>
          </ul>
        </Stack>

        <InsetText>
          <p className="m-0">{UI.brRulesNote[locale].replace("{loan}", String(MAX_LOAN_DAYS)).replace("{ahead}", String(MAX_ADVANCE_DAYS))}</p>
          <p className="m-0 mt-[var(--space-2)]">
            <a href={localePath(locale, "/borrow/availability")} className="text-action underline">
              {UI.brSeeAvailability[locale]}
            </a>
          </p>
        </InsetText>

        {available ? (
          <form action={beginJourney} noValidate>
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit">{UI.brStartNow[locale]}</Button>
          </form>
        ) : (
          <NotificationBanner variant="warning" title={UI.serviceUnavailableTitle[locale]}>
            {UI.brUnavailable[locale]}
          </NotificationBanner>
        )}

        <ul className="m-0 flex list-none flex-col gap-[var(--space-1)] p-0">
          <li>
            <a href={localePath(locale, "/borrow/privacy")} className="text-action underline">
              {UI.brPrivacyLink[locale]}
            </a>
          </li>
          <li>
            <a href={localePath(locale, "/borrow/track")} className="text-action underline">
              {UI.brTrackLink[locale]}
            </a>
          </li>
        </ul>
      </Stack>
    </Container>
  );
}
