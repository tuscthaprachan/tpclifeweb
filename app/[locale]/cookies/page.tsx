/**
 * The cookies page. States plainly what is stored and why, and nothing more.
 *
 * There is no consent banner here on purpose. Every cookie this site sets is
 * strictly necessary (it stores your language choice so the toggle in
 * lib/i18n/config.ts can keep you on the page you were reading), and Vercel
 * Web Analytics, the only other thing that can run, does not use cookies at
 * all. A consent banner over a cookie that is exempt from consent under
 * strictly-necessary rules would be theatre, not information, so this page
 * says what is true instead of asking for a click nobody needs to make.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { getSiteSettings } from "@/components/layout/site-settings";
import { Container, DataTable, Heading, Prose, Stack } from "@/components/ui";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale, type LocaleString } from "@/lib/i18n/config";
import { THEME_COOKIE } from "@/lib/theme/config";
import { JS_COOKIE } from "@/lib/query-routes";
import { UI } from "@/lib/i18n/strings";
import { alternatesFor } from "@/lib/i18n/metadata";
import { COOKIES_TEXT } from "./text";
import { fillText } from "@/lib/i18n/editable";

const intro = (name: LocaleString): LocaleString => ({
  th: fillText(COOKIES_TEXT.intro.th, { nameTh: name.th, nameEn: name.en }),
  en: fillText(COOKIES_TEXT.intro.en, { nameTh: name.th, nameEn: name.en }),
});

const WHAT_HEADING = COOKIES_TEXT.whatHeading;

const TABLE_HEADERS = {
  name: COOKIES_TEXT.tableHeadersName,
  purpose: COOKIES_TEXT.tableHeadersPurpose,
  duration: COOKIES_TEXT.tableHeadersDuration,
};

const LOCALE_COOKIE_ROW = {
  purpose: COOKIES_TEXT.localeCookieRowPurpose,
  duration: COOKIES_TEXT.localeCookieRowDuration,
};

const THEME_COOKIE_ROW = {
  purpose: COOKIES_TEXT.themeCookieRowPurpose,
  duration: COOKIES_TEXT.themeCookieRowDuration,
};

const JS_COOKIE_ROW = {
  purpose: COOKIES_TEXT.jsCookieRowPurpose,
  duration: COOKIES_TEXT.jsCookieRowDuration,
};

const LF_JOURNEY_ROW = {
  purpose: COOKIES_TEXT.lfJourneyRowPurpose,
  duration: COOKIES_TEXT.lfJourneyRowDuration,
};

const LF_TRACK_ROW = {
  purpose: COOKIES_TEXT.lfTrackRowPurpose,
  duration: COOKIES_TEXT.lfTrackRowDuration,
};

const NECESSARY_HEADING = COOKIES_TEXT.necessaryHeading;
const NECESSARY_BODY = COOKIES_TEXT.necessaryBody;

const ANALYTICS_HEADING = COOKIES_TEXT.analyticsHeading;
const ANALYTICS_BODY = COOKIES_TEXT.analyticsBody;

const NO_ADS_HEADING = COOKIES_TEXT.noAdsHeading;
const NO_ADS_BODY = COOKIES_TEXT.noAdsBody;

const CONTROL_HEADING = COOKIES_TEXT.controlHeading;
const CONTROL_BODY = COOKIES_TEXT.controlBody;

const EAT_STORAGE_HEADING = COOKIES_TEXT.eatStorageHeading;
const EAT_STORAGE_BODY = COOKIES_TEXT.eatStorageBody;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/cookies"),
    title: UI.cookies[locale],
    description: intro((await getSiteSettings()).serviceName)[locale],
  };
}

export default async function CookiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  return (
    <Container width="narrow">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.cookies[locale] }]} />
      <Stack space={8} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Stack space={4}>
          <Heading level={1}>{UI.cookies[locale]}</Heading>
          <Prose locale={locale}>
            <p>{intro((await getSiteSettings()).serviceName)[locale]}</p>
          </Prose>
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{WHAT_HEADING[locale]}</Heading>
          <DataTable
            caption={WHAT_HEADING[locale]}
            columns={[
              { id: "name", header: TABLE_HEADERS.name[locale], cell: (row) => row.name },
              { id: "purpose", header: TABLE_HEADERS.purpose[locale], cell: (row) => row.purpose },
              { id: "duration", header: TABLE_HEADERS.duration[locale], cell: (row) => row.duration },
            ]}
            rows={[
              {
                name: LOCALE_COOKIE,
                purpose: LOCALE_COOKIE_ROW.purpose[locale],
                duration: LOCALE_COOKIE_ROW.duration[locale],
              },
              { name: THEME_COOKIE, purpose: THEME_COOKIE_ROW.purpose[locale], duration: THEME_COOKIE_ROW.duration[locale] },
              { name: JS_COOKIE, purpose: JS_COOKIE_ROW.purpose[locale], duration: JS_COOKIE_ROW.duration[locale] },
              { name: "lf_journey_…, cp_journey, br_journey", purpose: LF_JOURNEY_ROW.purpose[locale], duration: LF_JOURNEY_ROW.duration[locale] },
              { name: "lf_track, cp_track, br_track", purpose: LF_TRACK_ROW.purpose[locale], duration: LF_TRACK_ROW.duration[locale] },
            ]}
            getRowKey={(row) => row.name}
          />
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{NECESSARY_HEADING[locale]}</Heading>
          <Prose locale={locale}>
            <p>{NECESSARY_BODY[locale]}</p>
          </Prose>
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{ANALYTICS_HEADING[locale]}</Heading>
          <Prose locale={locale}>
            <p>{ANALYTICS_BODY[locale]}</p>
          </Prose>
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{NO_ADS_HEADING[locale]}</Heading>
          <Prose locale={locale}>
            <p>{NO_ADS_BODY[locale]}</p>
          </Prose>
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{CONTROL_HEADING[locale]}</Heading>
          <Prose locale={locale}>
            <p>{CONTROL_BODY[locale]}</p>
          </Prose>
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{EAT_STORAGE_HEADING[locale]}</Heading>
          <Prose locale={locale}>
            <p>{EAT_STORAGE_BODY[locale]}</p>
          </Prose>
        </Stack>
      </Stack>
    </Container>
  );
}
