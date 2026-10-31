import { DOWNLOAD_FILE } from "@/components/domain/open-data/budget/downloads";
import { getBudgetFiles } from "@/components/domain/open-data/budget/data";
import { csvHeaders, csvText } from "@/lib/open-data/datasets";

/** The CSV behind each figure of a fiscal year's bulletin: /about/open-data/tusc/budget/2569/figure-1.csv. */
export async function GET(_request: Request, { params }: { params: Promise<{ fiscalYear: string; file: string }> }) {
  const { fiscalYear, file } = await params;
  if (!/^\d{4}$/.test(fiscalYear) || !DOWNLOAD_FILE.test(file)) return new Response("Not found", { status: 404 });
  const table = (await getBudgetFiles(Number(fiscalYear)))[file];
  if (!table) return new Response("Not found", { status: 404 });
  return new Response(csvText(table), { headers: csvHeaders(`budget-${fiscalYear}-${file}`) });
}
