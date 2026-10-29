"use client";

import { use } from "react";

import { localePath, type Locale } from "@/lib/i18n/config";

import { canteenData } from "../data-client";
import { FocusOnHash } from "../FocusOnHash";
import { CanonicalRedirect, useRenderState, useSearch } from "../live";
import { tidyTarget } from "../redirects";
import { DISHES_ROUTE, DishesResults } from "./Dishes";

export function LiveDishesResults({ locale }: { locale: Locale }) {
  const search = useSearch();
  const data = use(canteenData());
  const { now } = useRenderState(search.toString());
  return (
    <>
      <CanonicalRedirect search={search.toString()} compute={() => tidyTarget(localePath(locale, DISHES_ROUTE), search)} />
      <FocusOnHash />
      <DishesResults locale={locale} data={data} query={search} now={now} />
    </>
  );
}
