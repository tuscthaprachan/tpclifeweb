import { csvHeaders, csvText, getDatasetTable, isDatasetKey } from "@/lib/open-data/datasets";

/**
 * The dataset downloads: /about/open-data/tusc/data/members.csv and the others. The path has a file
 * extension, so proxy.ts does not add a locale prefix to it and this route sits outside [locale].
 */
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const key = file.replace(/\.csv$/, "");
  if (!file.endsWith(".csv") || !isDatasetKey(key)) return new Response("Not found", { status: 404 });
  const table = await getDatasetTable(key);
  return new Response(csvText(table), { headers: csvHeaders(`${key}.csv`) });
}
