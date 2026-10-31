/**
 * CSV text for the open data downloads: UTF-8 with a byte order mark (Thai opens correctly in
 * Excel), one header row, CRLF line ends, fields quoted only when they need it.
 */

export interface CsvTable {
  columns: readonly string[];
  rows: readonly (readonly string[])[];
}

export const CSV_BOM = "﻿";

export function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function csvLine(fields: readonly string[]): string {
  return fields.map(csvField).join(",");
}

/** The whole file: byte order mark, header row, then one line per row. */
export function csvText(table: CsvTable): string {
  const lines = [csvLine(table.columns), ...table.rows.map(csvLine)];
  return `${CSV_BOM}${lines.join("\r\n")}\r\n`;
}

export function csvBytes(table: CsvTable): number {
  return new TextEncoder().encode(csvText(table)).length;
}

/** The marker written where the source holds no value, so a cell is never blank. */
export const NOT_STATED = "[not stated]";

export function cell(value: string | number | null | undefined, missing: string = NOT_STATED): string {
  return value === null || value === undefined || value === "" ? missing : String(value);
}
