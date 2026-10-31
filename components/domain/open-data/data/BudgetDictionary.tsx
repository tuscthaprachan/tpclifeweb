import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Heading } from "@/components/ui/Heading";
import { Link } from "@/components/ui/Link";
import { SummaryList } from "@/components/ui/SummaryList";
import { WarningText } from "@/components/ui/WarningText";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { BUDGET_COLUMNS } from "@/lib/open-data/datasets";
import type { BudgetLineRow } from "@/lib/open-data/read";
import { PRINTED_TOTAL, REPORT_FILE } from "../budget/printed";
import { organisationLines } from "../budget/model";
import { fillText } from "../fill";
import { amountRange, categoryGroups, pageRanges, rowsByYear, typeCounts, viewCounts } from "./dictionary";

interface BudgetDictionaryProps {
  locale: Locale;
  lines: readonly BudgetLineRow[];
  fileSize: string;
  sourceTitle: string;
  sourceHref: string | null;
  format: { money: (value: string) => string; year: (year: number) => string };
}

interface ColumnRow {
  column: (typeof BUDGET_COLUMNS)[number];
  meaning: string;
  type: string;
  example: string;
  allowed: string;
  empty: string;
}

const TYPE_MEANING = {
  "ชุมนุม": UI.odDataDictTypeClub,
  "อมธ.": UI.odDataDictTypeUnion,
  "รวมทุกองค์กร": UI.odDataDictTypeAll,
  "สภา": UI.odDataDictTypeCouncil,
  "กลุ่มอิสระ": UI.odDataDictTypeGroup,
  "กองกิจการนักศึกษา": UI.odDataDictTypeDivision,
} as const;

export function BudgetDictionary({ locale, lines, fileSize, sourceTitle, sourceHref, format }: BudgetDictionaryProps) {
  const n = (value: number) => formatNumber(value, locale);
  const years = rowsByYear(lines);
  const yearsAscending = [...years].sort((a, b) => a.year - b.year);
  const range = amountRange(lines);
  const pages = lines.flatMap((l) => (l.sourcePage === null ? [] : [l.sourcePage]));
  const views = viewCounts(lines);
  const types = typeCounts(lines);
  const sad = organisationLines(lines, Math.max(...years.map((y) => y.year))).find((o) => o.org?.key === "sad");
  const example = lines.find((l) => l.view === "project" && l.project === "TPC Games 2025") ?? lines[0];
  const never = UI.odDataDictNever[locale];
  const to = locale === "th" ? "ถึง" : "to";

  const viewsTable = 2;
  const typesTable = 3;

  const columns: ColumnRow[] = [
    { column: "fiscal_year_be", meaning: UI.odDataDictMFiscal[locale], type: UI.odDataDictTInteger[locale], example: example ? String(example.fiscalYear) : "", allowed: yearsAscending.map((y) => y.year).join(", "), empty: never },
    {
      column: "view",
      meaning: UI.odDataDictMView[locale],
      type: UI.odDataDictTText[locale],
      example: example?.view ?? "",
      allowed: fillText(UI.odDataDictViewValues[locale], { n: n(viewsTable) }),
      empty: never,
    },
    { column: "organisation_type", meaning: UI.odDataDictMOrgType[locale], type: UI.odDataDictTTextTh[locale], example: example?.organisationType ?? "", allowed: fillText(UI.odDataDictSeeTable[locale], { n: n(typesTable) }), empty: never },
    { column: "organisation", meaning: UI.odDataDictMOrg[locale], type: UI.odDataDictTTextTh[locale], example: example?.organisation ?? "", allowed: UI.odDataDictNamesAsPrinted[locale], empty: never },
    { column: "project", meaning: UI.odDataDictMProject[locale], type: UI.odDataDictTText[locale], example: example?.project ?? "", allowed: UI.odDataDictProjectNames[locale], empty: UI.odDataDictNotApplicableProject[locale] },
    {
      column: "category",
      meaning: UI.odDataDictMCategory[locale],
      type: UI.odDataDictTTextTh[locale],
      example: lines.find((l) => l.view === "category" && l.category.includes("ค่าอาหาร/อาหารว่าง"))?.category ?? "",
      allowed: fillText(UI.odDataDictCategoryGroups[locale], { groups: categoryGroups(lines).join(", ") }),
      empty: UI.odDataDictNotApplicableCategory[locale],
    },
    {
      column: "amount_thb",
      meaning: UI.odDataDictMAmount[locale],
      type: UI.odDataDictTDecimal[locale],
      example: example?.amount ?? "",
      allowed: range ? fillText(UI.odDataDictAmountRange[locale], { min: range.min, max: range.max }) : "",
      empty: never,
    },
    {
      column: "source_page",
      meaning: fillText(UI.odDataDictMPage[locale], { n: REPORT_FILE }),
      type: UI.odDataDictTInteger[locale],
      example: example?.sourcePage === null || example?.sourcePage === undefined ? "" : String(example.sourcePage),
      allowed: pageRanges(pages, to),
      empty: never,
    },
  ];

  const columnColumns: DataTableColumn<ColumnRow>[] = [
    { id: "column", header: UI.odDataDictColColumn[locale], rowHeader: true, cell: (row) => <code>{row.column}</code> },
    { id: "meaning", header: UI.odDataDictColMeaning[locale], cell: (row) => row.meaning },
    { id: "type", header: UI.odDataDictColType[locale], cell: (row) => row.type },
    { id: "example", header: UI.odDataDictColExample[locale], cell: (row) => (/[฀-๿]/.test(row.example) ? <span lang="th">{row.example}</span> : row.example) },
    { id: "allowed", header: UI.odDataDictColAllowed[locale], cell: (row) => row.allowed },
    { id: "empty", header: UI.odDataDictColEmpty[locale], cell: (row) => row.empty },
  ];

  const viewMeaning = (view: (typeof views)[number]) => {
    switch (view.view) {
      case "organisation":
        return UI.odDataDictViewOrganisation[locale];
      case "project":
        return UI.odDataDictViewProject[locale];
      case "category":
        return UI.odDataDictViewCategory[locale];
      case "category-all":
        return fillText(UI.odDataDictViewCategoryAll[locale], { type: "รวมทุกองค์กร" });
    }
  };
  const viewRows = views.map((view, index) => ({
    key: `${view.view}-${view.year ?? index}`,
    name: view.view === "category-all" ? "category" : view.view,
    meaning: viewMeaning(view),
    rows: view.year === null ? n(view.rows) : `${format.year(view.year)}: ${n(view.rows)}`,
  }));
  const viewColumns: DataTableColumn<(typeof viewRows)[number]>[] = [
    { id: "view", header: UI.odDataDictColView[locale], rowHeader: true, cell: (row) => <code>{row.name}</code> },
    { id: "meaning", header: UI.odDataDictColMeaning[locale], cell: (row) => row.meaning },
    { id: "rows", header: UI.odDataDictColRows[locale], align: "end", cell: (row) => row.rows },
  ];

  const typeColumns: DataTableColumn<(typeof types)[number]>[] = [
    { id: "type", header: UI.odDataDictColOrgType[locale], rowHeader: true, cell: (row) => <span lang="th">{row.type}</span> },
    {
      id: "meaning",
      header: UI.odDataDictColMeaning[locale],
      cell: (row) => (row.type in TYPE_MEANING ? TYPE_MEANING[row.type as keyof typeof TYPE_MEANING][locale] : row.type),
    },
    { id: "rows", header: UI.odDataDictColRows[locale], align: "end", cell: (row) => n(row.rows) },
  ];

  const sourceSentence = fillText(UI.odDataDictSourceValue[locale], { n: REPORT_FILE }).split("{title}");
  const h3 = "m-0 mb-[var(--space-3)] text-lg";
  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <SummaryList
        rows={[
          { key: UI.odDataDictFile[locale], value: fillText(UI.odDataDictFileValue[locale], { file: "budget-lines.csv", rows: n(lines.length), cols: n(BUDGET_COLUMNS.length) }) + (fileSize ? ` (${fileSize})` : "") },
          {
            key: UI.odDataDictCoverage[locale],
            value: years.map((y) => `${format.year(y.year)} (${fillText(UI.odDataRows[locale], { n: n(y.rows) })})`).join(locale === "th" ? " และ " : " and "),
          },
          {
            key: UI.odDataDictSource[locale],
            value: (
              <>
                {sourceSentence[0]}
                {sourceHref ? (
                  <Link href={sourceHref} locale={locale} className="text-action underline">
                    {sourceTitle}
                  </Link>
                ) : (
                  sourceTitle
                )}
                {sourceSentence[1]}
              </>
            ),
          },
          { key: UI.odDataDictUnit[locale], value: UI.odDataDictUnitValue[locale] },
        ]}
      />
      <WarningText>
        <span className="visually-hidden">{UI.warning[locale]}: </span>
        {UI.odDataDictWarning[locale]}
      </WarningText>
      <DataTable
        id="dictionary-columns"
        columns={columnColumns}
        rows={columns}
        getRowKey={(row) => row.column}
        caption={fillText(UI.odDataDictColumnsCaption[locale], { n: n(1) })}
      />
      <DataTable
        id="dictionary-views"
        columns={viewColumns}
        rows={viewRows}
        getRowKey={(row) => row.key}
        caption={fillText(UI.odDataDictViewsCaption[locale], { n: n(viewsTable) })}
      />
      <DataTable
        id="dictionary-types"
        columns={typeColumns}
        rows={types}
        getRowKey={(row) => row.type}
        caption={fillText(UI.odDataDictTypesCaption[locale], { n: n(typesTable) })}
        footerRows={[{ key: "total", cells: { type: UI.odDataTotalRow[locale], rows: n(lines.length) } }]}
      />
      <div>
        <Heading level={3} className={h3}>
          {UI.odDataDictCovers[locale]}
        </Heading>
        <ul className="m-0 flex max-w-[var(--measure-en)] list-disc flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
          {sad ? <li>{fillText(UI.odDataDictCovers1[locale], { amount: format.money(sad.amount) })}</li> : null}
          {years
            .filter((y) => PRINTED_TOTAL[y.year] && !lines.some((l) => l.fiscalYear === y.year && l.view !== "organisation"))
            .map((y) => (
              <li key={y.year}>{fillText(UI.odDataDictCovers2[locale], { fy: format.year(y.year), total: format.money(PRINTED_TOTAL[y.year]?.amount ?? "") })}</li>
            ))}
        </ul>
      </div>
    </div>
  );
}
