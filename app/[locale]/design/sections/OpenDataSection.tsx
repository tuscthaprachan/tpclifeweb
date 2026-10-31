import { BarChart } from "@/components/ui/BarChart";
import { CiteThis } from "@/components/ui/CiteThis";
import { ColumnChart } from "@/components/ui/ColumnChart";
import { DataTable, NoteRef, type DataTableColumn, type DataTableFooterRow } from "@/components/ui/DataTable";
import { DocumentList } from "@/components/ui/DocumentList";
import { DownloadList } from "@/components/ui/DownloadList";
import { Figure } from "@/components/ui/Figure";
import { KeyFigures } from "@/components/ui/KeyFigures";
import { Pagination } from "@/components/ui/Pagination";
import { RelatedLinks } from "@/components/ui/RelatedLinks";
import { SectionNav } from "@/components/ui/SectionNav";
import { Stack } from "@/components/ui/Stack";
import { TableOfContents } from "@/components/ui/TableOfContents";
import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { ComponentDoc } from "../ComponentDoc";

interface BudgetRow {
  organisation: string;
  type: string;
  amount: number;
}

const BUDGET_2569: BudgetRow[] = [
  { organisation: "Student Union (TUSU)", type: "Student Union", amount: 1171383.84 },
  { organisation: "ASA TPC volunteer club", type: "Club", amount: 313000 },
  { organisation: "TPC MUSIC club", type: "Club", amount: 216619.16 },
  { organisation: "Student Affairs Division", type: "University division", amount: 200000 },
  { organisation: "TU HOST club", type: "Club", amount: 72381.4 },
  { organisation: "Student Council (TUSC)", type: "Council", amount: 9182 },
  { organisation: "TPC DANCE club", type: "Club", amount: 4800 },
  { organisation: "TPC Film Club (independent group)", type: "Independent group", amount: 857 },
];

const BUDGET_2568: Record<string, number> = {
  "Student Union (TUSU)": 1248164.5,
  "ASA TPC volunteer club": 340000,
  "TPC MUSIC club": 281890,
  "TU HOST club": 49176,
  "TPC DANCE club": 9195,
};

const ATTENDANCE = [
  { label: "13 May", value: 31 },
  { label: "26 May", value: 24 },
  { label: "1 Jul", value: 26 },
  { label: "18 Jul", value: 23 },
  { label: "12 Dec", value: 17 },
  { label: "8 Jan", value: 17 },
  { label: "19 Mar", value: 17 },
];

const DOWNLOAD = { label: "Budget by organisation", href: "/mockups/open-data/data/budget-2569-figure-1.csv", format: "CSV", size: "1 KB" };

const BAR_ALT =
  "A bar chart showing that the Student Union holds 58.9% of the student activity budget for FY 2569, followed by ASA TPC at 313,000 baht and TPC MUSIC at 216,619.16 baht.";

export function OpenDataSection({ headingLevel, locale }: { headingLevel: HeadingLevel; locale: Locale }) {
  const inner = Math.min(6, headingLevel + 1) as HeadingLevel;
  const money = (value: number) => formatNumber(value, locale);

  const columns: DataTableColumn<BudgetRow>[] = [
    { id: "organisation", header: "Organisation", cell: (row) => row.organisation, rowHeader: true },
    { id: "type", header: "Type", cell: (row) => row.type },
    {
      id: "amount",
      header: "Budget (baht)",
      cell: (row) => (
        <>
          {money(row.amount)}
          {row.organisation === "Student Council (TUSC)" ? <NoteRef n={1} tableId="od-budget-table" locale={locale} /> : null}
        </>
      ),
      align: "end",
    },
  ];
  const footerRows: DataTableFooterRow[] = [{ key: "total", cells: { organisation: "Total stated in the report", amount: money(1988223.24) } }];

  const yearOnYear = BUDGET_2569.filter((row) => row.organisation in BUDGET_2568)
    .slice(0, 4)
    .map((row, index) => ({ label: row.organisation, value: row.amount, compare: BUDGET_2568[row.organisation], highlight: index === 0 }));

  return (
    <Stack space={8}>
      <ComponentDoc
        id="data-table-open-data"
        name="DataTable: row headers, totals and notes"
        headingLevel={headingLevel}
        purpose="A table of figures. The first column becomes row headers, totals sit in a tfoot, numbers are right-aligned in tabular figures, and the source and numbered notes follow the table."
        whenNotToUse="For a handful of facts about one thing, where SummaryList reads better. Do not recompute a total the source states: show the stated total and say so in a note."
        a11yNotes={[
          "rowHeader on a column renders th scope=row in the body and the footer, so a screen reader announces the organisation before each amount.",
          "Footer rows are a real tfoot. On a phone they stack like body rows; a column left empty in a footer row is hidden.",
          "NoteRef is a link to the numbered note below the table. Its text reads 'note 1' in full.",
        ]}
      >
        <DataTable
          id="od-budget-table"
          columns={columns}
          rows={BUDGET_2569}
          getRowKey={(row) => row.organisation}
          caption="Table 1: Budget by organisation, fiscal year 2569 (baht)"
          footerRows={footerRows}
          sourceNote="Source: Summary of Student Activity Budget Report, Fiscal Year 2026, page 5, from the Student Council, Tha Prachan"
          footnotes={["The Student Council lines are a contemporary art exhibition (5,377 baht) and a durables project (3,805 baht)."]}
          locale={locale}
        />
      </ComponentDoc>

      <ComponentDoc
        id="figure"
        name="Figure and BarChart"
        headingLevel={headingLevel}
        purpose="A chart with its number, a title that states the finding, a subtitle, a source line, numbered notes and a download. Bars keep the order given, start at zero and carry their values."
        whenNotToUse="For a number with nothing to compare it to, use KeyFigures. A chart never replaces its table: put the same figures in a DataTable beside or below it."
        a11yNotes={[
          "The SVG is one role=img named by its title and described by a 100 to 200 character alternative that opens 'A bar chart showing that'.",
          "One colour for the bars and the accent for the bar the title is about. The highlight is named in the title and the alternative, so colour is never the only signal.",
          "Colours are theme tokens, so the chart follows the light and dark themes. Nothing animates.",
          "Notes and downloads are native disclosures that work without JavaScript.",
        ]}
      >
        <Figure
          id="od-fig-1"
          locale={locale}
          number={1}
          headingLevel={inner}
          title="The Student Union holds 58.9% of the student activity budget for FY 2569"
          subtitle="Budget by organisation, baht, Student Council, Tha Prachan, fiscal year 2569 (2026)"
          source="Summary of Student Activity Budget Report, Fiscal Year 2026, from the Student Council, Tha Prachan"
          footnotes={["Sorted by amount. The report lists the organisations in a different order."]}
          downloads={[DOWNLOAD]}
        >
          <BarChart
            data={BUDGET_2569.map((row, index) => ({ label: row.organisation, value: row.amount, highlight: index === 0 }))}
            title="Budget by organisation, fiscal year 2569"
            description={BAR_ALT}
            locale={locale}
            unit="baht"
          />
        </Figure>
      </ComponentDoc>

      <ComponentDoc
        id="bar-chart-compare"
        name="BarChart: year on year"
        headingLevel={headingLevel}
        purpose="The same categories in two periods. The current period is a solid bar and the earlier one an outline beneath it, each labelled with its value."
        whenNotToUse="For more than two periods, where a ColumnChart in time order reads better."
        a11yNotes={["The legend names both series in words. The outline versus fill difference does not depend on colour."]}
      >
        <Figure
          id="od-fig-2"
          locale={locale}
          number={2}
          headingLevel={inner}
          title="Four of the five largest budgets fell from FY 2568 to FY 2569"
          subtitle="Budget by organisation, baht, Student Council, Tha Prachan, fiscal years 2568 and 2569"
          source="Budget reports for fiscal years 2568 and 2569, from the Student Council, Tha Prachan"
        >
          <BarChart
            data={yearOnYear}
            title="Budget by organisation, fiscal years 2568 and 2569"
            description="A bar chart showing that the Student Union budget fell from 1,248,164.50 to 1,171,383.84 baht, and that three clubs shown also have lower budgets than a year earlier."
            locale={locale}
            unit="baht"
            valueLabel="FY 2569"
            compareLabel="FY 2568"
          />
        </Figure>
      </ComponentDoc>

      <ComponentDoc
        id="column-chart"
        name="ColumnChart"
        headingLevel={headingLevel}
        purpose="A short series in time order, such as attendance at each meeting, with an optional dashed reference line such as the number of seats."
        whenNotToUse="For comparing categories, where a sorted BarChart is easier to read. For a long series, where a line chart would be needed."
        a11yNotes={["The reference line is labelled on the chart and described in the alternative text. The dash pattern distinguishes it from the axis without colour."]}
      >
        <Figure
          id="od-fig-3"
          locale={locale}
          number={3}
          headingLevel={inner}
          title="Attendance fell from 31 to 17 over the first seven meetings"
          subtitle="Members present, Student Council, Tha Prachan, 13 May 2025 to 19 March 2026"
          source="Attendance lists in the 7 sets of minutes of the Student Council, Tha Prachan"
        >
          <ColumnChart
            data={ATTENDANCE.map((datum, index) => ({ ...datum, highlight: index === 0 }))}
            title="Members present at each meeting"
            description="A column chart showing that 31 people were present at the first meeting, on 13 May 2025, and 24, 26, 23, 17, 17 and 17 at the six that followed, against 30 seats."
            locale={locale}
            unit="people"
            referenceLine={{ value: 30, label: "30 seats" }}
          />
        </Figure>
      </ComponentDoc>

      <ComponentDoc
        id="key-figures"
        name="KeyFigures"
        headingLevel={headingLevel}
        purpose="Two or three headline numbers at the top of a page, each with a label and the period it covers."
        whenNotToUse="For more than three numbers, or for a number whose meaning needs a comparison. Use a Figure."
        a11yNotes={["Each tile is a list item with a heading, the figure as text and its context. The figure is kept to 14 characters so it does not wrap or overflow at 320px."]}
      >
        <KeyFigures
          headingLevel={inner}
          items={[
            { label: "Student activity budget", figure: `${money(1988223.24)}`, context: "baht, fiscal year 2569" },
            { label: "Council meetings", figure: money(7), context: "13 May 2025 to 19 March 2026" },
            { label: "Seats on the council", figure: money(30), context: "academic year 2568" },
          ]}
        />
      </ComponentDoc>

      <ComponentDoc
        id="document-list"
        name="DocumentList"
        headingLevel={headingLevel}
        purpose="A list of documents to open or download: title, type, date, file format and size, and a line of description."
        whenNotToUse="For a single file, use DownloadList. For ordinary page links, use RelatedLinks."
        a11yNotes={[
          "The link carries a visually hidden suffix with the format and size, so the link text is complete out of context. The visible file details are hidden from screen readers to avoid reading them twice.",
          "A missing date is written out, such as '[date not stated]', never left blank.",
        ]}
      >
        <DocumentList
          locale={locale}
          headingLevel={inner}
          items={[
            {
              title: "Minutes of the Student Council, Ordinary Session 2, Meeting 1, academic year 2568",
              href: "#document-list",
              type: "Minutes",
              date: "2026-01-08",
              format: "PDF",
              size: "486 KB",
              pages: "10 pages",
              description: "Student Council, Tha Prachan.",
            },
            {
              title: "Summary of Student Activity Budget Report, Fiscal Year 2026 (B.E. 2569)",
              href: "#document-list",
              type: "Report",
              date: null,
              noDateText: "[date not stated]",
              format: "PDF",
              size: "2.7 MB",
              pages: "18 pages",
            },
          ]}
        />
      </ComponentDoc>

      <ComponentDoc
        id="download-list"
        name="DownloadList"
        headingLevel={headingLevel}
        purpose="A bare list of downloadable files. Each link states what it is, its type and its size."
        whenNotToUse="For documents with a description and a date, use DocumentList. Do not list a format that does not exist yet."
      >
        <DownloadList items={[DOWNLOAD, { label: "Attendance at each meeting", href: "/mockups/open-data/data/meetings-attendance.csv", format: "CSV", size: "2 KB" }]} />
      </ComponentDoc>

      <ComponentDoc
        id="section-nav"
        name="SectionNav"
        headingLevel={headingLevel}
        purpose="Links between the pages of one section. A compact two-column list on a phone and a vertical list with a rule beside it from the md breakpoint."
        whenNotToUse="For the whole site, which is the header's job. For sections within one page, use TableOfContents."
        a11yNotes={[
          "A nav landmark named by a visible label. The current page has aria-current=page and is bold with a dark bar, so it does not rely on colour.",
          "Links are at least 44px tall on a phone and never scroll sideways.",
        ]}
      >
        <SectionNav
          locale={locale}
          items={[
            { label: "Meetings", href: "#section-nav", current: true },
            { label: "Budget", href: "#figure" },
            { label: "Funds", href: "#key-figures" },
            { label: "Documents", href: "#document-list" },
          ]}
        />
      </ComponentDoc>

      <ComponentDoc
        id="table-of-contents"
        name="TableOfContents"
        headingLevel={headingLevel}
        purpose="A numbered list of the sections on a long page, linking to their headings."
        whenNotToUse="For a page that fits on one screen. Keep the list shorter than the viewport."
      >
        <TableOfContents
          locale={locale}
          headingLevel={inner}
          items={[
            { label: "Main points", href: "#key-figures", current: true },
            { label: "Attendance", href: "#column-chart" },
            { label: "All meetings", href: "#document-list" },
          ]}
        />
      </ComponentDoc>

      <ComponentDoc
        id="related-links"
        name="RelatedLinks"
        headingLevel={headingLevel}
        purpose="A short list of related pages or datasets, each with an optional one-line description."
        whenNotToUse="For the main route through a page, which belongs in the content."
      >
        <RelatedLinks
          locale={locale}
          headingLevel={inner}
          items={[
            { label: "Council meetings", href: "#column-chart", description: "The full minutes of all 7 meetings." },
            { label: "Budget by organisation", href: "#figure" },
          ]}
        />
      </ComponentDoc>

      <ComponentDoc
        id="cite-this"
        name="CiteThis"
        headingLevel={headingLevel}
        purpose="A ready-made reference at the foot of a data page."
        whenNotToUse="For credit to a person or a photograph. Use the page's own source line."
      >
        <CiteThis locale={locale} headingLevel={inner}>
          Student Council, Thammasat University, Tha Prachan. Summary of Student Activity Budget Report, Fiscal Year 2026. TryTPC, open data.
        </CiteThis>
      </ComponentDoc>

      <ComponentDoc
        id="pagination-numbered"
        name="Pagination: numbered pages"
        headingLevel={headingLevel}
        purpose="Page numbers with gaps, previous and next, and 'Page X of Y' above them, for a long list such as the 269 funds."
        whenNotToUse="For a list that fits on two pages, where previous and next are enough."
        a11yNotes={[
          "The current page is a link with aria-current=page and is drawn solid and bold. Gaps are hidden from assistive technology.",
          "Every page is a real URL from buildHref, so it works without JavaScript. The numbers wrap at 320px instead of scrolling.",
        ]}
      >
        <Pagination currentPage={6} totalPages={11} buildHref={(page) => `#pagination-numbered?page=${page}`} locale={locale} />
      </ComponentDoc>
    </Stack>
  );
}
