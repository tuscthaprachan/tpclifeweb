"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Heading } from "@/components/ui/Heading";
import { Stack } from "@/components/ui/Stack";
import { newSeed } from "@/lib/canteen/random";
import type { RawParams } from "@/lib/canteen/params";
import type { Locale } from "@/lib/i18n/config";
import type { CanteenData } from "@/lib/content/types";
import { UI } from "@/lib/i18n/strings";

import { CanonicalRedirect, useRenderState, useSearch, type ServerRender } from "../live";
import { PLAN_COPY } from "../plan/copy";
import { GroupMode } from "../plan/GroupMode";
import { MealMode } from "../plan/MealMode";
import { readPlanMode } from "../plan/mode";
import { PlanModeSwitch } from "../plan/PlanModeSwitch";
import { WeekMode } from "../plan/WeekMode";
import { readFilters } from "../query";
import { planTarget } from "../redirects";
import { EAT, t } from "../strings";

interface GroupHandlers {
  onEdit: (search: string) => void;
  onShow: (href: string) => void;
}

interface PlanProps {
  locale: Locale;
  data: CanteenData;
}

export function LivePlan({ locale, data, server }: PlanProps & { server?: ServerRender }) {
  const router = useRouter();
  const search = useSearch();
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

export function PlanPage({
  locale,
  data,
  query,
  now,
  freshSeed,
  group,
}: PlanProps & {
  query: RawParams;
  now: Date;
  /** A fresh seed for the links that start a random pick. */
  freshSeed: string;
  /** What the group builder needs. Group mode only, so the prerendered page leaves it out. */
  group?: GroupHandlers;
}) {
  const mode = readPlanMode(query);
  const copy = PLAN_COPY[mode];

  return (
    <>
      <div className="no-print">
        <Breadcrumbs
          locale={locale}
          items={[
            { label: UI.home[locale], path: "/" },
            { label: t(EAT.title, locale), path: "/eat" },
            { label: t(copy.title, locale) },
          ]}
        />
      </div>
      <Stack space={6}>
        <div className="no-print">
          <Stack space={4}>
            <Stack space={2}>
              <Heading level={1} className="text-3xl">{t(copy.title, locale)}</Heading>
              <p className="m-0 text-ink-600">{t(copy.intro, locale)}</p>
            </Stack>
            <PlanModeSwitch locale={locale} current={mode} filters={readFilters(query)} />
          </Stack>
        </div>
        {mode === "week" ? (
          <WeekMode locale={locale} data={data} query={query} now={now} />
        ) : mode === "group" ? (
          <GroupMode
            locale={locale}
            data={data}
            query={query}
            now={now}
            freshSeed={freshSeed}
            onEdit={group?.onEdit ?? noop}
            onShow={group?.onShow ?? noop}
          />
        ) : (
          <MealMode locale={locale} data={data} query={query} now={now} />
        )}
      </Stack>
    </>
  );
}

function noop() {}
