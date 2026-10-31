import {
  MetadataList,
  PageHead,
  TUSC_PATH,
  TuscShell,
  documentPath,
  fillText,
  formatBytes,
} from "@/components/domain/open-data";
import { LiveFundsResults, FundsResults } from "@/components/domain/open-data/funds/FundsResults";
import { fundKind, type FundListRow } from "@/components/domain/open-data/funds/kinds";
import { REGULATED_FUNDS, printedCode, type RegulatedFund } from "@/components/domain/open-data/funds/regulated";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Heading } from "@/components/ui/Heading";
import { KeyFigures } from "@/components/ui/KeyFigures";
import { Link } from "@/components/ui/Link";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { RelatedLinks } from "@/components/ui/RelatedLinks";
import { Stack } from "@/components/ui/Stack";
import { localePath, type Locale } from "@/lib/i18n/config";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { csvBytes } from "@/lib/open-data/csv";
import { datasetPath, fundsTable } from "@/lib/open-data/datasets";
import { getOpenDataDocuments, getOpenDataFunds } from "@/lib/open-data/read";

export const FUNDS_ROUTE = `${TUSC_PATH}/funds`;
const LIST_FILE = "30";

export async function FundsIndex({ locale, filtered }: { locale: Locale; filtered: boolean }) {
  const [funds, documents] = await Promise.all([getOpenDataFunds(), getOpenDataDocuments()]);
  const n = (value: number) => formatNumber(value, locale);

  const rows: FundListRow[] = funds.map((f) => {
    const kind = fundKind(f.type);
    return kind === "other" ? { number: f.number, kind, type: f.type, code: f.code, name: f.name } : { number: f.number, kind, code: f.code, name: f.name };
  });
  const income = rows.filter((r) => r.kind === "income").length;
  const spendable = rows.filter((r) => r.kind === "spendable").length;
  const byNumber = new Map(documents.map((doc) => [doc.number, doc]));
  const listDoc = byNumber.get(LIST_FILE);
  const updated = listDoc?.updatedAt ?? null;
  const regulated = REGULATED_FUNDS.length;
  const size = formatBytes(csvBytes(fundsTable(funds)), locale);
  const downloadHref = datasetPath("funds");

  const regulatedColumns: DataTableColumn<RegulatedFund>[] = [
    { id: "name", header: UI.odFundsColFund[locale], rowHeader: true, cell: (row) => row.name[locale] },
    { id: "code", header: UI.odFundsColCode[locale], cell: (row) => printedCode(row) },
    { id: "for", header: UI.odFundsColFor[locale], cell: (row) => row.forWhom[locale] },
    { id: "students", header: UI.odFundsColStudents[locale], cell: (row) => row.students?.[locale] ?? UI.odFundsRegNo[locale] },
    {
      id: "regulation",
      header: UI.odFundsColRegulation[locale],
      cell: (row) => {
        const doc = byNumber.get(row.file);
        const text = fillText(UI.odFundsRegLink[locale], { n: row.file, pages: n(doc?.pages ?? 0) });
        return doc ? (
          <Link href={localePath(locale, documentPath(doc.slug))} locale={locale} className="text-action underline">
            {text}
          </Link>
        ) : (
          text
        );
      },
    },
    {
      id: "date",
      header: UI.odFundsColDate[locale],
      cell: (row) => {
        const doc = byNumber.get(row.file);
        return locale === "th" ? (doc?.dateText ?? row.dateEn) : row.dateEn;
      },
    },
  ];

  const listLink = listDoc ? (
    <Link href={localePath(locale, documentPath(listDoc.slug))} locale={locale} className="text-action underline">
      {fillText(UI.odFundsSourceLabel[locale], { n: LIST_FILE })}
    </Link>
  ) : null;

  const h2 = "m-0 mb-[var(--space-3)]";
  return (
    <TuscShell locale={locale} current="funds">
      <PageHead
        label={UI.odOpenData[locale]}
        title={UI.odFundsUniversityTitle[locale]}
        summary={fillText(UI.odFundsSummary[locale], { n: n(rows.length), r: n(regulated) })}
      />
      <MetadataList
        items={[
          { term: UI.odPublishedBy[locale], value: UI.odTuscFull[locale] },
          { term: UI.odLastUpdated[locale], value: updated ? formatDate(updated, locale) : UI.odNotApplicable[locale] },
          {
            term: UI.odSource[locale],
            value: (
              <>
                {listLink}
                {UI.odFundsSourceNote[locale]}
              </>
            ),
          },
          { term: UI.odFundsAmounts[locale], value: UI.odFundsAmountsValue[locale] },
        ]}
      />
      <Stack space={8}>
        <p className="m-0 max-w-[var(--measure-en)] text-lg">{fillText(UI.odFundsIntro[locale], { n: n(rows.length), r: n(regulated) })}</p>

        <section aria-labelledby="od-key">
          <Heading level={2} id="od-key" className={h2}>
            {UI.odKeyFigures[locale]}
          </Heading>
          <KeyFigures
            headingLevel={3}
            items={[
              { label: UI.odFundsKeyAll[locale], figure: n(rows.length), context: UI.odFundsKeyAllContext[locale] },
              { label: UI.odFundsKeyIncome[locale], figure: n(income), context: UI.odFundsKeyIncomeContext[locale] },
              { label: UI.odFundsKeySpend[locale], figure: n(spendable), context: UI.odFundsKeySpendContext[locale] },
            ]}
          />
          <div className="mt-[var(--space-4)] max-w-[var(--measure-en)]">
            <Heading level={3} className="m-0 mb-[var(--space-2)] text-lg">
              {UI.odFundsTypesHeading[locale]}
            </Heading>
            <p className="m-0 mb-[var(--space-2)]">{UI.odFundsIncomeDef[locale]}</p>
            <p className="m-0 mb-[var(--space-2)]">{UI.odFundsSpendDef[locale]}</p>
            <p className="m-0">{UI.odFundsNoAmounts[locale]}</p>
          </div>
        </section>

        <section aria-labelledby="od-regulated">
          <Heading level={2} id="od-regulated" className={h2}>
            {fillText(UI.odFundsRegHeading[locale], { r: n(regulated) })}
          </Heading>
          <p className="m-0 mb-[var(--space-4)] max-w-[var(--measure-en)]">{UI.odFundsRegIntro[locale]}</p>
          <DataTable
            id="regulated-funds"
            columns={regulatedColumns}
            rows={[...REGULATED_FUNDS]}
            getRowKey={(row) => row.file}
            caption={fillText(UI.odFundsRegCaption[locale], { n: n(1), r: n(regulated) })}
            sourceNote={fillText(UI.odFundsRegSource[locale], { r: n(regulated) })}
          />
        </section>

        <section aria-labelledby="od-all">
          <Heading level={2} id="od-all" className={h2}>
            {fillText(UI.odFundsAllHeading[locale], { n: n(rows.length) })}
          </Heading>
          <QueryBoundary
            filtered={filtered}
            fallback={
              <FundsResults locale={locale} route={FUNDS_ROUTE} funds={rows} tableNumber={2} downloadHref={downloadHref} downloadSize={size} query={{}} />
            }
          >
            <LiveFundsResults locale={locale} route={FUNDS_ROUTE} funds={rows} tableNumber={2} downloadHref={downloadHref} downloadSize={size} />
          </QueryBoundary>
        </section>

        <section aria-labelledby="od-help">
          <Heading level={2} id="od-help" className={h2}>
            {UI.odFundsHelpHeading[locale]}
          </Heading>
          <p className="m-0 mb-[var(--space-3)] max-w-[var(--measure-en)]">{UI.odFundsHelpText[locale]}</p>
          <Link href={localePath(locale, "/welfare")} locale={locale} className="inline-flex min-h-[var(--target-min)] items-center text-action underline">
            {UI.odFundsHelpLink[locale]}
          </Link>
        </section>

        <RelatedLinks
          locale={locale}
          headingLevel={2}
          items={[
            {
              label: UI.odAllDocuments[locale],
              href: localePath(locale, `${TUSC_PATH}/documents`),
              description: fillText(UI.odFundsRelatedDocuments[locale], { n: n(documents.length), r: n(regulated) }),
            },
            { label: UI.odNavData[locale], href: localePath(locale, `${TUSC_PATH}/data`), description: UI.odFundsRelatedData[locale] },
          ]}
        />
      </Stack>
    </TuscShell>
  );
}
