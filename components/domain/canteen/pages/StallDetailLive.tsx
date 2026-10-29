"use client";

import { use, useMemo } from "react";

import { indexCanteen } from "@/lib/canteen/derive";
import { localePath, type Locale } from "@/lib/i18n/config";

import { canteenData } from "../data-client";
import { CanonicalRedirect, useRenderState, useSearch } from "../live";
import { tidyTarget } from "../redirects";
import { dataForStall } from "../slim";
import { StallDetail } from "./StallDetail";

export function LiveStallDetail({ locale, slug }: { locale: Locale; slug: string }) {
  const search = useSearch();
  const full = use(canteenData());
  const { now } = useRenderState(search.toString());
  const shown = useMemo(() => {
    const stall = indexCanteen(full).stallBySlug.get(slug);
    return stall ? { stall, data: dataForStall(full, stall._id) } : null;
  }, [full, slug]);
  return (
    <>
      <CanonicalRedirect search={search.toString()} compute={() => tidyTarget(localePath(locale, `/eat/stalls/${slug}`), search)} />
      {shown ? <StallDetail locale={locale} data={shown.data} stall={shown.stall} query={search} now={now} /> : null}
    </>
  );
}
