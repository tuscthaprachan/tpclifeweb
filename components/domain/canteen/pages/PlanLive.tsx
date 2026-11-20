"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useMemo } from "react";

import { useUrlEcho } from "@/components/hooks/use-url-echo";

import { newSeed } from "@/lib/canteen/random";
import type { Locale } from "@/lib/i18n/config";
import type { CanteenData } from "@/lib/content/types";

import { canteenData } from "../data-client";
import { CanonicalRedirect, useRenderState, useSearch, type ServerRender } from "../live";
import { PLAN_COPY } from "../plan/copy";
import { readPlanMode } from "../plan/mode";
import { planTarget } from "../redirects";
import { t } from "../strings";
import { PlanPage, type GroupHandlers } from "./Plan";

export function LivePlan({ locale, data: given, server }: { locale: Locale; data?: CanteenData; server?: ServerRender }) {
  const router = useRouter();
  const search = useSearch();
  const data = given ?? use(canteenData());
  const key = search.toString();

  const echo = useUrlEcho(key);
  const committed = echo.shown;
  const shown = useMemo(() => new URLSearchParams(committed), [committed]);
  const { now, seed } = useRenderState(committed, server);

  const pending = planTarget(locale, search, data, "pending") !== null;

  useEffect(() => {
    const titles = Object.values(PLAN_COPY).map((copy) => t(copy.title, locale));
    const current = t(PLAN_COPY[readPlanMode(shown)].title, locale);
    const apply = () => {
      const shownTitle = titles.find((title) => document.title.startsWith(title));
      if (shownTitle !== undefined && shownTitle !== current) document.title = current + document.title.slice(shownTitle.length);
    };
    apply();
    const element = document.querySelector("title");
    if (!element) return;
    const observer = new MutationObserver(apply);
    observer.observe(element, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [shown, locale]);

  const group: GroupHandlers = {
    onEdit: (next) => echo.edit(next),
    onShow: (href) => {
      echo.edit(new URLSearchParams(href.split("#")[0]?.split("?")[1] ?? "").toString(), true);
      router.push(href);
    },
  };

  return (
    <>
      <CanonicalRedirect search={key} compute={() => planTarget(locale, search, data, newSeed())} />
      {pending ? (
        <PlanPage locale={locale} data={data} query={{}} now={now} freshSeed="" />
      ) : (
        <PlanPage locale={locale} data={data} query={shown} now={now} freshSeed={seed} group={group} />
      )}
    </>
  );
}
