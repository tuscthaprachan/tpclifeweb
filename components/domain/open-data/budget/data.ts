import "server-only";

import type { CsvTable } from "@/lib/open-data/csv";
import { getOpenDataBudgetLines } from "@/lib/open-data/read";
import { budgetDownloads } from "./downloads";
import { allYears, bulletinYears } from "./model";

export async function getBudgetFiles(year: number): Promise<Record<string, CsvTable>> {
  const lines = await getOpenDataBudgetLines();
  const years = allYears(lines);
  const previous = years.filter((y) => y < year)[0] ?? year - 1;
  return budgetDownloads(lines, year, previous);
}

export async function getBudgetBulletinYears(): Promise<number[]> {
  return bulletinYears(await getOpenDataBudgetLines());
}
