/**
 * Shared frame for every /eat page. While the pages read the surveyed dataset
 * (`lib/canteen/dataset.ts`) rather than Sanity, it puts a banner above the
 * page saying where the menus came from and that diet tags were not asked.
 */

import type { ReactNode } from "react";

import { Container, NotificationBanner } from "@/components/ui";
import { SURVEY_NOTICE, isSurveyDataset } from "@/lib/canteen/dataset";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { getCanteenData } from "@/lib/sanity/queries";

export default async function EatLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  if (!isSurveyDataset(await getCanteenData())) return <>{children}</>;

  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  return (
    <>
      <Container className="pt-[var(--space-4)]">
        <NotificationBanner variant="info" title={SURVEY_NOTICE.title[locale]}>
          <p className="m-0">{SURVEY_NOTICE.body[locale]}</p>
        </NotificationBanner>
      </Container>
      {children}
    </>
  );
}
