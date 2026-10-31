import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MetadataList,
  PageHead,
  RULE_DESCRIPTION,
  RULE_GROUPS,
  ROOT_RULE_NUMBER,
  TuscShell,
  documentTitle,
  fillText,
  rulePath,
  ruleDate,
  ruleStatus,
  ruleStatusLabel,
  rulesInOrder,
} from "@/components/domain/open-data";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Heading } from "@/components/ui/Heading";
import { Stack } from "@/components/ui/Stack";
import { StatusTag } from "@/components/ui/StatusTag";
import { DEFAULT_LOCALE, LOCALES, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getOpenDataDocuments, type DocumentSummary } from "@/lib/open-data/read";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/about/open-data/tusc/rules"),
    title: UI.odRlTitle[locale],
    description: UI.odNavRulesDesc[locale],
  };
}

function countLabel(count: number, locale: Locale): string {
  if (count === 1) return UI.odRlDocumentOne[locale];
  return fillText(UI.odRlDocumentMany[locale], { n: formatNumber(count, locale) });
}

export default async function TuscRulesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const documents = await getOpenDataDocuments();
  const rules = rulesInOrder(documents);
  const byNumber = new Map(rules.map((doc) => [doc.number, doc]));
  const updated = rules.reduce<string | null>((latest, doc) => (latest === null || doc.updatedAt > latest ? doc.updatedAt : latest), null);
  const anyReplaced = rules.some((doc) => ruleStatus(doc) === "replaced");

  const columns: DataTableColumn<DocumentSummary>[] = [
    {
      id: "title",
      header: UI.odRlColTitle[locale],
      rowHeader: true,
      cell: (doc) => (
        <>
          <Link href={localePath(locale, rulePath(doc.slug))} className="text-action underline">
            {documentTitle(doc, locale)}
          </Link>
          <span className="mt-[var(--space-1)] block text-sm font-normal text-ink-600">{RULE_DESCRIPTION[doc.number]?.[locale]}</span>
          {doc.scan ? <span className="block text-sm font-normal text-ink-600">{UI.odRlScanOnly[locale]}</span> : null}
        </>
      ),
    },
    {
      id: "issuer",
      header: UI.odMetaIssuedBy[locale],
      cell: (doc) => (
        <>
          {(locale === "th" ? doc.issuerTh : doc.issuerEn) ?? doc.issuerTh ?? doc.issuerEn ?? UI.odNotStated[locale]}
          {doc.signatory ? (
            <span lang="th" className="block text-sm text-ink-600">
              {doc.signatory}
            </span>
          ) : null}
        </>
      ),
    },
    { id: "date", header: UI.odMetaDate[locale], cell: (doc) => ruleDate(doc, locale) },
    {
      id: "status",
      header: UI.odRlColStatus[locale],
      cell: (doc) => <StatusTag tone={ruleStatus(doc) === "replaced" ? "neutral" : "success"} label={ruleStatusLabel(ruleStatus(doc))[locale]} />,
    },
  ];

  const groups = RULE_GROUPS.map((group, index) => ({
    group,
    id: `od-rules-${group.key}`,
    docs: group.numbers.flatMap((number) => byNumber.get(number) ?? []),
    table: index + 1,
  })).filter((entry) => entry.docs.length > 0);

  const root = byNumber.get(ROOT_RULE_NUMBER);
  const [fitBefore = "", fitAfter = ""] = UI.odRlFit2[locale].split("{link}");

  return (
    <TuscShell locale={locale} current="rules">
      <PageHead label={UI.odOpenData[locale]} title={UI.odRlTitle[locale]} summary={fillText(UI.odRlSummary[locale], { n: formatNumber(rules.length, locale) })} />
      <MetadataList
        items={[
          { term: UI.odPublishedBy[locale], value: UI.odTuscFull[locale] },
          { term: UI.odLastUpdated[locale], value: updated ? formatDate(updated, locale) : UI.odNotApplicable[locale] },
          { term: UI.odRlSourceFilesTerm[locale], value: UI.odRlSourceFiles[locale] },
        ]}
      />
      <Stack space={8}>
        <section aria-labelledby="od-rules-how">
          <Heading level={2} id="od-rules-how" className="m-0 mb-[var(--space-3)]">
            {UI.odRlHowToRead[locale]}
          </Heading>
          <MetadataList
            className="mb-[var(--space-3)] max-w-[var(--measure-en)]"
            items={[
              {
                term: <StatusTag tone="success" label={UI.odRlStatusInForce[locale]} />,
                value: UI.odRlStatusInForceDesc[locale],
              },
              {
                term: <StatusTag tone="neutral" label={UI.odRlStatusReplaced[locale]} />,
                value: anyReplaced ? UI.odRlStatusReplacedDesc[locale] : `${UI.odRlStatusReplacedDesc[locale]} ${UI.odRlStatusNoneReplaced[locale]}`,
              },
            ]}
          />
        </section>

        {groups.map(({ group, id, docs, table }) => (
          <section key={group.key} aria-labelledby={id}>
            <Heading level={2} id={id} className="m-0 mb-[var(--space-3)]">
              {group.title[locale]}
            </Heading>
            <DataTable
              columns={columns}
              rows={docs}
              getRowKey={(doc) => doc.id}
              caption={fillText(UI.odRlTableCaption[locale], {
                n: formatNumber(table, locale),
                group: group.title[locale],
                count: countLabel(docs.length, locale),
              })}
            />
          </section>
        ))}

        <section aria-labelledby="od-rules-fit">
          <Heading level={2} id="od-rules-fit" className="m-0 mb-[var(--space-3)]">
            {UI.odRlFitHeading[locale]}
          </Heading>
          <ol className="m-0 flex max-w-[var(--measure-en)] list-decimal flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
            <li>{UI.odRlFit1[locale]}</li>
            <li>
              {fitBefore}
              {root ? (
                <Link href={localePath(locale, rulePath(root.slug))} className="text-action underline">
                  {UI.odRlFit2Link[locale]}
                </Link>
              ) : (
                UI.odRlFit2Link[locale]
              )}
              {fitAfter}
            </li>
            <li>{UI.odRlFit3[locale]}</li>
            <li>{UI.odRlFit4[locale]}</li>
            <li>{UI.odRlFit5[locale]}</li>
          </ol>
        </section>
      </Stack>
    </TuscShell>
  );
}
