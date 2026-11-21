import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Heading, Link, Stack, StatusTag } from "@/components/ui";
import { EXTERNAL_SERVICES } from "@/data/harvested-inventory";
import { DEFAULT_LOCALE, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getServicePageText } from "@/lib/content/service-text";
import { alternatesFor } from "@/lib/i18n/metadata";

/*
 * Positional access into the harvested inventory's `as const` tuples, kept
 * type-exact rather than going through `.find()` (which would collapse the
 * union of differently-shaped entries and lose fields like `destinationUrl`
 * that only some of them have). The runtime checks below exist only to fail
 * loudly if the source file's order ever changes, since this page reads
 * these three records by real URL, not by invented content: CONTRIBUTING.md
 * requires that. The emergency report Google Form that used to open this page
 * is superseded by the issue reporting service at /complaints; it stays in the
 * inventory as a historical record and is no longer linked.
 */
const traffyFondue = EXTERNAL_SERVICES[1];
if (traffyFondue.key !== "traffyFondue") {
  throw new Error('data/harvested-inventory.ts: EXTERNAL_SERVICES[1] is no longer "traffyFondue". Update app/[locale]/report/page.tsx to match.');
}

const wellbeingCenter = EXTERNAL_SERVICES[2];
if (wellbeingCenter.key !== "wellbeingCenter") {
  throw new Error('data/harvested-inventory.ts: EXTERNAL_SERVICES[2] is no longer "wellbeingCenter". Update app/[locale]/report/page.tsx to match.');
}

const tuWellBeing = EXTERNAL_SERVICES[3];
if (tuWellBeing.key !== "tuWellBeing") {
  throw new Error('data/harvested-inventory.ts: EXTERNAL_SERVICES[3] is no longer "tuWellBeing". Update app/[locale]/report/page.tsx to match.');
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/report"), title: UI.report[locale] };
}

export default async function ReportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const t = await getServicePageText("report");

  return (
    <Container width="narrow">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.report[locale] }]} />
      <Stack space={8} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Stack space={2}>
          <Heading level={1}>{UI.report[locale]}</Heading>
          <p className="m-0 text-ink-600">{t.intro[locale]}</p>
        </Stack>

        <Stack space={3} as="section">
          <Heading level={2}>{UI.cpServiceName[locale]}</Heading>
          <p className="m-0 text-ink-600">{t.issueUseWhen[locale]}</p>
          <StatusTag tone="neutral" label={UI.noSignInNeeded[locale]} />
          <p className="m-0">
            <Link href="/complaints" locale={locale} className="font-semibold text-action">
              {t.issueLink[locale]}
            </Link>
          </p>
        </Stack>

        <Stack space={3} as="section">
          <Heading level={2}>{pick(traffyFondue.name, locale)}</Heading>
          <p className="m-0 text-ink-600">{t.facilityUseWhen[locale]}</p>
          {traffyFondue.note ? <p className="m-0 text-ink-600">{pick(traffyFondue.note, locale)}</p> : null}
          <StatusTag tone="neutral" label={UI.noSignInNeeded[locale]} />
          <p className="m-0">
            <Link href={traffyFondue.url} locale={locale} className="font-semibold text-action">
              {t.facilityLink[locale]}
            </Link>
          </p>
        </Stack>

        <Stack space={3} as="section">
          <Heading level={2}>{t.wellbeingHeading[locale]}</Heading>
          <p className="m-0 text-ink-600">{t.wellbeingUseWhen[locale]}</p>
          <StatusTag tone="neutral" label={UI.noSignInNeeded[locale]} />
          <ul className="m-0 flex flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
            <li>
              <Link href={wellbeingCenter.url} locale={locale} className="font-semibold text-action">
                {pick(wellbeingCenter.name, locale)}
              </Link>
              {wellbeingCenter.note ? <span className="ml-[var(--space-2)] text-sm text-ink-600">{pick(wellbeingCenter.note, locale)}</span> : null}
            </li>
            <li>
              <Link href={tuWellBeing.url} locale={locale} className="font-semibold text-action">
                {pick(tuWellBeing.name, locale)}
              </Link>
              {tuWellBeing.note ? <span className="ml-[var(--space-2)] text-sm text-ink-600">{pick(tuWellBeing.note, locale)}</span> : null}
            </li>
          </ul>
        </Stack>
      </Stack>
    </Container>
  );
}
