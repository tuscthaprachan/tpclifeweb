import { z } from "zod";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

/**
 * Helpers for forms with repeatable rows (contacts, opening hours, stops,
 * menu items). Shared by the directory, places, shuttle and site settings
 * forms. Server-safe: the client half is RowList.tsx.
 */

/** True for a row (or plain value) with nothing filled in. `ignore` names keys that always carry a value, like a drop-down default. */
export function isBlankRow(value: unknown, ignore: readonly string[] = []): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.every((v) => isBlankRow(v));
  if (typeof value === "object") return Object.entries(value).every(([k, v]) => ignore.includes(k) || isBlankRow(v));
  return false;
}

export interface KeptRow<T> {
  value: T;
  /** Position of the row in the posted form, so an error lands on the right row even after blank rows are dropped. */
  index: number;
}

export interface RowsOptions<T> {
  max?: number;
  ignore?: readonly string[];
  /** Checks across rows. Report with `add(index, field, message)`. */
  after?: (rows: KeptRow<T>[], add: (index: number, field: string, message: string) => void) => void;
}

/**
 * Parses a list of rows with `row`. Blank rows are dropped; errors are
 * reported at `<name>.<posted index>.<field>`, matching the form's controls.
 */
export function rowsOf<S extends z.ZodType>(row: S, { max = 100, ignore = [], after }: RowsOptions<z.output<S>> = {}) {
  return z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.unknown())).transform((list, ctx): z.output<S>[] => {
    const kept: KeptRow<z.output<S>>[] = [];
    let failed = false;
    list.forEach((item, index) => {
      if (isBlankRow(item, ignore)) return;
      const parsed = row.safeParse(item);
      if (!parsed.success) {
        failed = true;
        for (const issue of parsed.error.issues) ctx.addIssue({ code: "custom", path: [index, ...issue.path], message: issue.message });
        return;
      }
      kept.push({ value: parsed.data, index });
    });
    if (!failed && after) after(kept, (index, field, message) => ctx.addIssue({ code: "custom", path: [index, field], message }));
    return kept.slice(0, max).map((k) => k.value);
  }) as z.ZodType<z.output<S>[]>;
}

const TIME = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;

/** "8:30" or "08:30:00" to "08:30"; null when it is not a time of day. */
export function normaliseTime(value: string): string | null {
  const m = TIME.exec(value.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Field schemas the shared fieldKit lacks: times, weekdays, decimals. */
export function extraKit(locale: Locale) {
  const L = (key: AdminKey, values?: Record<string, string | number>) => a(key, locale, values);
  const lower = (label: string) => (locale === "en" && !/^[A-Z]{2}/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label);

  return {
    /** "HH:mm". Required unless told otherwise; null when empty and optional. */
    time(label: string, { required = true }: { required?: boolean } = {}) {
      return z.preprocess(text, z.string()).transform((value, ctx): string | null => {
        if (!value) {
          if (required) ctx.addIssue({ code: "custom", message: L("errFieldRequired", { field: lower(label) }) });
          return null;
        }
        const time = normaliseTime(value);
        if (!time) ctx.addIssue({ code: "custom", message: L("dirErrTime", { field: lower(label) }) });
        return time;
      }) as z.ZodType<string | null>;
    },

    /** Weekdays posted as repeated "0".."6" values (0 is Sunday). Sorted, no repeats. */
    days({ required = true }: { required?: boolean } = {}) {
      return z
        .preprocess((v) => (Array.isArray(v) ? v : v === undefined || v === "" ? [] : [v]), z.array(z.unknown()))
        .transform((values, ctx): number[] => {
          const days = [...new Set(values.map((v) => (typeof v === "string" && /^[0-6]$/.test(v) ? Number(v) : -1)))].sort((x, y) => x - y);
          if (days.includes(-1)) ctx.addIssue({ code: "custom", message: L("dirErrDays") });
          else if (required && days.length === 0) ctx.addIssue({ code: "custom", message: L("dirErrDays") });
          return days.filter((d) => d >= 0);
        }) as z.ZodType<number[]>;
    },

    /** A decimal such as a latitude; null when empty. */
    decimal(label: string, { min, max }: { min: number; max: number }) {
      return z.preprocess(text, z.string()).transform((value, ctx): number | null => {
        if (!value) return null;
        const n = /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : NaN;
        if (!Number.isFinite(n)) {
          ctx.addIssue({ code: "custom", message: L("dirErrCoordinate", { field: lower(label) }) });
          return null;
        }
        if (n < min || n > max) ctx.addIssue({ code: "custom", message: L("dirErrCoordinateRange", { field: lower(label), min, max }) });
        return n;
      }) as z.ZodType<number | null>;
    },
  };
}

/** Both coordinates or neither. Add the issue to the longitude's field. */
export function coordinatePairIssue(lat: number | null, lng: number | null): boolean {
  return (lat === null) !== (lng === null);
}
