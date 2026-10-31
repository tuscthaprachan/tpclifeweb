import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AUDIT_REPORT_NUMBER,
  BUDGET_PAGE_PATH,
  BUDGET_REPORT_NUMBER,
  CANTEEN_REPORT_NUMBER,
  PageHead,
  REPORT_DESCRIPTION,
  REPORT_ISSUER_SHORT,
  REPORT_NUMBERS,
  REPORT_PAGE_NUMBERS,
  REPORT_SHORT_NAME,
  TuscShell,
  documentPath,
  documentTitle,
  documentTypeLabel,
  fillText,
  formatBytes,
  recommendationsFor,
  reportDate,
  responseLabel,
  sharedResponse,
} from "@/components/domain/open-data";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { DocumentList, type DocumentListItem } from "@/components/ui/DocumentList";
import { Heading } from "@/components/ui/Heading";
import { Stack } from "@/components/ui/Stack";
import { DEFAULT_LOCALE, LOCALES, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getOpenDataDocuments, getOpenDataRecommendations, type DocumentSummary } from "@/lib/open-data/read";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/about/open-data/tusc/reports"),
    title: UI.odRpTitle[locale],
    description: UI.odNavReportsDesc[locale],
  };
}

function reportHref(doc: DocumentSummary): string {
  if (doc.number === BUDGET_REPORT_NUMBER) return BUDGET_PAGE_PATH;
  return REPORT_PAGE_NUMBERS.includes(doc.number) ? `/about/open-data/tusc/reports/${doc.slug}` : documentPath(doc.slug);
}

export default async function TuscReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const [documents, recommendations] = await Promise.all([getOpenDataDocuments(), getOpenDataRecommendations()]);
  const byNumber = new Map(documents.map((doc) => [doc.number, doc]));
  const reports = REPORT_NUMBERS.flatMap((number) => byNumber.get(number) ?? []);

  const items: DocumentListItem[] = reports.map((doc) => ({
    title: documentTitle(doc, locale),
    href: localePath(locale, reportHref(doc)),
    type: documentTypeLabel(doc.type, locale),
    date: doc.dateIso,
    noDateText: reportDate(doc, locale),
    format: "PDF",
    size: formatBytes(doc.fileBytes, locale),
    pages: doc.pages === null ? undefined : fillText(UI.odPagesCount[locale], { n: formatNumber(doc.pages, locale) }),
    description: REPORT_DESCRIPTION[doc.number]?.[locale],
  }));

  const columns: DataTableColumn<DocumentSummary>[] = [
    {
      id: "report",
      header: UI.odRpColReport[locale],
      rowHeader: true,
      cell: (doc) => REPORT_SHORT_NAME[doc.number]?.[locale] ?? documentTitle(doc, locale),
    },
    { id: "issuer", header: UI.odMetaIssuedBy[locale], cell: (doc) => REPORT_ISSUER_SHORT[doc.number]?.[locale] ?? "" },
    {
      id: "pages",
      header: UI.odRpColPages[locale],
      align: "end",
      cell: (doc) => (doc.pages === null ? UI.odNotStated[locale] : formatNumber(doc.pages, locale)),
    },
    {
      id: "recs",
      header: UI.odRpColRecs[locale],
      cell: (doc) => {
        if (doc.number === AUDIT_REPORT_NUMBER) {
          return (
            <Link href={localePath(locale, reportHref(doc))} className="text-action underline">
              {UI.odRpRecsInPart3[locale]}
            </Link>
          );
        }
        if (doc.number === CANTEEN_REPORT_NUMBER) {
          const count = recommendationsFor(recommendations, doc.slug).length;
          return count > 0 ? (
            <Link href={`${localePath(locale, reportHref(doc))}#od-rp-recs`} className="text-action underline">
              {formatNumber(count, locale)}
            </Link>
          ) : (
            UI.odNotStated[locale]
          );
        }
        return UI.odRpRecsNone[locale];
      },
    },
    {
      id: "status",
      header: UI.odRpColStatus[locale],
      cell: (doc) => {
        if (doc.number === BUDGET_REPORT_NUMBER) return UI.odRpNoRecs[locale];
        const shared = sharedResponse(recommendationsFor(recommendations, doc.slug));
        return shared !== null ? responseLabel(shared, locale) : UI.odRpNoResponse[locale];
      },
    },
  ];

  return (
    <TuscShell locale={locale} current="reports">
      <PageHead label={UI.odOpenData[locale]} title={UI.odRpTitle[locale]} summary={UI.odRpSummary[locale]} />
      <Stack space={8}>
        <section aria-labelledby="od-rp-list">
          <Heading level={2} id="od-rp-list" className="m-0 mb-[var(--space-3)]">
            {fillText(UI.odRpListHeading[locale], { n: formatNumber(reports.length, locale) })}
          </Heading>
          <DocumentList items={items} locale={locale} headingLevel={3} />
          <p className="m-0 mt-[var(--space-3)] max-w-[var(--measure-en)] text-sm text-ink-600">{UI.odRpDateNote[locale]}</p>
        </section>

        <section aria-labelledby="od-rp-status">
          <Heading level={2} id="od-rp-status" className="m-0 mb-[var(--space-3)]">
            {UI.odRpStatusHeading[locale]}
          </Heading>
          <DataTable columns={columns} rows={reports} getRowKey={(doc) => doc.id} caption={UI.odRpStatusCaption[locale]} />
          <p className="m-0 mt-[var(--space-3)] max-w-[var(--measure-en)] text-ink-900">{UI.odRpResponseNote[locale]}</p>
        </section>

        <section aria-labelledby="od-rp-how">
          <Heading level={2} id="od-rp-how" className="m-0 mb-[var(--space-3)]">
            {UI.odRpHowHeading[locale]}
          </Heading>
          <p className="m-0 mb-[var(--space-3)] max-w-[var(--measure-en)] text-ink-900">{UI.odRpHowBody[locale]}</p>
          <p className="m-0">
            <Link href={localePath(locale, "/about/open-data/tusc/documents")} className="inline-flex min-h-[var(--target-min)] items-center text-action underline">
              {UI.odRpOriginalsLink[locale]}
            </Link>
          </p>
        </section>
      </Stack>
    </TuscShell>
  );
}
