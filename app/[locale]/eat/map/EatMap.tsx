import { EAT, t } from "@/components/domain/canteen";
import { MAP_STRINGS, hasFloorPlan } from "@/components/domain/canteen/map";
import { LiveMapResults, MapResults } from "@/components/domain/canteen/pages/Map";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { Stack } from "@/components/ui/Stack";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getCanteenData } from "@/lib/content";

export async function EatMap({ locale, filtered }: { locale: Locale; filtered: boolean }) {
  const data = await getCanteenData();
  const now = new Date();

  const crumbs = [
    { label: UI.home[locale], path: "/" },
    { label: t(EAT.title, locale), path: "/eat" },
    { label: MAP_STRINGS.pageTitle[locale] },
  ];
  const header = (
    <Stack space={2}>
      <Heading level={1} className="text-3xl">{MAP_STRINGS.pageTitle[locale]}</Heading>
      <p className="m-0 text-ink-600">{MAP_STRINGS.pageIntro[locale]}</p>
    </Stack>
  );

  return (
    <Container className="pb-8 pt-2">
      <Breadcrumbs locale={locale} items={crumbs} />
      <Stack space={hasFloorPlan(data.settings, data.stalls) ? 4 : 6}>
        {header}
        <QueryBoundary filtered={filtered} fallback={<MapResults locale={locale} data={data} query={{}} now={now} />}>
          <LiveMapResults locale={locale} data={data} server={filtered ? { now: now.toISOString() } : undefined} />
        </QueryBoundary>
      </Stack>
    </Container>
  );
}
