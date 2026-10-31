import type { CsvTable } from "@/lib/open-data/csv";
import type { BudgetLineRow } from "@/lib/open-data/read";
import { campusCategories, compareYears, organisationLines, organisationsByAmount, unionProjects, type OrgLine } from "./model";
import { PRINTED_SHARE_2568 } from "./printed";

const ORG_COLUMNS = ["fiscal_year_be", "organisation_type", "organisation", "amount_thb", "source_page"] as const;
const MISSING = "[not stated]";

function page(value: number | null): string {
  return value === null ? MISSING : String(value);
}

function orgRow(year: number, line: OrgLine): string[] {
  return [String(year), line.organisationType, line.organisation, line.amount, page(line.page)];
}

/**
 * The CSV files behind a fiscal year's page, by file name. Values are the stored lines; the share
 * columns hold the percentages the report prints, and "[not stated]" where it prints none.
 */
export function budgetDownloads(lines: readonly BudgetLineRow[], year: number, previousYear: number): Record<string, CsvTable> {
  const files: Record<string, CsvTable> = {};
  const orgs = organisationLines(lines, year);
  if (orgs.length === 0) return files;

  const withShare = year === 2568;
  files["organisations.csv"] = {
    columns: withShare ? [...ORG_COLUMNS, "share_printed_percent"] : ORG_COLUMNS,
    rows: orgs.map((line) => {
      const row = orgRow(year, line);
      return withShare ? [...row, (line.org && PRINTED_SHARE_2568[line.org.key]) || MISSING] : row;
    }),
  };

  const projects = unionProjects(lines, year);
  if (projects.length === 0) return files;

  files["figure-1.csv"] = { columns: ORG_COLUMNS, rows: organisationsByAmount(lines, year).map((line) => orgRow(year, line)) };
  files["figure-2.csv"] = {
    columns: ["fiscal_year_be", "category", "amount_thb", "share_printed_percent", "source_page"],
    rows: campusCategories(lines, year).map((c) => [String(year), c.category, c.amount, c.share ?? MISSING, page(c.page)]),
  };
  files["figure-3.csv"] = {
    columns: ORG_COLUMNS,
    rows: compareYears(lines, year, previousYear).flatMap((row) => [
      ...(row.previous ? [orgRow(previousYear, row.previous)] : []),
      ...(row.current ? [orgRow(year, row.current)] : []),
    ]),
  };
  files["figure-4.csv"] = {
    columns: ["fiscal_year_be", "organisation", "project", "amount_thb", "share_printed_percent", "source_page"],
    rows: projects.map((p) => [String(year), p.organisation, p.project, p.amount, p.share ?? MISSING, page(p.page)]),
  };
  return files;
}

export const DOWNLOAD_FILE = /^(organisations|figure-[1-4])\.csv$/;
