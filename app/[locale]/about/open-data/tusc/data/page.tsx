import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  MetadataList,
  PageHead,
  TUSC_PATH,
  TuscShell,
  documentPath,
  documentTitle,
  fillText,
  fiscalYearLabel,
  formatBytes,
  formatMoneyAmount,
} from "@/components/domain/open-data";
import { DATASET_INFO } from "@/components/domain/open-data/data/datasets";
import { BudgetDictionary } from "@/components/domain/open-data/data/BudgetDictionary";
import { DownloadList } from "@/components/ui/DownloadList";
import { Heading } from "@/components/ui/Heading";
import { Link } from "@/components/ui/Link";
import { Stack } from "@/components/ui/Stack";
import { TableOfContents } from "@/components/ui/TableOfContents";
import { externalLinkProps, externalLinkSuffix } from "@/lib/a11y";
import { DEFAULT_LOCALE, LOCALES, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { datasetPath, getDatasetSummaries } from "@/lib/open-data/datasets";
import { getOpenDataBudgetLines, getOpenDataDocuments } from "@/lib/open-data/read";

const DATA_PATH = `${TUSC_PATH}/data`;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, DATA_PATH),
    title: `${UI.odNavData[locale]} | ${UI.odTuscShort[locale]}`,
    description: UI.odDataSummary[locale],
  };
}

export default async function TuscDataPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const [summaries, lines, documents] = await Promise.all([getDatasetSummaries(), getOpenDataBudgetLines(), getOpenDataDocuments()]);
  const updated = documents.reduce<string | null>((latest, doc) => (latest === null || doc.updatedAt > latest ? doc.updatedAt : latest), null);
  const released = updated ? formatDate(updated, locale) : UI.odNotApplicable[locale];
  const report = documents.find((doc) => doc.number === "48");
  const n = (value: number) => formatNumber(value, locale);
  const h2 = "m-0 mb-[var(--space-3)]";

  return (
    <TuscShell locale={locale} current="data">
      <PageHead label={UI.odTuscBody[locale]} title={UI.odNavData[locale]} summary={UI.odDataSummary[locale]} />
      <MetadataList
        items={[
          { term: UI.odDataReleased[locale], value: released },
          { term: UI.odDataNextRelease[locale], value: UI.odToBeAnnounced[locale] },
          { term: UI.odContact[locale], value: UI.odTuscContact[locale] },
          {
            term: UI.odLicenceHeading[locale],
            value: (
              <a href={UI.odLicenceUrl[locale]} {...externalLinkProps(true)} className="text-action underline">
                {UI.odLicenceName[locale]}
                <span className="visually-hidden">{externalLinkSuffix(locale, true)}</span>
              </a>
            ),
          },
        ]}
      />
      <Stack space={8}>
        <TableOfContents
          locale={locale}
          headingLevel={2}
          title={UI.odDataOnThisPage[locale]}
          items={[
            { label: UI.odDataTocFiles[locale], href: "#files" },
            { label: UI.odDataTocDatasets[locale], href: "#datasets" },
            { label: UI.odDataTocDictionary[locale], href: "#dictionary" },
          ]}
        />

        <section aria-labelledby="files">
          <Heading level={2} id="files" className={h2}>
            {UI.odDataTocFiles[locale]}
          </Heading>
          <ul className="m-0 flex max-w-[var(--measure-en)] list-disc flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
            <li>{UI.odDataFiles1[locale]}</li>
            <li>{UI.odDataFiles2[locale]}</li>
            <li>{UI.odDataFiles3[locale]}</li>
          </ul>
        </section>

        <section aria-labelledby="datasets">
          <Heading level={2} id="datasets" className={h2}>
            {UI.odDataTocDatasets[locale]}
          </Heading>
          <ul className="m-0 flex list-none flex-col p-0">
            {DATASET_INFO.map((info) => {
              const summary = summaries.find((s) => s.key === info.key);
              if (!summary) return null;
              const id = `dataset-${info.key}`;
              return (
                <li key={info.key} className="border-t border-line py-[var(--space-5)] last:border-b">
                  <article aria-labelledby={id}>
                    <Heading level={3} id={id} className="m-0 mb-[var(--space-2)]">
                      {info.title[locale]}
                    </Heading>
                    <ul className="m-0 mb-[var(--space-2)] flex list-none flex-wrap gap-x-[var(--space-5)] p-0 text-sm text-ink-600">
                      <li>{UI.odDataDataset[locale]}</li>
                      <li>{fillText(UI.odDataReleasedOn[locale], { date: released })}</li>
                      <li>{UI.odDataNextShort[locale]}</li>
                      <li>{fillText(UI.odDataRows[locale], { n: n(summary.rows) })}</li>
                    </ul>
                    <p className="m-0 mb-[var(--space-3)] max-w-[var(--measure-en)]">{info.description[locale]}</p>
                    <p className="m-0 mb-[var(--space-3)] max-w-[var(--measure-en)] text-sm text-ink-600">
                      <span className="font-semibold">{UI.odDataColumns[locale]}:</span> {summary.columns.join(", ")}
                    </p>
                    <DownloadList
                      items={[{ label: info.title[locale], href: datasetPath(info.key), format: "CSV", size: formatBytes(summary.bytes, locale) }]}
                    />
                    <p className="m-0 mt-[var(--space-2)] text-sm">
                      <span className="font-semibold">{UI.odDataUsedIn[locale]}:</span>{" "}
                      {info.usedIn.map((section, index) => (
                        <span key={section.href}>
                          {index > 0 ? ", " : ""}
                          <Link href={localePath(locale, section.href)} locale={locale} className="text-action underline">
                            {section.label[locale]}
                          </Link>
                        </span>
                      ))}
                    </p>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="dictionary">
          <Heading level={2} id="dictionary" className={h2}>
            {UI.odDataDictHeading[locale]}
          </Heading>
          <BudgetDictionary
            locale={locale}
            lines={lines}
            fileSize={formatBytes(summaries.find((s) => s.key === "budget-lines")?.bytes ?? null, locale)}
            sourceTitle={report ? documentTitle(report, locale) : ""}
            sourceHref={report ? localePath(locale, documentPath(report.slug)) : null}
            format={{ money: (value) => formatMoneyAmount(value, locale), year: (year) => fiscalYearLabel(year, locale) }}
          />
        </section>
      </Stack>
    </TuscShell>
  );
}
