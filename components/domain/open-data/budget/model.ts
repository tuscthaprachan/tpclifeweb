import type { BudgetLineRow } from "@/lib/open-data/read";
import { categoryParts, orgByName, type OrgDef, type OrgKey } from "./labels";
import { CATEGORY_PAGE, PRINTED_CATEGORY_SHARE, PRINTED_UNION_PROJECT_SHARE } from "./printed";

const ALL_ORGANISATIONS = "รวมทุกองค์กร";

export interface OrgLine {
  org: OrgDef | null;
  organisation: string;
  organisationType: string;
  amount: string;
  page: number | null;
}

export interface CategoryLine {
  category: string;
  group: string;
  item: string;
  amount: string;
  /** The percentage the report prints beside it, or null. */
  share: string | null;
  page: number | null;
}

export interface ProjectLine {
  organisation: string;
  project: string;
  page: number | null;
  amount: string;
  /** The percentage the pie chart prints for it, or null. */
  share: string | null;
}

export interface BodyTable {
  key: OrgKey;
  org: OrgDef;
  organisation: string;
  /** Null for a body the report gives one line for. */
  projects: ProjectLine[] | null;
  categories: CategoryLine[] | null;
  /** The organisation-view line, used when a body has no project or category lines. */
  line: OrgLine | null;
}

const byAmountDesc = <T extends { amount: string }>(a: T, b: T) => Number(b.amount) - Number(a.amount);

/** Fiscal years that have project lines, which is what makes a bulletin. */
export function bulletinYears(lines: readonly BudgetLineRow[]): number[] {
  return [...new Set(lines.filter((l) => l.view === "project").map((l) => l.fiscalYear))].sort((a, b) => b - a);
}

export function allYears(lines: readonly BudgetLineRow[]): number[] {
  return [...new Set(lines.map((l) => l.fiscalYear))].sort((a, b) => b - a);
}

/** One line per organisation for a year, in the order the report lists them. */
export function organisationLines(lines: readonly BudgetLineRow[], year: number): OrgLine[] {
  return lines
    .filter((l) => l.fiscalYear === year && l.view === "organisation")
    .map((l) => ({
      org: orgByName(l.organisation),
      organisation: l.organisation,
      organisationType: l.organisationType,
      amount: l.amount,
      page: l.sourcePage,
    }));
}

export function organisationsByAmount(lines: readonly BudgetLineRow[], year: number): OrgLine[] {
  return organisationLines(lines, year).sort(byAmountDesc);
}

/** The whole-campus category table (page 6), largest first. */
export function campusCategories(lines: readonly BudgetLineRow[], year: number): CategoryLine[] {
  return lines
    .filter((l) => l.fiscalYear === year && l.view === "category" && l.organisationType === ALL_ORGANISATIONS)
    .map((l) => {
      const { group, item } = categoryParts(l.category);
      return {
        category: l.category,
        group,
        item,
        amount: l.amount,
        share: PRINTED_CATEGORY_SHARE[item] ?? null,
        page: l.sourcePage ?? CATEGORY_PAGE,
      };
    })
    .sort(byAmountDesc);
}

export interface YearComparison {
  key: string;
  org: OrgDef | null;
  organisation: string;
  previous: OrgLine | null;
  current: OrgLine | null;
}

/** Every organisation in either year, largest first by the larger of its two amounts. */
export function compareYears(lines: readonly BudgetLineRow[], year: number, previousYear: number): YearComparison[] {
  const rows = new Map<string, YearComparison>();
  const add = (line: OrgLine, slot: "previous" | "current") => {
    const key = line.org?.key ?? line.organisation;
    const row = rows.get(key) ?? { key, org: line.org, organisation: line.organisation, previous: null, current: null };
    row[slot] = line;
    rows.set(key, row);
  };
  for (const line of organisationLines(lines, previousYear)) add(line, "previous");
  for (const line of organisationLines(lines, year)) add(line, "current");
  const larger = (row: YearComparison) => Math.max(Number(row.previous?.amount ?? 0), Number(row.current?.amount ?? 0));
  return [...rows.values()].sort((a, b) => larger(b) - larger(a));
}

function projectsOf(lines: readonly BudgetLineRow[], year: number, key: OrgKey): ProjectLine[] {
  return lines
    .filter((l) => l.fiscalYear === year && l.view === "project" && orgByName(l.organisation)?.key === key)
    .map((l) => ({ organisation: l.organisation, project: l.project, page: l.sourcePage, amount: l.amount, share: key === "tusu" ? (PRINTED_UNION_PROJECT_SHARE[l.project] ?? null) : null }));
}

function categoriesOf(lines: readonly BudgetLineRow[], year: number, key: OrgKey): CategoryLine[] {
  return lines
    .filter((l) => l.fiscalYear === year && l.view === "category" && l.organisationType !== ALL_ORGANISATIONS && orgByName(l.organisation)?.key === key)
    .map((l) => {
      const { group, item } = categoryParts(l.category);
      return { category: l.category, group, item, amount: l.amount, share: null, page: l.sourcePage };
    });
}

/** The Student Union's projects, largest first. */
export function unionProjects(lines: readonly BudgetLineRow[], year: number): ProjectLine[] {
  return projectsOf(lines, year, "tusu").sort(byAmountDesc);
}

const TABLE_ORDER: readonly OrgKey[] = ["tusc", "film", "music", "dance", "asa", "host", "sad", "tusu"];

/** A table per body that has lines of its own, in reading order. A body with only an organisation line gets that line. */
export function bodyTables(lines: readonly BudgetLineRow[], year: number): BodyTable[] {
  const orgs = organisationLines(lines, year);
  const tables: BodyTable[] = [];
  for (const key of TABLE_ORDER) {
    const line = orgs.find((o) => o.org?.key === key) ?? null;
    const projects = projectsOf(lines, year, key);
    const categories = categoriesOf(lines, year, key);
    if (!line && projects.length === 0 && categories.length === 0) continue;
    const org = line?.org ?? orgs.find((o) => o.org?.key === key)?.org;
    if (!org) continue;
    const stored = lines.find((l) => l.fiscalYear === year && orgByName(l.organisation)?.key === key)?.organisation ?? org.en;
    tables.push({
      key,
      org,
      organisation: stored,
      projects: projects.length > 0 ? projects : null,
      categories: categories.length > 0 ? categories : null,
      line,
    });
  }
  return tables;
}
