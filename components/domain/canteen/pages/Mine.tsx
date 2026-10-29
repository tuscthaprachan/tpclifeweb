"use client";

import { serialise } from "@/lib/canteen/params";
import type { Locale } from "@/lib/i18n/config";

import { MineClient, type MineDish } from "../budget/MineClient";
import { useSearch } from "../live";
import { readFilters } from "../query";

interface LiveMineProps {
  locale: Locale;
  dishes: Record<string, MineDish>;
  stallNames: Record<string, { th: string; en: string }>;
}

export function LiveMine({ locale, dishes, stallNames }: LiveMineProps) {
  return <MineClient locale={locale} dishes={dishes} stallNames={stallNames} currentQuery={serialise(readFilters(useSearch()))} />;
}
