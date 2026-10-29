import { EAT, t } from "@/components/domain/canteen";
import { PickResults } from "@/components/domain/canteen/pages/Pick";
import { LivePickResults } from "@/components/domain/canteen/pages/PickLive";
import { PreloadCanteenData } from "@/components/domain/canteen/pages/Preload";
import { PICK } from "@/components/domain/canteen/pick";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, EmptyState, Heading, Stack } from "@/components/ui";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { newSeed } from "@/lib/canteen/random";
import type { RawParams } from "@/lib/canteen/params";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getCanteenData } from "@/lib/content";

export async function EatPick({ locale, filtered, query = {} }: { locale: Locale; filtered: boolean; query?: RawParams }) {
  const data = await getCanteenData();
  const now = new Date();

  const crumbs = (
    <Breadcrumbs
      locale={locale}
      items={[
        { label: UI.home[locale], path: "/" },
        { label: t(EAT.title, locale), path: "/eat" },
        { label: PICK.title[locale] },
      ]}
    />
  );
  const header = (
    <Stack space={2}>
      <Heading level={1} className="text-3xl">{PICK.title[locale]}</Heading>
    </Stack>
  );

  if (data.dishes.length === 0) {
    return (
      <Container className="pb-8 pt-2">
        {crumbs}
        <Stack space={8}>
          {header}
          <EmptyState title={t(EAT.noDataTitle, locale)}>{t(EAT.noDataBody, locale)}</EmptyState>
        </Stack>
      </Container>
    );
  }

  return (
    <Container className="pb-8 pt-2">
      {crumbs}
      <Stack space={8}>
        {header}
        <PreloadCanteenData />
        <QueryBoundary filtered={filtered} fallback={<PickResults locale={locale} data={data} query={{}} now={now} nextSeed="" />}>
          {filtered ? <PickResults locale={locale} data={data} query={query} now={now} nextSeed={newSeed()} /> : <LivePickResults locale={locale} />}
        </QueryBoundary>
      </Stack>
    </Container>
  );
}
