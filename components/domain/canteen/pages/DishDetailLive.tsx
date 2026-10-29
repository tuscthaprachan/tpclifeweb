"use client";

import { use, useMemo } from "react";

import { indexCanteen } from "@/lib/canteen/derive";
import type { Locale } from "@/lib/i18n/config";

import { canteenData } from "../data-client";
import { useSearch } from "../live";
import { dataForDish } from "../slim";
import { DishDetail } from "./DishDetail";

export function LiveDishDetail({ locale, slug }: { locale: Locale; slug: string }) {
  const search = useSearch();
  const full = use(canteenData());
  const shown = useMemo(() => {
    const dish = indexCanteen(full).dishBySlug.get(slug);
    return dish ? { dish, data: dataForDish(full, dish) } : null;
  }, [full, slug]);
  return shown ? <DishDetail locale={locale} data={shown.data} dish={shown.dish} query={search} /> : null;
}
