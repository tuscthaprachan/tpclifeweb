/**
 * The accessibility statement. WCAG 2.2 AA is the target for every page on
 * this site (CONTRIBUTING.md), and this page is where that claim is checked
 * against reality: what is known to conform, what is not yet, and how to
 * reach TUSU/TUSC Tha Prachan if something does not work.
 *
 * Written for a real reader, not boilerplate: every claim below is something
 * this repository actually does (checked contrast, a real skip link, forms
 * that work with JavaScript off) or a real, named gap (the TU91 handbook
 * still being re-authored from scanned images, third-party form providers
 * this site does not control). Do not add a claim here that is not true of
 * the current build.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { getSiteSettings } from "@/components/layout/site-settings";
import { Container, Heading, Prose, Stack, Timestamp } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, type Locale, type LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { alternatesFor } from "@/lib/i18n/metadata";
import { fillText } from "@/lib/i18n/editable";
import { ACCESSIBILITY_TEXT } from "./text";

const intro = (name: LocaleString): LocaleString => ({
  th: fillText(ACCESSIBILITY_TEXT.intro.th, { nameTh: name.th, nameEn: name.en }),
  en: fillText(ACCESSIBILITY_TEXT.intro.en, { nameTh: name.th, nameEn: name.en }),
});

const CONFORMANCE_HEADING = ACCESSIBILITY_TEXT.conformanceHeading;
const CONFORMANCE_BODY = ACCESSIBILITY_TEXT.conformanceBody;

const WORKS_HEADING = ACCESSIBILITY_TEXT.worksHeading;
const WORKS_ITEMS = [
  ACCESSIBILITY_TEXT.works1,
  ACCESSIBILITY_TEXT.works2,
  ACCESSIBILITY_TEXT.works3,
  ACCESSIBILITY_TEXT.works4,
  ACCESSIBILITY_TEXT.works5,
  ACCESSIBILITY_TEXT.works6,
  ACCESSIBILITY_TEXT.works7,
];

const GAPS_HEADING = ACCESSIBILITY_TEXT.gapsHeading;
const GAPS_ITEMS = [
  ACCESSIBILITY_TEXT.gaps1,
  ACCESSIBILITY_TEXT.gaps2,
  ACCESSIBILITY_TEXT.gaps3,
  ACCESSIBILITY_TEXT.gaps4,
];

const REPORT_HEADING = ACCESSIBILITY_TEXT.reportHeading;
const REPORT_BODY = ACCESSIBILITY_TEXT.reportBody;

const PREPARED_LABEL = ACCESSIBILITY_TEXT.preparedLabel;
const PREPARED_DATE = "2026-08-09";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/accessibility"),
    title: UI.accessibilityStatement[locale],
    description: intro((await getSiteSettings()).serviceName)[locale],
  };
}

export default async function AccessibilityStatementPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  return (
    <Container width="narrow">
      <Breadcrumbs
        locale={locale}
        items={[{ label: UI.home[locale], path: "/" }, { label: UI.accessibilityStatement[locale] }]}
      />
      <Stack space={8} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Stack space={4}>
          <Heading level={1}>{UI.accessibilityStatement[locale]}</Heading>
          <Prose locale={locale}>
            <p>{intro((await getSiteSettings()).serviceName)[locale]}</p>
          </Prose>
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{CONFORMANCE_HEADING[locale]}</Heading>
          <Prose locale={locale}>
            <p>{CONFORMANCE_BODY[locale]}</p>
          </Prose>
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{WORKS_HEADING[locale]}</Heading>
          <Prose locale={locale}>
            <ul>
              {WORKS_ITEMS.map((item) => (
                <li key={item.en}>{item[locale]}</li>
              ))}
            </ul>
          </Prose>
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{GAPS_HEADING[locale]}</Heading>
          <Prose locale={locale}>
            <ul>
              {GAPS_ITEMS.map((item) => (
                <li key={item.en}>{item[locale]}</li>
              ))}
            </ul>
          </Prose>
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{REPORT_HEADING[locale]}</Heading>
          <Prose locale={locale}>
            <p>{REPORT_BODY[locale]}</p>
          </Prose>
        </Stack>

        <p className="m-0 text-sm text-ink-600">
          {PREPARED_LABEL[locale]} <Timestamp value={PREPARED_DATE} locale={locale} />
        </p>
      </Stack>
    </Container>
  );
}
