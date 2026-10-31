import { intOrNull, isMarker, parseCsv } from "@/lib/open-data/parse";
import { OPEN_DATA_BUDGET_VIEWS, type OpenDataBudgetView } from "@/lib/db/schema/content/open-data";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { FISCAL_YEAR_MAX, FISCAL_YEAR_MIN, normaliseAmount } from "./validate";

/**
 * Parsing and checking of the budget line and fund CSV uploads. Pure: it
 * returns every problem found so nothing is imported until the whole file is
 * clean, and the caller writes all rows or none.
 */

export const BUDGET_COLUMNS = ["fiscal_year_be", "view", "organisation_type", "organisation", "project", "category", "amount_thb", "source_page"] as const;
export const FUND_COLUMNS = ["no", "fund_type", "code", "name_th", "annotation"] as const;

export const MAX_CSV_ROWS = 5000;
export const MAX_REPORTED_ERRORS = 100;

export type CsvErrorCode = "required" | "year" | "view" | "amount" | "page" | "number" | "duplicate" | "tooLong";

/** `line` is the line in the file, counting the header as line 1. */
export interface CsvRowError {
  line: number;
  column: string;
  code: CsvErrorCode;
  value: string;
}

export interface CsvHeaderError {
  missing: string[];
  unexpected: string[];
  duplicated: string[];
}

export type CsvFailure =
  | { ok: false; reason: "empty" }
  | { ok: false; reason: "headers"; headers: CsvHeaderError }
  | { ok: false; reason: "rows"; errors: CsvRowError[]; more: number };

export interface BudgetCsvRow {
  line: number;
  fiscalYear: number;
  view: OpenDataBudgetView;
  organisationType: string;
  organisation: string;
  project: string;
  category: string;
  amount: string;
  sourcePage: number | null;
}

export interface FundCsvRow {
  line: number;
  number: number;
  type: string;
  code: string;
  name: string;
  annotation: string | null;
}

const MAX_TEXT = 500;

function headerOf(text: string): string[] {
  const first = text.replace(/^﻿/, "").split(/\r?\n/, 1)[0] ?? "";
  return parseCsvLine(first);
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(field);
      field = "";
    } else field += ch;
  }
  out.push(field.trim());
  return out.map((h) => h.trim());
}

function checkHeaders(text: string, expected: readonly string[]): CsvHeaderError | null {
  const found = headerOf(text);
  const missing = expected.filter((c) => !found.includes(c));
  const unexpected = [...new Set(found.filter((c) => !expected.includes(c)))];
  const duplicated = [...new Set(found.filter((c, i) => found.indexOf(c) !== i))];
  return missing.length > 0 || unexpected.length > 0 || duplicated.length > 0 ? { missing, unexpected, duplicated } : null;
}

function failure(errors: CsvRowError[]): CsvFailure {
  return { ok: false, reason: "rows", errors: errors.slice(0, MAX_REPORTED_ERRORS), more: Math.max(0, errors.length - MAX_REPORTED_ERRORS) };
}

/** Rows of a CSV with the header already checked. Line numbers count the header as 1 (a quoted field with a line break makes them approximate). */
function readRows(text: string, columns: readonly string[]): { rows: Record<string, string>[] } | CsvFailure {
  if (!text.trim()) return { ok: false, reason: "empty" };
  const headers = checkHeaders(text, columns);
  if (headers) return { ok: false, reason: "headers", headers };
  const rows = parseCsv(text);
  if (rows.length === 0) return { ok: false, reason: "empty" };
  return { rows };
}

export function parseBudgetCsv(text: string): { ok: true; rows: BudgetCsvRow[] } | CsvFailure {
  const read = readRows(text, BUDGET_COLUMNS);
  if (!("rows" in read)) return read;
  if (read.rows.length > MAX_CSV_ROWS) return failure([{ line: MAX_CSV_ROWS + 2, column: "", code: "tooLong", value: String(read.rows.length) }]);

  const errors: CsvRowError[] = [];
  const rows: BudgetCsvRow[] = [];
  const seen = new Map<string, number>();
  read.rows.forEach((raw, index) => {
    const line = index + 2;
    const before = errors.length;
    const bad = (column: string, code: CsvErrorCode) => errors.push({ line, column, code, value: (raw[column] ?? "").slice(0, 60) });
    const get = (column: string) => (raw[column] ?? "").trim();

    const year = /^\d{4}$/.test(get("fiscal_year_be")) ? Number.parseInt(get("fiscal_year_be"), 10) : NaN;
    if (!(year >= FISCAL_YEAR_MIN && year <= FISCAL_YEAR_MAX)) bad("fiscal_year_be", "year");
    const view = get("view");
    if (!(OPEN_DATA_BUDGET_VIEWS as readonly string[]).includes(view)) bad("view", "view");
    for (const column of ["organisation_type", "organisation", "project", "category"] as const) {
      if (!get(column)) bad(column, "required");
      else if (get(column).length > MAX_TEXT) bad(column, "tooLong");
    }
    const amount = normaliseAmount(get("amount_thb"));
    if (amount === null) bad("amount_thb", "amount");
    const pageText = get("source_page");
    const page = intOrNull(pageText);
    if (pageText && !isMarker(pageText) && (page === null || page < 0)) bad("source_page", "page");

    if (errors.length > before) return;
    const key = JSON.stringify([year, view, get("organisation"), get("project"), get("category")]);
    if (seen.has(key)) return void bad("organisation", "duplicate");
    seen.set(key, line);
    rows.push({
      line,
      fiscalYear: year,
      view: view as OpenDataBudgetView,
      organisationType: get("organisation_type"),
      organisation: get("organisation"),
      project: get("project"),
      category: get("category"),
      amount: amount!,
      sourcePage: page,
    });
  });
  return errors.length > 0 ? failure(errors) : { ok: true, rows };
}

export function parseFundsCsv(text: string): { ok: true; rows: FundCsvRow[] } | CsvFailure {
  const read = readRows(text, FUND_COLUMNS);
  if (!("rows" in read)) return read;
  if (read.rows.length > MAX_CSV_ROWS) return failure([{ line: MAX_CSV_ROWS + 2, column: "", code: "tooLong", value: String(read.rows.length) }]);

  const errors: CsvRowError[] = [];
  const rows: FundCsvRow[] = [];
  const seen = new Set<number>();
  read.rows.forEach((raw, index) => {
    const line = index + 2;
    const before = errors.length;
    const bad = (column: string, code: CsvErrorCode) => errors.push({ line, column, code, value: (raw[column] ?? "").slice(0, 60) });
    const get = (column: string) => (raw[column] ?? "").trim();

    const number = /^\d{1,6}$/.test(get("no")) ? Number.parseInt(get("no"), 10) : NaN;
    if (!(number >= 1)) bad("no", "number");
    for (const column of ["fund_type", "code", "name_th"] as const) {
      if (!get(column)) bad(column, "required");
      else if (get(column).length > MAX_TEXT) bad(column, "tooLong");
    }
    if (get("annotation").length > 1000) bad("annotation", "tooLong");

    if (errors.length > before) return;
    if (seen.has(number)) return void bad("no", "duplicate");
    seen.add(number);
    rows.push({ line, number, type: get("fund_type"), code: get("code"), name: get("name_th"), annotation: get("annotation") || null });
  });
  return errors.length > 0 ? failure(errors) : { ok: true, rows };
}

const ERROR_KEY = {
  required: "odmCsvRequired",
  year: "odmCsvYear",
  view: "odmCsvView",
  amount: "odmCsvAmount",
  page: "odmCsvPage",
  number: "odmCsvNumber",
  duplicate: "odmCsvDuplicate",
  tooLong: "odmCsvTooLong",
} as const;

/** One row problem in plain words, in the staff member's language. */
export function describeCsvError(error: CsvRowError, locale: Locale): string {
  return a(ERROR_KEY[error.code], locale);
}
