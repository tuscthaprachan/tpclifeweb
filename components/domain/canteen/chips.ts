/**
 * The removable chips and the one line summary of the active filters.
 * Pure: turns filters into labels and into "what the filters would be
 * without this one", which the UI turns into links.
 */

import { countActiveValues, type CanteenFilters } from "@/lib/canteen/params";
import type { Locale } from "@/lib/i18n/config";
import {
  AVOID_LABEL,
  DIET_SHORT_LABEL,
  FEEL_LABEL,
  OPEN_CHIP_LABEL,
  SPICE_FILTER_LABEL,
  TYPE_LABEL,
  VARIANTS_CHIP_LABEL,
} from "./labels";
import { eat } from "./strings";

export interface FilterChip {
  /** Stable id, for React keys. */
  id: string;
  label: string;
  /** The filters with only this one removed. Pass to `withFilters` to build the removal link. */
  without: CanteenFilters;
}

/** Looks up a stall's display name from its slug. */
export type StallNamer = (slug: string) => string | undefined;

/** One chip per filter value, in the canonical order: diet, budget, type, avoid, spice, feel, stall, open. */
export function activeChips(filters: CanteenFilters, locale: Locale, stallName?: StallNamer): FilterChip[] {
  const chips: FilterChip[] = [];

  for (const value of filters.diet) {
    chips.push({
      id: `diet-${value}`,
      label: DIET_SHORT_LABEL[value][locale],
      without: { ...filters, diet: filters.diet.filter((v) => v !== value) },
    });
  }
  if (filters.max !== undefined) {
    chips.push({
      id: "max",
      label: eat.underBaht(locale, filters.max),
      without: { ...filters, max: undefined, variants: false },
    });
    if (filters.variants) {
      chips.push({ id: "variants", label: VARIANTS_CHIP_LABEL[locale], without: { ...filters, variants: false } });
    }
  }
  for (const value of filters.type) {
    chips.push({
      id: `type-${value}`,
      label: TYPE_LABEL[value][locale],
      without: { ...filters, type: filters.type.filter((v) => v !== value) },
    });
  }
  for (const value of filters.avoid) {
    chips.push({
      id: `avoid-${value}`,
      label: AVOID_LABEL[value][locale],
      without: { ...filters, avoid: filters.avoid.filter((v) => v !== value) },
    });
  }
  if (filters.spice !== undefined) {
    chips.push({
      id: "spice",
      label: SPICE_FILTER_LABEL[String(filters.spice) as "0" | "1" | "2"][locale],
      without: { ...filters, spice: undefined },
    });
  }
  for (const value of filters.feel) {
    chips.push({
      id: `feel-${value}`,
      label: FEEL_LABEL[value][locale],
      without: { ...filters, feel: filters.feel.filter((v) => v !== value) },
    });
  }
  if (filters.stall !== undefined) {
    chips.push({
      id: "stall",
      label: stallName?.(filters.stall) ?? filters.stall,
      without: { ...filters, stall: undefined },
    });
  }
  if (filters.open) {
    chips.push({ id: "open", label: OPEN_CHIP_LABEL[locale], without: { ...filters, open: false } });
  }
  return chips;
}

/** The most chip labels spelled out in the summary line before it counts the rest. */
const SUMMARY_LABELS = 3;

/**
 * "No pork · under 50 baht · Noodles · 3 filters". Joined with a middle dot,
 * never a dash. With more than three, the first three are named and the
 * count says the rest. With none: "Showing everything".
 */
export function filterSummary(filters: CanteenFilters, locale: Locale, stallName?: StallNamer): string {
  const chips = activeChips(filters, locale, stallName).filter((chip) => chip.id !== "variants");
  const count = countActiveValues(filters);
  if (count === 0) return locale === "th" ? "กำลังแสดงทุกเมนู" : "Showing everything";
  const named = chips.slice(0, SUMMARY_LABELS).map((chip) => chip.label);
  return [...named, eat.filterCount(locale, count)].join(" · ");
}
