import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Heading } from "@/components/ui/Heading";
import { Stack } from "@/components/ui/Stack";
import type { RawParams } from "@/lib/canteen/params";
import type { Locale } from "@/lib/i18n/config";
import type { CanteenData } from "@/lib/content/types";
import { UI } from "@/lib/i18n/strings";

import { PLAN_COPY } from "../plan/copy";
import { GroupMode } from "../plan/GroupMode";
import { MealMode } from "../plan/MealMode";
import { readPlanMode } from "../plan/mode";
import { PlanModeSwitch } from "../plan/PlanModeSwitch";
import { WeekMode } from "../plan/WeekMode";
import { readFilters } from "../query";
import { EAT, t } from "../strings";

export interface GroupHandlers {
  onEdit: (search: string) => void;
  onShow: (href: string) => void;
}

interface PlanProps {
  locale: Locale;
  data: CanteenData;
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
