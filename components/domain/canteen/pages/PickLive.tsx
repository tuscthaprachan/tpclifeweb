"use client";

import { use } from "react";

import { newSeed } from "@/lib/canteen/random";
import type { Locale } from "@/lib/i18n/config";

import { canteenData } from "../data-client";
import { CanonicalRedirect, useRenderState, useSearch } from "../live";
import { pickTarget } from "../redirects";
import { PickResults } from "./Pick";

export function LivePickResults({ locale }: { locale: Locale }) {
  const search = useSearch();
  const data = use(canteenData());
  const { now, seed } = useRenderState(search.toString());
  return (
    <>
      <CanonicalRedirect search={search.toString()} compute={() => pickTarget(locale, search, newSeed())} />
      <PickResults locale={locale} data={data} query={search} now={now} nextSeed={seed} />
    </>
  );
}
