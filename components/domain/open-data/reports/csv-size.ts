import "server-only";

import { statSync } from "node:fs";
import { join } from "node:path";
import type { Locale } from "@/lib/i18n/config";
import { formatBytes } from "../documents";

const TABLES = join(process.cwd(), "data", "open-data", "tusc", "tables");

/** The size of a dataset's source table, as a download list writes it. Falls back to the smallest size when the file cannot be read. */
export function csvSize(file: "canteen-recommendations.csv" | "canteen-survey.csv", locale: Locale): string {
  try {
    return formatBytes(statSync(join(TABLES, file)).size, locale);
  } catch {
    return formatBytes(1, locale);
  }
}
