import type { ReactNode } from "react";
import { BarChart } from "@/components/ui/BarChart";
import { CiteThis } from "@/components/ui/CiteThis";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Heading } from "@/components/ui/Heading";
import { KeyFigures } from "@/components/ui/KeyFigures";
import { Link } from "@/components/ui/Link";
import { RelatedLinks } from "@/components/ui/RelatedLinks";
import { Stack } from "@/components/ui/Stack";
import { TableOfContents } from "@/components/ui/TableOfContents";
import type { DownloadItem } from "@/components/ui/DownloadList";
import { localePath, type Locale } from "@/lib/i18n/config";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { csvBytes, type CsvTable } from "@/lib/open-data/csv";
import type { BudgetLineRow, DocumentSummary } from "@/lib/open-data/read";
import { MetadataList } from "../MetadataList";
import { PageHead } from "../PageHead";
import { fillText } from "../fill";
import { formatBytes, documentTitle } from "../documents";
import { formatMoneyAmount } from "../money";
import { TUSC_PATH, documentPath } from "../sections";
import { fiscalYearLabel } from "../years";
import { FigureBlock } from "./FigureBlock";
import { Txt } from "./Txt";
import { groupLabel, itemLabel, orgLabel, organisationTypeLabel, type OrgDef } from "./labels";
import {
  bodyTables,
  campusCategories,
  compareYears,
  organisationLines,
  organisationsByAmount,
  unionProjects,
  type BodyTable,
  type CategoryLine,
  type OrgLine,
  type ProjectLine,
} from "./model";
import {
  CATEGORY_PAGE,
  COMPARISON_PAGE,
  PRINTED_BODY,
  PRINTED_CATEGORY_TOTAL_SHARE,
  PRINTED_TOTAL,
  REPORT_FILE,
  UNION_SHARE,
} from "./printed";

export const RELEASE_DATE = "2026-03-19";
export const MEETING_ITEM = "4.1";

interface BulletinProps {
  locale: Locale;
  year: number;
  lines: readonly BudgetLineRow[];
  documents: readonly DocumentSummary[];
  /** The slug of the meeting that received the report, when the meetings are published. */
  meetingSlug: string | null;
  files: Record<string, CsvTable>;
  updated: string | null;
  datasetRows: number;
}

const FIGURE_FILES = ["figure-1.csv", "figure-2.csv", "figure-3.csv", "figure-4.csv"] as const;

function shortName(label: string, locale: Locale): string {
  return locale === "en" ? label.replace(/\s*\(.*\)$/, "").replace(/^./, (c) => c.toLowerCase()) : label;
}

export function Bulletin({ locale, year, lines, documents, meetingSlug, files, updated, datasetRows }: BulletinProps) {
  const previous = year - 1;
  const money = (value: string | number) => formatMoneyAmount(value, locale);
  const n = (value: number) => formatNumber(value, locale);
  const fy = fiscalYearLabel(year, locale);
  const fyPrev = fiscalYearLabel(previous, locale);
  const total = PRINTED_TOTAL[year]?.amount ?? "";
  const totalPrev = PRINTED_TOTAL[previous]?.amount ?? "";
  const pageWord = (page: number | null) => (page === null ? "" : fillText(UI.odBudPage[locale], { page: n(page) }));

  const report = documents.find((doc) => doc.number === REPORT_FILE);
  const reportTitle = report ? documentTitle(report, locale) : "";
  const reportHref = report ? localePath(locale, documentPath(report.slug)) : null;
  const source = (page: number | null): ReactNode =>
    reportHref ? (
      <>
        <Link href={reportHref} locale={locale} className="text-action underline">
          {reportTitle}
        </Link>
        , {pageWord(page)}
      </>
    ) : (
      pageWord(page)
    );

  const orgs = organisationsByAmount(lines, year);
  const orgsPrev = organisationLines(lines, previous);
  const categories = campusCategories(lines, year);
  const comparison = compareYears(lines, year, previous);
  const projects = unionProjects(lines, year);
  const bodies = bodyTables(lines, year);
  const union = orgs.find((o) => o.org?.key === "tusu");
  const unionPrev = orgsPrev.find((o) => o.org?.key === "tusu");
  const topCategory = categories[0];
  const secondCategory = categories[1];
  const topProject = projects[0];
  const secondProject = projects[1];

  const download = (index: number): DownloadItem => {
    const file = FIGURE_FILES[index] ?? FIGURE_FILES[0];
    const table = files[file];
    return {
      label: fillText(UI.odBudFigureData[locale], { n: n(index + 1) }),
      href: `${TUSC_PATH}/budget/${year}/${file}`,
      format: UI.odBudCsvFormat[locale],
      size: table ? formatBytes(csvBytes(table), locale) : "",
    };
  };

  const label = (org: { org: OrgDef | null; organisation: string }) => orgLabel(org.org, org.organisation, locale);
  const cat = (item: CategoryLine) => itemLabel(item.item, locale);
  const caption = (key: "odBudCaptionProjects" | "odBudCaptionCategories" | "odBudCaptionSingle", number: number, body: string) =>
    fillText(UI[key][locale], { n: n(number), body, fy });

  const NA = UI.odNotStated[locale];
  const amountCol = (header: string = UI.odBudColAmount[locale]) => ({ id: "amount", header, align: "end" as const });


  const orgColumns: DataTableColumn<(typeof orgs)[number]>[] = [
    { id: "organisation", header: UI.odBudColOrganisation[locale], rowHeader: true, cell: (row) => <Txt text={label(row)} locale={locale} /> },
    { id: "type", header: UI.odBudColType[locale], cell: (row) => organisationTypeLabel(row.organisationType, locale) },
    { ...amountCol(), cell: (row) => money(row.amount) },
  ];
  const [table1, table2, table3, table4] = [1, 2, 3, 4];

  const catColumns: DataTableColumn<CategoryLine>[] = [
    { id: "item", header: UI.odBudColCategory[locale], rowHeader: true, cell: (row) => <Txt text={cat(row)} locale={locale} /> },
    { id: "group", header: UI.odBudColGroup[locale], cell: (row) => groupLabel(row.group, locale) },
    { ...amountCol(), cell: (row) => money(row.amount) },
    { id: "share", header: UI.odBudColShare[locale], align: "end", cell: (row) => row.share ?? NA },
  ];

  const compareColumns: DataTableColumn<(typeof comparison)[number]>[] = [
    { id: "organisation", header: UI.odBudColOrganisation[locale], rowHeader: true, cell: (row) => <Txt text={orgLabel(row.org, (row.current ?? row.previous)?.organisation ?? row.organisation, locale)} locale={locale} /> },
    { id: "previous", header: fillText(UI.odBudColYearAmount[locale], { year: previous }), align: "end", cell: (row) => (row.previous ? money(row.previous.amount) : UI.odBudNotListed[locale]) },
    { id: "current", header: fillText(UI.odBudColYearAmount[locale], { year }), align: "end", cell: (row) => (row.current ? money(row.current.amount) : UI.odBudNotListed[locale]) },
  ];

  const projectColumns: DataTableColumn<ProjectLine>[] = [
    { id: "project", header: UI.odBudColProject[locale], rowHeader: true, cell: (row) => <Txt text={row.project} locale={locale} /> },
    { ...amountCol(), cell: (row) => money(row.amount) },
  ];
  const unionProjectColumns: DataTableColumn<ProjectLine>[] = [
    ...projectColumns,
    { id: "share", header: UI.odBudColShareUnion[locale], align: "end", cell: (row) => row.share ?? NA },
  ];
  const bodyCategoryColumns: DataTableColumn<CategoryLine>[] = [
    { id: "item", header: UI.odBudColItem[locale], rowHeader: true, cell: (row) => <Txt text={cat(row)} locale={locale} /> },
    { id: "group", header: UI.odBudColGroup[locale], cell: (row) => groupLabel(row.group, locale) },
    { ...amountCol(), cell: (row) => money(row.amount) },
  ];

  const singleColumns = (bodyName: string): DataTableColumn<OrgLine>[] => [
    { id: "item", header: UI.odBudColItem[locale], rowHeader: true, cell: () => <Txt text={bodyName} locale={locale} /> },
    { id: "projects", header: UI.odBudColProjects[locale], cell: () => NA },
    { id: "categories", header: UI.odBudColCategories[locale], cell: () => NA },
    { ...amountCol(), cell: (row) => money(row.amount) },
  ];

  const releaseText = formatDate(RELEASE_DATE, locale);
  const title = fillText(UI.odBudBulletinTitle[locale], { year, ce: year - 543 });
  const toc = [
    { label: UI.odKeyFigures[locale], href: "#key" },
    { label: UI.odMainPoints[locale], href: "#points" },
    { label: UI.odBudSecUse[locale], href: "#use" },
    { label: UI.odBudSecOrg[locale], href: "#s-org" },
    { label: UI.odBudSecCat[locale], href: "#s-cat" },
    { label: fillText(UI.odBudSecYears[locale], { prev: previous, year }), href: "#s-change" },
    { label: UI.odBudSecSu[locale], href: "#s-su" },
    { label: UI.odBudSecTables[locale], href: "#s-tables" },
    { label: UI.odBudSecQuality[locale], href: "#quality" },
    { label: UI.odBudSecGlossary[locale], href: "#glossary" },
    { label: UI.odRelated[locale], href: "#related" },
    { label: UI.odCiteThis[locale], href: "#cite" },
  ];

  const shareStated = UNION_SHARE;
  const keyFigures = [
    { label: UI.odBudKeyTotal[locale], figure: money(total), context: fillText(UI.odBudKeyTotalContext[locale], { fy }) },
    { label: fillText(UI.odBudKeyPrev[locale], { fy: fyPrev }), figure: money(totalPrev), context: UI.odBudKeyPrevContext[locale] },
    {
      label: UI.odBudKeyShare[locale],
      figure: `${shareStated}%`,
      context: fillText(UI.odBudKeyShareContext[locale], { fy, amount: union ? money(union.amount) : "" }),
    },
  ] as const;

  const points: string[] = [
    fillText(UI.odBudPointTotal[locale], { fy, total: money(total), prev: money(totalPrev), prevFy: fyPrev }),
  ];
  if (union && unionPrev && topCategory) {
    points.push(
      fillText(UI.odBudPointUnion[locale], {
        amount: money(union.amount),
        share: shareStated,
        prev: money(unionPrev.amount),
        prevFy: fyPrev,
        category: shortName(cat(topCategory), locale),
        categoryAmount: money(topCategory.amount),
        categoryShare: topCategory.share ?? NA,
      }),
    );
  }
  points.push(fillText(UI.odBudPointLists[locale], { fy, n: n(orgs.length), prevFy: fyPrev, m: n(orgsPrev.length) }));
  if (meetingSlug) points.push(fillText(UI.odBudPointMinutes[locale], { date: releaseText }));

  const uses = [UI.odBudUse1, UI.odBudUse2, UI.odBudUse3, UI.odBudUse4, UI.odBudUse5].map((s) => fillText(s[locale], { fy, prevFy: fyPrev }));

  const numbered = bodies.reduce<{ body: BodyTable; projects: number | null; categories: number | null; single: number | null }[]>((acc, body) => {
    const used = acc.reduce((sum, entry) => sum + [entry.projects, entry.categories, entry.single].filter((v) => v !== null).length, 0);
    const hasProjects = body.projects !== null && body.key !== "tusu" && PRINTED_BODY[body.key] !== undefined;
    const hasCategories = body.categories !== null && PRINTED_BODY[body.key] !== undefined;
    const hasSingle = body.projects === null && body.categories === null && body.line !== null;
    const first = table4 + 1 + used;
    const projects = hasProjects ? first : null;
    const categories = hasCategories ? first + (hasProjects ? 1 : 0) : null;
    const single = hasSingle ? first : null;
    return [...acc, { body, projects, categories, single }];
  }, []);

  const compared = comparison.filter((row) => row.previous && row.current);
  const bodyHeading = (body: BodyTable) => {
    const printed = PRINTED_BODY[body.key];
    if (!body.projects || !printed) return null;
    const count = body.projects.length;
    const key = body.key === "tusu" ? "odBudBodyCategoryOnly" : count === 1 ? "odBudBodyOne" : "odBudBodyMany";
    return fillText(UI[key][locale], { n: n(count), total: money(printed.total), page: n(printed.page) });
  };

  const glossary: [string, string][] = [
    [fillText(UI.odBudGlFy[locale], { year }), fillText(UI.odBudGlFyDef[locale], { year, ce: year - 543 })],
    [UI.odBudGlTusc[locale], UI.odBudGlTuscDef[locale]],
    [UI.odBudGlTusu[locale], UI.odBudGlTusuDef[locale]],
    [UI.odBudGlClub[locale], UI.odBudGlClubDef[locale]],
    [UI.odBudGlGroup[locale], UI.odBudGlGroupDef[locale]],
    [UI.odBudGlDivision[locale], UI.odBudGlDivisionDef[locale]],
    [UI.odBudGlComp[locale], UI.odBudGlCompDef[locale]],
    [UI.odBudGlRun[locale], UI.odBudGlRunDef[locale]],
    [UI.odBudGlDurable[locale], UI.odBudGlDurableDef[locale]],
    [UI.odBudGlNotListed[locale], UI.odBudGlNotListedDef[locale]],
    [UI.odBudGlNotStated[locale], UI.odBudGlNotStatedDef[locale]],
  ];

  const datasetSentence = fillText(UI.odBudSourceDataset[locale], { n: n(datasetRows) }).split("{link}");
  const h2 = "m-0 mb-[var(--space-3)]";

  return (
    <>
      <PageHead label={`${UI.odOpenData[locale]} · ${UI.odNavBudget[locale]}`} title={title} summary={fillText(UI.odBudSummary[locale], { fy, total: money(total), share: shareStated })} />
      <MetadataList
        items={[
          { term: UI.odPublishedBy[locale], value: UI.odBudPublishedByValue[locale] },
          { term: UI.odBudReleaseDate[locale], value: fillText(UI.odBudReleaseDateValue[locale], { date: releaseText }) },
          { term: UI.odLastUpdated[locale], value: updated ? formatDate(updated, locale) : UI.odNotApplicable[locale] },
          { term: UI.odNextUpdate[locale], value: UI.odToBeAnnounced[locale] },
          { term: UI.odBudPeriod[locale], value: fillText(UI.odBudPeriodValue[locale], { fy }) },
          { term: UI.odContact[locale], value: UI.odTuscContact[locale] },
        ]}
      />
      <Stack space={8}>
        <TableOfContents locale={locale} headingLevel={2} title={UI.odBudOnThisPage[locale]} items={toc} />

        <section aria-labelledby="key">
          <Heading level={2} id="key" className={h2}>
            {UI.odKeyFigures[locale]}
          </Heading>
          <KeyFigures items={keyFigures} headingLevel={3} />
        </section>

        <section aria-labelledby="points">
          <Heading level={2} id="points" className={h2}>
            {UI.odMainPoints[locale]}
          </Heading>
          <ul className="m-0 flex max-w-[var(--measure-en)] list-disc flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
            {points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="use">
          <Heading level={2} id="use" className={h2}>
            {UI.odBudSecUse[locale]}
          </Heading>
          <Heading level={3} className="m-0 mb-[var(--space-2)] text-lg">
            {UI.odBudUseHeading[locale]}
          </Heading>
          <ul className="m-0 flex max-w-[var(--measure-en)] list-disc flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
            {uses.map((use) => (
              <li key={use}>{use}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="s-org">
          <Heading level={2} id="s-org" className={h2}>
            {UI.odBudSecOrg[locale]}
          </Heading>
          <FigureBlock
            id="fig-1"
            locale={locale}
            number={1}
            headingLevel={3}
            title={fillText(UI.odBudFig1Title[locale], { share: shareStated, fy })}
            subtitle={fillText(UI.odBudFig1Subtitle[locale], { fy })}
            source={source(orgs[0]?.page ?? null)}
            footnotes={[UI.odBudNoteSorted[locale]]}
            chart={
              <BarChart
                data={orgs.map((o, index) => ({ label: label(o), value: Number(o.amount), highlight: index === 0 }))}
                title={fillText(UI.odBudFig1Subtitle[locale], { fy })}
                description={fillText(UI.odBudFig1Alt[locale], {
                  share: shareStated,
                  fy,
                  second: orgs[1] ? label(orgs[1]) : "",
                  secondAmount: orgs[1] ? money(orgs[1].amount) : "",
                  third: orgs[2] ? label(orgs[2]) : "",
                  thirdAmount: orgs[2] ? money(orgs[2].amount) : "",
                })}
                locale={locale}
                unit={UI.odMoneyUnit[locale]}
                formatValue={money}
              />
            }
            table={
              <DataTable
                id="table-1"
                columns={orgColumns}
                rows={orgs}
                getRowKey={(row) => row.organisation}
                caption={fillText(UI.odBudTableOrgYear[locale], { n: n(table1), year })}
                footerRows={[{ key: "total", cells: { organisation: UI.odBudTotal[locale], amount: money(total) } }]}
              />
            }
            download={download(0)}
          />
        </section>

        <section aria-labelledby="s-cat">
          <Heading level={2} id="s-cat" className={h2}>
            {UI.odBudSecCat[locale]}
          </Heading>
          {topCategory && secondCategory ? (
            <FigureBlock
              id="fig-2"
              locale={locale}
              number={2}
              headingLevel={3}
              title={fillText(UI.odBudFig2Title[locale], { category: shortName(cat(topCategory), locale), share: topCategory.share ?? "" })}
              subtitle={fillText(UI.odBudFig2Subtitle[locale], { fy })}
              source={source(CATEGORY_PAGE)}
              footnotes={[
                UI.odBudFig2Note1[locale],
                fillText(UI.odBudFig2Note2[locale], { n: n(categories.length) }),
                UI.odBudFig2Note3[locale],
              ]}
              chart={
                <BarChart
                  data={categories.slice(0, 8).map((c, index) => ({ label: cat(c), value: Number(c.amount), highlight: index === 0 }))}
                  title={fillText(UI.odBudFig2Subtitle[locale], { fy })}
                  description={fillText(UI.odBudFig2Alt[locale], {
                    category: shortName(cat(topCategory), locale),
                    amount: money(topCategory.amount),
                    second: shortName(cat(secondCategory), locale),
                    secondAmount: money(secondCategory.amount),
                  })}
                  locale={locale}
                  unit={UI.odMoneyUnit[locale]}
                  formatValue={money}
                />
              }
              table={
                <DataTable
                  id="table-2"
                  columns={catColumns}
                  rows={categories}
                  getRowKey={(row) => row.category}
                  caption={fillText(UI.odBudTableCategoryYear[locale], { n: n(table2), year })}
                  footerRows={[{ key: "total", cells: { item: UI.odBudTotal[locale], amount: money(total), share: PRINTED_CATEGORY_TOTAL_SHARE } }]}
                />
              }
              download={download(1)}
            />
          ) : null}
        </section>

        <section aria-labelledby="s-change">
          <Heading level={2} id="s-change" className={h2}>
            {fillText(UI.odBudSecYears[locale], { prev: previous, year })}
          </Heading>
          {compared[0] ? (
            <FigureBlock
              id="fig-3"
              locale={locale}
              number={3}
              headingLevel={3}
              title={fillText(UI.odBudFig3Title[locale], {
                amount: money(compared[0].current?.amount ?? ""),
                fy,
                prev: money(compared[0].previous?.amount ?? ""),
                prevFy: fyPrev,
              })}
              subtitle={fillText(UI.odBudFig3Subtitle[locale], { prev: previous, year })}
              source={source(COMPARISON_PAGE)}
              footnotes={[UI.odBudFig3Note1[locale], UI.odBudFig3Note2[locale], UI.odBudFig3Note3[locale]]}
              chart={
                <BarChart
                  data={compared.map((row, index) => ({
                    label: orgLabel(row.org, row.current?.organisation ?? row.organisation, locale),
                    value: Number(row.current?.amount ?? 0),
                    compare: Number(row.previous?.amount ?? 0),
                    highlight: index === 0,
                  }))}
                  title={fillText(UI.odBudFig3Subtitle[locale], { prev: previous, year })}
                  description={fillText(UI.odBudFig3Alt[locale], {
                    prev: previous,
                    year,
                    prevAmount: money(compared[0].previous?.amount ?? ""),
                    amount: money(compared[0].current?.amount ?? ""),
                  })}
                  locale={locale}
                  unit={UI.odMoneyUnit[locale]}
                  valueLabel={fy}
                  compareLabel={fyPrev}
                  formatValue={money}
                />
              }
              table={
                <DataTable
                  id="table-3"
                  columns={compareColumns}
                  rows={comparison}
                  getRowKey={(row) => row.key}
                  caption={fillText(UI.odBudTableYearsCompared[locale], { n: n(table3), prev: previous, year })}
                  footerRows={[{ key: "total", cells: { organisation: UI.odBudTotal[locale], previous: money(totalPrev), current: money(total) } }]}
                />
              }
              download={download(2)}
            />
          ) : null}
        </section>

        <section aria-labelledby="s-su">
          <Heading level={2} id="s-su" className={h2}>
            {UI.odBudSecSu[locale]}
          </Heading>
          {topProject && secondProject ? (
            <FigureBlock
              id="fig-4"
              locale={locale}
              number={4}
              headingLevel={3}
              title={fillText(UI.odBudFig4Title[locale], { project: topProject.project, share: topProject.share ?? NA })}
              subtitle={fillText(UI.odBudFig4Subtitle[locale], { fy })}
              source={source(topProject.page)}
              footnotes={[UI.odBudFig4Note1[locale]]}
              chart={
                <BarChart
                  data={projects.map((p, index) => ({ label: p.project, value: Number(p.amount), highlight: index === 0 }))}
                  title={fillText(UI.odBudFig4Subtitle[locale], { fy })}
                  description={fillText(UI.odBudFig4Alt[locale], {
                    project: topProject.project,
                    amount: money(topProject.amount),
                    share: topProject.share ?? NA,
                    second: secondProject.project,
                    secondAmount: money(secondProject.amount),
                  })}
                  locale={locale}
                  unit={UI.odMoneyUnit[locale]}
                  formatValue={money}
                />
              }
              table={
                <DataTable
                  id="table-4"
                  columns={unionProjectColumns}
                  rows={projects}
                  getRowKey={(row) => row.project}
                  caption={caption("odBudCaptionProjects", table4, union ? label(union) : "")}
                  footerRows={[{ key: "total", cells: { project: UI.odBudTotal[locale], amount: money(PRINTED_BODY.tusu?.total ?? ""), share: NA } }]}
                />
              }
              download={download(3)}
            />
          ) : null}
        </section>

        <section aria-labelledby="s-tables">
          <Heading level={2} id="s-tables" className={h2}>
            {UI.odBudSecTables[locale]}
          </Heading>
          <p className="m-0 mb-[var(--space-5)] max-w-[var(--measure-en)]">{UI.odBudTablesIntro[locale]}</p>
          <Stack space={8}>
            {numbered.map(({ body, projects: projectsNumber, categories: categoriesNumber, single: singleNumber }) => {
              const bodyName = orgLabel(body.org, body.organisation, locale);
              const heading = bodyHeading(body);
              const printed = PRINTED_BODY[body.key];
              return (
                <div key={body.key} className="flex flex-col gap-[var(--space-4)]">
                  <div>
                    <Heading level={3} className="m-0">
                      <Txt text={bodyName} locale={locale} />
                    </Heading>
                    {heading ? <p className="m-0 mt-[var(--space-1)] text-ink-600">{heading}</p> : null}
                    {!body.projects && !body.categories ? (
                      <p className="m-0 mt-[var(--space-1)] text-ink-600">{fillText(UI.odBudBodyOneLine[locale], { prev: previous })}</p>
                    ) : null}
                  </div>
                  {projectsNumber !== null && body.projects && printed ? (
                    <DataTable
                      columns={projectColumns}
                      rows={body.projects}
                      getRowKey={(row) => row.project}
                      caption={caption("odBudCaptionProjects", projectsNumber, bodyName)}
                      footerRows={[{ key: "total", cells: { project: UI.odBudTotal[locale], amount: money(printed.total) } }]}
                    />
                  ) : null}
                  {categoriesNumber !== null && body.categories && printed ? (
                    <DataTable
                      columns={bodyCategoryColumns}
                      rows={body.categories}
                      getRowKey={(row) => row.category}
                      caption={caption("odBudCaptionCategories", categoriesNumber, bodyName)}
                      footerRows={[{ key: "total", cells: { item: UI.odBudTotal[locale], amount: money(printed.total) } }]}
                    />
                  ) : null}
                  {singleNumber !== null && body.line ? (
                    <DataTable
                      columns={singleColumns(bodyName)}
                      rows={[body.line]}
                      getRowKey={(row) => row.organisation}
                      caption={caption("odBudCaptionSingle", singleNumber, bodyName)}
                      footerRows={[{ key: "total", cells: { item: UI.odBudTotal[locale], amount: money(body.line.amount) } }]}
                    />
                  ) : null}
                </div>
              );
            })}
          </Stack>
        </section>

        <section aria-labelledby="quality">
          <Heading level={2} id="quality" className={h2}>
            {UI.odBudSecQuality[locale]}
          </Heading>
          <Heading level={3} className="m-0 mb-[var(--space-2)] text-lg">
            {UI.odBudSources[locale]}
          </Heading>
          <ul className="m-0 mb-[var(--space-4)] flex max-w-[var(--measure-en)] list-disc flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
            <li>
              {reportHref ? (
                <Link href={reportHref} locale={locale} className="text-action underline">
                  {reportTitle}
                </Link>
              ) : null}
              . {fillText(UI.odBudSourceReport[locale], { pages: n(report?.pages ?? 0) })}
            </li>
            {meetingSlug ? (
              <li>
                <Link href={localePath(locale, `${TUSC_PATH}/meetings/${meetingSlug}`)} locale={locale} className="text-action underline">
                  {fillText(UI.odBudRelatedMeeting[locale], { date: releaseText })}
                </Link>
                . {fillText(UI.odBudSourceMinutes[locale], { date: releaseText })}
              </li>
            ) : null}
          </ul>
          <p className="m-0 mb-[var(--space-4)] max-w-[var(--measure-en)]">
            {datasetSentence[0]}
            <Link href={localePath(locale, `${TUSC_PATH}/data`)} locale={locale} className="text-action underline">
              {UI.odBudDatasetLinkText[locale]}
            </Link>
            {datasetSentence[1]}
          </p>
          <MetadataList
            compact
            items={[
              { term: UI.odBudCoverage[locale], value: fillText(UI.odBudCoverageValue[locale], { prev: previous }) },
              { term: UI.odBudTimeliness[locale], value: UI.odBudTimelinessValue[locale] },
            ]}
          />
          <Heading level={3} className="m-0 mb-[var(--space-2)] text-lg">
            {UI.odBudCommitteeSaid[locale]}
          </Heading>
          <blockquote className="m-0 mb-[var(--space-2)] max-w-[var(--measure-en)] border-l-4 border-line-strong pl-[var(--space-4)]" lang="th">
            {UI.odBudCommitteeQuote.th}
          </blockquote>
          <p className="m-0 max-w-[var(--measure-en)] text-ink-600">{UI.odBudCommitteeGloss[locale]}</p>
        </section>

        <section aria-labelledby="glossary">
          <Heading level={2} id="glossary" className={h2}>
            {UI.odBudSecGlossary[locale]}
          </Heading>
          <dl className="m-0 max-w-[var(--measure-en)]">
            {glossary.map(([term, definition]) => (
              <div key={term} className="border-b border-line py-[var(--space-3)]">
                <dt className="font-bold text-ink-900">{term}</dt>
                <dd className="m-0 text-ink-900">{definition}</dd>
              </div>
            ))}
          </dl>
        </section>

        <RelatedLinks
          id="related"
          locale={locale}
          headingLevel={2}
          items={[
            {
              label: UI.odBudRelatedAllYears[locale],
              href: localePath(locale, `${TUSC_PATH}/budget`),
              description: fillText(UI.odBudRelatedAllYearsDesc[locale], { year, prev: previous }),
            },
            {
              label: fillText(UI.odBudRelatedReport[locale], { year }),
              href: localePath(locale, `${TUSC_PATH}/reports`),
              description: UI.odBudRelatedReportDesc[locale],
            },
            ...(meetingSlug
              ? [
                  {
                    label: fillText(UI.odBudRelatedMeeting[locale], { date: releaseText }),
                    href: localePath(locale, `${TUSC_PATH}/meetings/${meetingSlug}`),
                    description: UI.odBudRelatedMeetingDesc[locale],
                  },
                ]
              : []),
            ...(report && reportHref
              ? [
                  {
                    label: fillText(UI.odBudRelatedSource[locale], { title: reportTitle }),
                    href: reportHref,
                    description: fillText(UI.odBudRelatedSourceDesc[locale], { pages: n(report.pages ?? 0) }),
                  },
                ]
              : []),
            {
              label: UI.odBudRelatedDataset[locale],
              href: localePath(locale, `${TUSC_PATH}/data`),
              description: fillText(UI.odBudRelatedDatasetDesc[locale], { n: n(datasetRows) }),
            },
          ]}
        />

        <div id="cite">
          <CiteThis locale={locale} headingLevel={2}>
            {fillText(UI.odBudCiteText[locale], {
              title,
              release: releaseText,
              updated: updated ? formatDate(updated, locale) : UI.odNotApplicable[locale],
            })}
          </CiteThis>
        </div>
      </Stack>
    </>
  );
}
