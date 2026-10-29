"use client";

import { useRouter } from "next/navigation";
import { use, useMemo, useState } from "react";

import { newSeed } from "@/lib/canteen/random";
import type { Locale } from "@/lib/i18n/config";
import type { CanteenData } from "@/lib/content/types";

import { canteenData } from "../data-client";
import { CanonicalRedirect, useRenderState, useSearch, type ServerRender } from "../live";
import { planTarget } from "../redirects";
import { PlanPage, type GroupHandlers } from "./Plan";

export function LivePlan({ locale, data: given, server }: { locale: Locale; data?: CanteenData; server?: ServerRender }) {
  const router = useRouter();
  const search = useSearch();
  const data = given ?? use(canteenData());
  const key = search.toString();

  const [committed, setCommitted] = useState(key);
  const [seen, setSeen] = useState(key);
  const [edit, setEdit] = useState<string | null>(null);
  if (key !== seen) {
    setSeen(key);
    if (key === edit) setEdit(null);
    else setCommitted(key);
  }
  const shown = useMemo(() => new URLSearchParams(committed), [committed]);
  const { now, seed } = useRenderState(committed, server);

  const pending = planTarget(locale, search, data, "pending") !== null;

  const group: GroupHandlers = {
    onEdit: setEdit,
    onShow: (href) => {
      setCommitted(new URLSearchParams(href.split("#")[0]?.split("?")[1] ?? "").toString());
      setEdit(null);
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
