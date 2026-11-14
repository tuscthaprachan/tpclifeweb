/**
 * CSV for Excel: UTF-8 with a byte order mark so Thai opens correctly, CRLF
 * rows, and every cell quoted only when it needs to be. Text that a
 * spreadsheet would run as a formula is prefixed with an apostrophe.
 */

export const CSV_BOM = "﻿";

const FORMULA_START = /^[=+\-@\t\r]/;

/** A text cell made safe against spreadsheet formulas. Not for numbers, dates or ids. */
export function safeCell(value: string): string {
  return FORMULA_START.test(value) ? `'${value}` : value;
}

/** One cell, quoted when it holds a comma, quote, newline or edge space. */
export function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]|^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvRow(cells: readonly (string | number | null | undefined)[]): string {
  return cells.map(csvCell).join(",");
}

/** The whole file: BOM, header, rows, each ending in CRLF. */
export function toCsv(header: readonly string[], rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  return `${CSV_BOM}${[header, ...rows].map(csvRow).join("\r\n")}\r\n`;
}
