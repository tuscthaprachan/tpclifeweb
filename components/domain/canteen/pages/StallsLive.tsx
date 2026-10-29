"use client";

import { use } from "react";

import { localePath, type Locale } from "@/lib/i18n/config";

import { canteenData } from "../data-client";
import { CanonicalRedirect, useRenderState, useSearch } from "../live";
import { tidyTarget } from "../redirects";
import { STALLS_ROUTE, StallsResults } from "./Stalls";

export function LiveStallsResults({ locale }: { locale: Locale }) {
  const search = useSearch();
  const data = use(canteenData());
  const { now } = useRenderState(search.toString());
  return (
    <>
      <CanonicalRedirect search={search.toString()} compute={() => tidyTarget(localePath(locale, STALLS_ROUTE), search)} />
      <StallsResults locale={locale} data={data} query={search} now={now} />
    </>
  );
}
