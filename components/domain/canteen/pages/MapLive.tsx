"use client";

import { use } from "react";

import { localePath, type Locale } from "@/lib/i18n/config";

import { canteenData } from "../data-client";
import { CanonicalRedirect, useRenderState, useSearch } from "../live";
import { tidyTarget } from "../redirects";
import { MAP_ROUTE, MapResults } from "./Map";

export function LiveMapResults({ locale }: { locale: Locale }) {
  const search = useSearch();
  const data = use(canteenData());
  const { now } = useRenderState(search.toString());
  return (
    <>
      <CanonicalRedirect search={search.toString()} compute={() => tidyTarget(localePath(locale, MAP_ROUTE), search)} />
      <MapResults locale={locale} data={data} query={search} now={now} />
    </>
  );
}
