import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AUDIT_REPORT_NUMBER,
  BUDGET_PAGE_PATH,
  CANTEEN_COMMITTEE_PATH,
  CANTEEN_REPORT_NUMBER,
  ChapterContents,
  MetadataList,
  PageHead,
  REPORT_DESCRIPTION,
  REPORT_PAGE_NUMBERS,
  Transcript,
  TuscShell,
  addresseeLabel,
  csvPath,
  documentPath,
  documentTitle,
  fillText,
  formatBytes,
  isPdf,
  recommendationsFor,
  reportContents,
  reportDate,
  responseLabel,
  sharedResponse,
  surveyFor,
  urgencyLabel,
} from "@/components/domain/open-data";
import { csvSize } from "@/components/domain/open-data/reports/csv-size";
import { BarChart } from "@/components/ui/BarChart";
import { CiteThis } from "@/components/ui/CiteThis";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Details } from "@/components/ui/Details";
import { DownloadList } from "@/components/ui/DownloadList";
import { Figure } from "@/components/ui/Figure";
import { Heading } from "@/components/ui/Heading";
import { InsetText } from "@/components/ui/InsetText";
import { RelatedLinks, type RelatedLinkItem } from "@/components/ui/RelatedLinks";
import { Stack } from "@/components/ui/Stack";
import { TableOfContents, type TableOfContentsItem } from "@/components/ui/TableOfContents";
import { externalLinkProps, externalLinkSuffix, isExternalUrl } from "@/lib/a11y";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import {
  getOpenDataBodies,
  getOpenDataDocument,
  getOpenDataDocuments,
  getOpenDataRecommendations,
  getOpenDataSurveyResults,
  type RecommendationRow,
  type SurveyResultRow,
} from "@/lib/open-data/read";
import { slugParams } from "@/lib/static-params";

const ANCHORS = { points: "od-rp-points", recs: "od-rp-recs", survey: "od-rp-survey", full: "od-rp-full", data: "od-rp-data" } as const;

export async function generateStaticParams() {
  const documents = await getOpenDataDocuments();
  return slugParams(documents.filter((doc) => REPORT_PAGE_NUMBERS.includes(doc.number)).map((doc) => doc.slug));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const doc = await getOpenDataDocument(slug);
  if (!doc || !REPORT_PAGE_NUMBERS.includes(doc.number)) return {};
  return {
    alternates: alternatesFor(locale, `/about/open-data/tusc/reports/${slug}`),
    title: documentTitle(doc, locale),
    description: (doc.number === CANTEEN_REPORT_NUMBER ? UI.odRpSummary47 : REPORT_DESCRIPTION[doc.number])?.[locale],
  };
}

/** "pigeons with 120, cutlery 40 and other 2" for English, "นกพิราบ 120 ช้อนส้อม 40 และอื่น ๆ 2" for Thai. */
function chartRest(rows: readonly SurveyResultRow[], locale: Locale): string {
  const named = rows.map((row) => ({ name: locale === "th" ? row.problemTh : row.problemEn.toLowerCase(), n: formatNumber(row.mentions, locale) }));
  if (locale === "th") {
    const parts = named.map((item) => `${item.name} ${item.n}`);
    return parts.length > 1 ? `${parts.slice(0, -1).join(" ")} และ${parts[parts.length - 1]}` : (parts[0] ?? "");
  }
  const parts = named.map((item, index) => (index === 0 ? `${item.name} with ${item.n}` : `${item.name} ${item.n}`));
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : (parts[0] ?? "");
}

const problemName = (row: SurveyResultRow, locale: Locale) => (locale === "th" ? row.problemTh : row.problemEn);

export default async function TuscReportPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const [doc, bodies, recommendationRows, surveyRows] = await Promise.all([
    getOpenDataDocument(slug),
    getOpenDataBodies(),
    getOpenDataRecommendations(),
    getOpenDataSurveyResults(),
  ]);
  if (!doc || !REPORT_PAGE_NUMBERS.includes(doc.number)) notFound();

  const isCanteen = doc.number === CANTEEN_REPORT_NUMBER;
  const recommendations: RecommendationRow[] = recommendationsFor(recommendationRows, doc.slug);
  const survey = surveyFor(surveyRows, doc.slug);
  const hasRecommendations = isCanteen && recommendations.length > 0;
  const hasSurvey = isCanteen && survey.length > 0;
  const contents = reportContents(doc.transcriptMarkdown, isCanteen ? 2 : 1);
  const hasText = doc.transcriptMarkdown.trim() !== "";
  const n = (value: number) => formatNumber(value, locale);

  const committee = isCanteen ? bodies.find((body) => body.slug === "canteen-ad-hoc-committee") : undefined;
  const subCommittee = isCanteen ? bodies.find((body) => body.slug === "canteen-sub-committee") : undefined;
  const original = doc.fileUrl ?? doc.driveUrl;
  const external = isExternalUrl(original);
  const originalDetails = [
    isPdf(doc) ? "PDF" : "",
    doc.fileUrl ? formatBytes(doc.fileBytes, locale) : "",
    doc.pages === null ? "" : fillText(UI.odPagesCount[locale], { n: n(doc.pages) }),
  ].filter(Boolean);
  const responseText = hasRecommendations ? responseLabel(sharedResponse(recommendations), locale) : UI.odRpNoResponse[locale];
  const issuer = (locale === "th" ? doc.issuerTh : doc.issuerEn) ?? doc.issuerTh ?? doc.issuerEn ?? UI.odNotStated[locale];

  const meta = [
    {
      term: UI.odPublishedBy[locale],
      value: committee ? (
        <>
          {issuer} (
          <Link href={localePath(locale, CANTEEN_COMMITTEE_PATH)} className="text-action underline">
            {UI.odRpCommitteePage[locale]}
          </Link>
          )
        </>
      ) : (
        issuer
      ),
    },
    { term: UI.odRpMetaDate[locale], value: reportDate(doc, locale) },
    ...(committee?.appointedOn
      ? [
          {
            term: UI.odRpMetaAppointed[locale],
            value: subCommittee?.appointedOn
              ? fillText(UI.odRpAppointedWithSub[locale], { date: formatDate(committee.appointedOn, locale), sub: formatDate(subCommittee.appointedOn, locale) })
              : formatDate(committee.appointedOn, locale),
          },
        ]
      : []),
    {
      term: UI.odMetaOriginalFile[locale],
      value: (
        <a href={original} {...externalLinkProps(external)} className="text-action underline">
          {originalDetails.join(", ")}
          {external ? <span className="visually-hidden">{externalLinkSuffix(locale, true)}</span> : null}
        </a>
      ),
    },
    { term: UI.odRpMetaStatus[locale], value: responseText },
    { term: UI.odLastUpdated[locale], value: formatDate(doc.updatedAt, locale) },
  ];

  const points: string[] = [];
  if (committee?.appointedOn && subCommittee?.appointedOn && committee.membersAsAppointed !== null && subCommittee.membersAsAppointed !== null) {
    points.push(
      fillText(UI.odRpPointAppointed[locale], {
        members: n(committee.membersAsAppointed),
        date: formatDate(committee.appointedOn, locale),
        subMembers: n(subCommittee.membersAsAppointed),
        subDate: formatDate(subCommittee.appointedOn, locale),
      }),
    );
  }
  if (isCanteen) points.push(UI.odRpPointProblems[locale]);
  if (hasRecommendations) points.push(fillText(UI.odRpPointRecs[locale], { n: n(recommendations.length) }));
  const [first, second] = survey;
  if (hasSurvey && first && second) {
    points.push(
      fillText(UI.odRpPointSurvey[locale], {
        first: locale === "th" ? first.problemTh : first.problemEn.toLowerCase(),
        firstN: n(first.mentions),
        second: locale === "th" ? second.problemTh : second.problemEn.toLowerCase(),
        secondN: n(second.mentions),
      }),
    );
  }
  if (isCanteen) {
    points.push(UI.odRpPointPigeon[locale]);
    points.push(UI.odRpPointDate[locale]);
  }

  const recommendationColumns: DataTableColumn<RecommendationRow & { no: number }>[] = [
    { id: "no", header: UI.odRpColNo[locale], rowHeader: true, cell: (row) => n(row.no) },
    { id: "section", header: UI.odRpColSection[locale], cell: (row) => row.section },
    { id: "text", header: UI.odRpColRecommendation[locale], cell: (row) => (locale === "th" ? row.textTh : row.textEn) },
    { id: "to", header: UI.odRpColAddressedTo[locale], cell: (row) => addresseeLabel(row.addressedTo, locale) },
    { id: "urgency", header: UI.odRpColUrgency[locale], cell: (row) => urgencyLabel(row.urgency, locale) },
    { id: "status", header: UI.odRpColStatus[locale], cell: (row) => responseLabel(row.responseStatus, locale) },
  ];

  const surveyColumns: DataTableColumn<SurveyResultRow>[] = [
    { id: "problem", header: UI.odRpColProblem[locale], rowHeader: true, cell: (row) => problemName(row, locale) },
    { id: "mentions", header: UI.odRpColMentions[locale], align: "end", cell: (row) => n(row.mentions) },
  ];

  const recsTable = 1;
  const surveyTable = hasRecommendations ? 2 : 1;
  const figureTitle = first ? fillText(UI.odRpFigTitle[locale], { problem: problemName(first, locale) }) : "";
  const csvRecs = { label: UI.odRpDataRecs[locale], href: csvPath("recommendations"), format: "CSV", size: csvSize("canteen-recommendations.csv", locale) };
  const csvSurvey = { label: UI.odRpDataSurvey[locale], href: csvPath("canteen-survey"), format: "CSV", size: csvSize("canteen-survey.csv", locale) };

  const toc: TableOfContentsItem[] = [
    ...(points.length > 0 ? [{ label: UI.odRpMainPoints[locale], href: `#${ANCHORS.points}` }] : []),
    ...(hasRecommendations ? [{ label: UI.odRpRecsHeading[locale], href: `#${ANCHORS.recs}` }] : []),
    ...(hasSurvey ? [{ label: UI.odRpSurveyHeading[locale], href: `#${ANCHORS.survey}` }] : []),
    ...(hasText ? [{ label: UI.odRpFullHeading[locale], href: `#${ANCHORS.full}` }] : []),
    ...(hasRecommendations ? [{ label: UI.odRpDataHeading[locale], href: `#${ANCHORS.data}` }] : []),
  ];

  const related: RelatedLinkItem[] = [
    isCanteen
      ? { label: UI.odRpRelCommittee[locale], href: localePath(locale, CANTEEN_COMMITTEE_PATH), description: UI.odRpRelCommitteeDesc[locale] }
      : { label: UI.odRpRelAuditCommittee[locale], href: localePath(locale, "/about/open-data/tusc/committees/budget-monitoring-committee") },
    ...(isCanteen ? [{ label: UI.odRpRelEat[locale], href: localePath(locale, "/eat"), description: UI.odRpRelEatDesc[locale] }] : []),
    ...(doc.number === AUDIT_REPORT_NUMBER ? [{ label: UI.odRpRelBudget[locale], href: localePath(locale, BUDGET_PAGE_PATH), description: UI.odRpRelBudgetDesc[locale] }] : []),
    { label: UI.odRpRelAll[locale], href: localePath(locale, "/about/open-data/tusc/reports"), description: UI.odRpRelAllDesc[locale] },
    ...(isCanteen ? [{ label: UI.odRpRelData[locale], href: localePath(locale, "/about/open-data/tusc/data"), description: UI.odRpRelDataDesc[locale] }] : []),
  ];

  return (
    <TuscShell locale={locale} current="reports" trail={[{ label: fillText(UI.odFileNumber[locale], { n: doc.number }) }]}>
      <PageHead
        label={UI.odRpLabel[locale]}
        title={documentTitle(doc, locale)}
        summary={(isCanteen ? UI.odRpSummary47 : REPORT_DESCRIPTION[doc.number])?.[locale]}
      />
      <MetadataList items={meta} />
      <Stack space={8}>
        <InsetText>
          <p className="m-0 font-bold">{UI.odRpLangHeading[locale]}</p>
          <p className="m-0 max-w-[var(--measure-en)]">{(isCanteen ? UI.odRpLangNote : UI.odRpLangNoteShort)[locale]}</p>
        </InsetText>

        {toc.length > 1 ? <TableOfContents items={toc} locale={locale} headingLevel={2} id="od-rp-toc" title={UI.odRlOnThisPage[locale]} /> : null}

        {points.length > 0 ? (
          <section aria-labelledby={ANCHORS.points}>
            <Heading level={2} id={ANCHORS.points} className="m-0 mb-[var(--space-3)]">
              {UI.odRpMainPoints[locale]}
            </Heading>
            <ul className="m-0 flex max-w-[var(--measure-en)] list-disc flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
              {points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {hasRecommendations ? (
          <section aria-labelledby={ANCHORS.recs}>
            <Heading level={2} id={ANCHORS.recs} className="m-0 mb-[var(--space-2)]">
              {UI.odRpRecsHeading[locale]}
            </Heading>
            <p className="m-0 mb-[var(--space-3)] max-w-[var(--measure-en)] text-ink-900">{UI.odRpRecsIntro[locale]}</p>
            <Stack space={3}>
              <DataTable
                columns={recommendationColumns}
                rows={recommendations.map((row, index) => ({ ...row, no: index + 1 }))}
                getRowKey={(row) => row.id}
                caption={fillText(UI.odRpRecsCaption[locale], { table: n(recsTable), n: n(recommendations.length) })}
              />
              <Details summary={fillText(UI.odDownloadData[locale], { label: `${UI.odTable[locale]} ${n(recsTable)}` })}>
                <DownloadList items={[csvRecs]} />
              </Details>
            </Stack>
          </section>
        ) : null}

        {hasSurvey && first ? (
          <section aria-labelledby={ANCHORS.survey}>
            <Heading level={2} id={ANCHORS.survey} className="m-0 mb-[var(--space-3)]">
              {UI.odRpSurveyHeading[locale]}
            </Heading>
            <Figure
              id="od-rp-figure"
              locale={locale}
              number={1}
              title={figureTitle}
              subtitle={UI.odRpFigSubtitle[locale]}
              headingLevel={3}
              source={
                <>
                  <Link href={localePath(locale, documentPath(doc.slug))} className="text-action underline">
                    {documentTitle(doc, locale)}
                  </Link>
                  {UI.odRpFigSourceAfter[locale]}
                </>
              }
              footnotes={[UI.odRpFigNote1[locale]]}
              downloads={[{ ...csvSurvey, label: fillText(UI.odRpFigDataLabel[locale], { n: n(1) }) }]}
            >
              <BarChart
                data={survey.map((row, index) => ({ label: problemName(row, locale), value: row.mentions, highlight: index === 0 }))}
                title={figureTitle}
                description={fillText(UI.odRpFigDescription[locale], {
                  top: locale === "th" ? first.problemTh : first.problemEn.toLowerCase(),
                  n: n(first.mentions),
                  rest: chartRest(survey.slice(1), locale),
                })}
                locale={locale}
                unit={UI.odRpUnitMentions[locale]}
              />
              <DataTable
                columns={surveyColumns}
                rows={survey}
                getRowKey={(row) => row.problemEn}
                caption={fillText(UI.odRpSurveyCaption[locale], { table: n(surveyTable) })}
              />
            </Figure>
          </section>
        ) : null}

        {hasText ? (
          <section aria-labelledby={ANCHORS.full}>
            <Heading level={2} id={ANCHORS.full} className="m-0 mb-[var(--space-2)]">
              {UI.odRpFullHeading[locale]}
            </Heading>
            <p className="m-0 mb-[var(--space-5)] max-w-[var(--measure-en)] text-ink-900">{UI.odRpFullIntro[locale]}</p>
            <Stack space={6}>
              {contents.entries.length > 1 ? (
                <ChapterContents contents={contents} locale={locale} headingLevel={3} id="od-rp-contents" title={UI.odRpContentsTitle[locale]} />
              ) : null}
              <Transcript markdown={contents.markdown} locale={locale} headingLevel={3} />
            </Stack>
          </section>
        ) : null}

        {hasRecommendations ? (
          <section aria-labelledby={ANCHORS.data}>
            <Heading level={2} id={ANCHORS.data} className="m-0 mb-[var(--space-3)]">
              {UI.odRpDataHeading[locale]}
            </Heading>
            <DownloadList items={[csvSurvey, csvRecs]} />
            <p className="m-0">
              <Link href={localePath(locale, documentPath(doc.slug))} className="inline-flex min-h-[var(--target-min)] items-center text-action underline">
                {UI.odRpDataPdf[locale]}
              </Link>
            </p>
          </section>
        ) : null}

        <RelatedLinks locale={locale} headingLevel={2} id="od-rp-related" items={related} />

        <CiteThis locale={locale} headingLevel={2} title={UI.odRpCiteTitle[locale]}>
          {fillText(UI.odRpCiteBody[locale], {
            issuer,
            title: documentTitle(doc, locale),
            date: reportDate(doc, locale),
            updated: formatDate(doc.updatedAt, locale),
          })}
        </CiteThis>
      </Stack>
    </TuscShell>
  );
}
