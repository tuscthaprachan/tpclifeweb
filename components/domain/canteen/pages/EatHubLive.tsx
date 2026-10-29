"use client";

import { use } from "react";

import type { Locale } from "@/lib/i18n/config";

import { canteenData } from "../data-client";
import { useRenderState, useSearch } from "../live";
import { EatHubResults } from "./EatHub";

export function LiveEatHubResults({ locale }: { locale: Locale }) {
  const search = useSearch();
  const data = use(canteenData());
  const { now } = useRenderState(search.toString());
  return <EatHubResults locale={locale} data={data} query={search} now={now} />;
}
