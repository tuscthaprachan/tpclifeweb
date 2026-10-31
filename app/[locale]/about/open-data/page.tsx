import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MetadataList, PageHead, TUSC_PATH, TUSU_PATH, fillText } from "@/components/domain/open-data";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { CiteThis } from "@/components/ui/CiteThis";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { Stack } from "@/components/ui/Stack";
import { externalLinkProps, externalLinkSuffix } from "@/lib/a11y";
import { DEFAULT_LOCALE, LOCALES, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getOpenDataDocuments } from "@/lib/open-data/read";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/about/open-data"),
    title: UI.odOpenData[locale],
    description: UI.odLandingSummary[locale],
  };
}

export default async function OpenDataPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const documents = await getOpenDataDocuments();
  const pages = documents.reduce((sum, doc) => sum + (doc.pages ?? 0), 0);
  const updated = documents.reduce<string | null>((latest, doc) => (latest === null || doc.updatedAt > latest ? doc.updatedAt : latest), null);

  const cardLink = "inline-flex min-h-[var(--target-touch)] items-center font-bold text-action underline hover:text-action-hover";

  return (
    <Container>
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.about[locale], path: "/about" }, { label: UI.odOpenData[locale] }]} />
      <Stack space={8} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <PageHead label={UI.about[locale]} title={UI.odOpenData[locale]} summary={UI.odLandingSummary[locale]} className="mb-0" />

        <section aria-labelledby="od-bodies">
          <Heading level={2} id="od-bodies" className="m-0 mb-[var(--space-4)]">
            {UI.odLandingBodies[locale]}
          </Heading>
          <ul className="m-0 grid list-none gap-[var(--space-4)] p-0 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))]">
            <li className="rounded-panel border border-line-strong p-[var(--space-4)]">
              <Heading level={3} className="m-0 mb-[var(--space-2)] text-xl">
                {UI.odTuscBody[locale]}
              </Heading>
              <p className="m-0 mb-[var(--space-3)]">{UI.odTuscFull[locale]}</p>
              <MetadataList
                compact
                className="mb-[var(--space-3)]"
                items={[
                  { term: UI.odCardPublished[locale], value: UI.odTuscPublishes[locale] },
                  {
                    term: UI.odCardAmount[locale],
                    value: fillText(UI.odTuscAmount[locale], { files: formatNumber(documents.length, locale), pages: formatNumber(pages, locale) }),
                  },
                  { term: UI.odLastUpdated[locale], value: updated ? formatDate(updated, locale) : UI.odNotApplicable[locale] },
                ]}
              />
              <Link href={localePath(locale, TUSC_PATH)} className={cardLink}>
                {UI.odTuscSee[locale]}
              </Link>
            </li>
            <li className="rounded-panel border border-line-strong p-[var(--space-4)]">
              <Heading level={3} className="m-0 mb-[var(--space-2)] text-xl">
                {UI.odTusuBody[locale]}
              </Heading>
              <p className="m-0 mb-[var(--space-3)]">{UI.odTusuFull[locale]}</p>
              <MetadataList
                compact
                className="mb-[var(--space-3)]"
                items={[
                  { term: UI.odCardPublished[locale], value: UI.odTusuPublishes[locale] },
                  { term: UI.odCardAmount[locale], value: UI.odTusuAmount[locale] },
                  { term: UI.odLastUpdated[locale], value: UI.odNotApplicable[locale] },
                ]}
              />
              <Link href={localePath(locale, TUSU_PATH)} className={cardLink}>
                {UI.odTusuSee[locale]}
              </Link>
            </li>
          </ul>
        </section>

        <section aria-labelledby="od-licence">
          <Heading level={2} id="od-licence" className="m-0 mb-[var(--space-2)]">
            {UI.odLicenceHeading[locale]}
          </Heading>
          <p className="m-0 max-w-[var(--measure-en)]">
            {UI.odLicenceBefore[locale]}{" "}
            <a href={UI.odLicenceUrl[locale]} {...externalLinkProps(true)} className="text-action underline">
              {UI.odLicenceName[locale]}
              <span className="visually-hidden">{externalLinkSuffix(locale, true)}</span>
            </a>{" "}
            {UI.odLicenceAfter[locale]}
          </p>
        </section>

        <section aria-labelledby="od-cite">
          <Heading level={2} id="od-cite" className="m-0 mb-[var(--space-2)]">
            {UI.odCiteHeading[locale]}
          </Heading>
          <CiteThis locale={locale} headingLevel={3} title={UI.odCiteLandingTitle[locale]}>
            {UI.odCitePattern[locale]}
          </CiteThis>
        </section>

        <section aria-labelledby="report">
          <Heading level={2} id="report" className="m-0 mb-[var(--space-2)]">
            {UI.odReportHeading[locale]}
          </Heading>
          <p className="m-0 max-w-[var(--measure-en)]">{UI.odReportText[locale]}</p>
        </section>

        <section aria-labelledby="od-contact">
          <Heading level={2} id="od-contact" className="m-0 mb-[var(--space-2)]">
            {UI.odContactHeading[locale]}
          </Heading>
          <MetadataList
            className="mb-0"
            items={[
              { term: UI.odTuscShort[locale], value: UI.odTuscContact[locale] },
              { term: UI.odTusuShort[locale], value: UI.odTusuContact[locale] },
            ]}
          />
        </section>
      </Stack>
    </Container>
  );
}
