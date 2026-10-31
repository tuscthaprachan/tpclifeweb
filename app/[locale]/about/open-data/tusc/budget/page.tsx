import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  MetadataList,
  PageHead,
  TUSC_PATH,
  TuscShell,
  documentTitle,
  documentPath,
  fillText,
  fiscalYearLabel,
  formatBytes,
  formatMoneyAmount,
} from "@/components/domain/open-data";
import { RELEASE_DATE } from "@/components/domain/open-data/budget/Bulletin";
import { Txt } from "@/components/domain/open-data/budget/Txt";
import { getBudgetFiles } from "@/components/domain/open-data/budget/data";
import { orgLabel, orgByName } from "@/components/domain/open-data/budget/labels";
import { allYears, bulletinYears, organisationLines } from "@/components/domain/open-data/budget/model";
import { PRINTED_SHARE_2568, PRINTED_TOTAL, REPORT_FILE, UNION_SHARE } from "@/components/domain/open-data/budget/printed";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { DocumentList } from "@/components/ui/DocumentList";
import { DownloadList } from "@/components/ui/DownloadList";
import { Heading } from "@/components/ui/Heading";
import { Link } from "@/components/ui/Link";
import { RelatedLinks } from "@/components/ui/RelatedLinks";
import { Stack } from "@/components/ui/Stack";
import { DEFAULT_LOCALE, LOCALES, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { csvBytes } from "@/lib/open-data/csv";
import { getOpenDataBudgetLines, getOpenDataDocuments } from "@/lib/open-data/read";

const BUDGET_PATH = `${TUSC_PATH}/budget`;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, BUDGET_PATH),
    title: `${UI.odNavBudget[locale]} | ${UI.odTuscShort[locale]}`,
    description: UI.odBudIndexSummary[locale],
  };
}

interface OrganisationRow {
  key: string;
  label: string;
  amount: string;
  share: string;
}

export default async function TuscBudgetPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const [lines, documents] = await Promise.all([getOpenDataBudgetLines(), getOpenDataDocuments()]);
  const years = allYears(lines);
  const bulletins = new Set(bulletinYears(lines));
  const report = documents.find((doc) => doc.number === REPORT_FILE);
  const updated = documents.reduce<string | null>((latest, doc) => (latest === null || doc.updatedAt > latest ? doc.updatedAt : latest), null);
  const n = (value: number) => formatNumber(value, locale);
  const money = (value: string) => formatMoneyAmount(value, locale);

  const yearRows = years.map((year) => {
    const lineCount = organisationLines(lines, year).length;
    const files = bulletins.has(year) ? 4 : 0;
    return { year, total: PRINTED_TOTAL[year]?.amount ?? null, lineCount, bulletin: bulletins.has(year), files };
  });

  const yearColumns: DataTableColumn<(typeof yearRows)[number]>[] = [
    { id: "year", header: UI.odBudColYear[locale], rowHeader: true, cell: (row) => fiscalYearLabel(row.year, locale) },
    { id: "total", header: UI.odBudColTotal[locale], align: "end", cell: (row) => (row.total ? money(row.total) : UI.odNotStated[locale]) },
    {
      id: "published",
      header: UI.odBudColPublished[locale],
      cell: (row) => (
        <Link href={localePath(locale, row.bulletin ? `${BUDGET_PATH}/${row.year}` : `${BUDGET_PATH}#fy${row.year}`)} locale={locale} className="text-action underline">
          {row.bulletin ? UI.odBudPublishedFull[locale] : fillText(UI.odBudPublishedOrgTable[locale], { n: n(row.lineCount) })}
        </Link>
      ),
    },
  ];

  const latest = years.find((year) => bulletins.has(year));
  const earlierYears = years.filter((year) => !bulletins.has(year));

  return (
    <TuscShell locale={locale} current="budget">
      <PageHead label={UI.odOpenData[locale]} title={UI.odKeyBudget[locale]} summary={UI.odBudIndexSummary[locale]} />
      <MetadataList
        items={[
          { term: UI.odPublishedBy[locale], value: UI.odTuscFull[locale] },
          { term: UI.odLastUpdated[locale], value: updated ? formatDate(updated, locale) : UI.odNotApplicable[locale] },
          { term: UI.odNextUpdate[locale], value: UI.odToBeAnnounced[locale] },
          { term: UI.odContact[locale], value: UI.odTuscContact[locale] },
        ]}
      />
      <Stack space={8}>
        <section aria-labelledby="years">
          <Heading level={2} id="years" className="m-0 mb-[var(--space-3)]">
            {UI.odBudFiscalYears[locale]}
          </Heading>
          <DataTable
            columns={yearColumns}
            rows={yearRows}
            getRowKey={(row) => String(row.year)}
            caption={fillText(UI.odBudTableYears[locale], { n: n(1) })}
            sourceNote={
              report ? (
                <>
                  {UI.odSource[locale]}:{" "}
                  <Link href={localePath(locale, documentPath(report.slug))} locale={locale} className="text-action underline">
                    {documentTitle(report, locale)}
                  </Link>
                </>
              ) : undefined
            }
          />
        </section>

        {latest !== undefined ? (
          <section aria-labelledby={`fy${latest}`}>
            <Heading level={2} id={`fy${latest}`} className="m-0 mb-[var(--space-3)]">
              {fillText(UI.odBudFyHeading[locale], { year: latest })}
            </Heading>
            <p className="m-0 mb-[var(--space-4)] max-w-[var(--measure-en)]">
              {fillText(UI.odBudFullBlurb[locale], {
                total: money(PRINTED_TOTAL[latest]?.amount ?? ""),
                share: UNION_SHARE,
              })}
            </p>
            <DocumentList
              locale={locale}
              headingLevel={3}
              items={[
                {
                  title: fillText(UI.odBudBulletinTitle[locale], { year: latest, ce: latest - 543 }),
                  href: localePath(locale, `${BUDGET_PATH}/${latest}`),
                  type: UI.odBudBulletinKind[locale],
                  date: RELEASE_DATE,
                  format: fillText(UI.odBudBulletinFormats[locale], { n: n(4) }),
                  size: "",
                },
              ]}
            />
          </section>
        ) : null}

        {earlierYears.map((year) => (
          <section key={year} aria-labelledby={`fy${year}`}>
            <Heading level={2} id={`fy${year}`} className="m-0 mb-[var(--space-3)]">
              {fillText(UI.odBudFyHeading[locale], { year })}
            </Heading>
            <EarlierYear locale={locale} year={year} next={latest ?? year + 1} lines={lines} reportSlug={report?.slug ?? null} reportTitle={report ? documentTitle(report, locale) : ""} />
          </section>
        ))}

        <section aria-labelledby="not-published">
          <Heading level={2} id="not-published" className="m-0 mb-[var(--space-3)]">
            {UI.odBudNotPublished[locale]}
          </Heading>
          <ul className="m-0 flex list-disc flex-col gap-[var(--space-1)] pl-[var(--space-6)]">
            {earlierYears.length > 0 ? <li>{fillText(UI.odBudNotPublishedEarlier[locale], { year: Math.min(...years) - 1 })}</li> : null}
            {earlierYears.map((year) => (
              <li key={year}>{fillText(UI.odBudNotPublishedDetail[locale], { year })}</li>
            ))}
          </ul>
        </section>

        <RelatedLinks
          locale={locale}
          headingLevel={2}
          items={[
            ...(latest !== undefined
              ? [
                  {
                    label: fillText(UI.odBudRelatedReport[locale], { year: latest }),
                    href: localePath(locale, `${TUSC_PATH}/reports`),
                    description: UI.odBudRelatedReportDesc[locale],
                  },
                ]
              : []),
            ...(report
              ? [
                  {
                    label: fillText(UI.odBudRelatedSource[locale], { title: documentTitle(report, locale) }),
                    href: localePath(locale, documentPath(report.slug)),
                    description: fillText(UI.odBudRelatedSourceDesc[locale], { pages: n(report.pages ?? 0) }),
                  },
                ]
              : []),
            {
              label: UI.odBudRelatedDataset[locale],
              href: localePath(locale, `${TUSC_PATH}/data`),
              description: fillText(UI.odBudRelatedDatasetDesc[locale], { n: n(lines.length) }),
            },
          ]}
        />
      </Stack>
    </TuscShell>
  );
}

async function EarlierYear({
  locale,
  year,
  next,
  lines,
  reportSlug,
  reportTitle,
}: {
  locale: Locale;
  year: number;
  next: number;
  lines: Awaited<ReturnType<typeof getOpenDataBudgetLines>>;
  reportSlug: string | null;
  reportTitle: string;
}) {
  const orgs = organisationLines(lines, year).sort((a, b) => Number(b.amount) - Number(a.amount));
  const files = await getBudgetFiles(year);
  const file = files["organisations.csv"];
  const total = PRINTED_TOTAL[year]?.amount ?? "";
  const money = (value: string) => formatMoneyAmount(value, locale);

  const rows: OrganisationRow[] = orgs.map((o) => ({
    key: o.organisation,
    label: orgLabel(o.org ?? orgByName(o.organisation), o.organisation, locale),
    amount: o.amount,
    share: (o.org && PRINTED_SHARE_2568[o.org.key]) || UI.odNotStated[locale],
  }));
  const columns: DataTableColumn<OrganisationRow>[] = [
    { id: "organisation", header: UI.odBudColOrganisation[locale], rowHeader: true, cell: (row) => <Txt text={row.label} locale={locale} /> },
    { id: "amount", header: UI.odBudColAmount[locale], align: "end", cell: (row) => money(row.amount) },
    { id: "share", header: UI.odBudColShare[locale], align: "end", cell: (row) => row.share },
  ];

  return (
    <Stack space={4}>
      <p className="m-0 max-w-[var(--measure-en)]">{fillText(UI.odBudNoOwnReport[locale], { year, next, total: money(total) })}</p>
      <DataTable
        id={`table-${year}`}
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.key}
        caption={fillText(UI.odBudTableOrgYear[locale], { n: formatNumber(2, locale), year })}
        footerRows={[{ key: "total", cells: { organisation: UI.odBudTotal[locale], amount: money(total), share: UI.odNotStated[locale] } }]}
        sourceNote={
          reportSlug ? (
            <>
              {UI.odSource[locale]}:{" "}
              <Link href={localePath(locale, documentPath(reportSlug))} locale={locale} className="text-action underline">
                {reportTitle}
              </Link>
              , {fillText(UI.odBudPage[locale], { page: formatNumber(16, locale) })}
            </>
          ) : undefined
        }
        footnotes={[UI.odBudNoteSorted[locale], fillText(UI.odBudNoteYearSource[locale], { year, next }), UI.odBudNoteShares[locale]]}
        locale={locale}
      />
      {file ? (
        <DownloadList
          items={[
            {
              label: fillText(UI.odBudOrgTableData[locale], { year }),
              href: `${BUDGET_PATH}/${year}/organisations.csv`,
              format: UI.odBudCsvFormat[locale],
              size: formatBytes(csvBytes(file), locale),
            },
          ]}
        />
      ) : null}
    </Stack>
  );
}
