import { EAT, t } from "@/components/domain/canteen";
import { EatHubResults } from "@/components/domain/canteen/pages/EatHub";
import { LiveEatHubResults } from "@/components/domain/canteen/pages/EatHubLive";
import { PreloadCanteenData } from "@/components/domain/canteen/pages/Preload";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, EmptyState, Heading, Stack } from "@/components/ui";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import type { RawParams } from "@/lib/canteen/params";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getCanteenData } from "@/lib/content";

export async function EatHub({ locale, filtered, query = {} }: { locale: Locale; filtered: boolean; query?: RawParams }) {
  const data = await getCanteenData();
  const now = new Date();

  const breadcrumbs = (
    <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: t(EAT.title, locale) }]} />
  );

  const header = (
    <Stack space={2}>
      <Heading level={1} className="text-3xl">{t(EAT.title, locale)}</Heading>
      <p className="m-0 text-ink-600">{t(EAT.intro, locale)}</p>
    </Stack>
  );

  if (data.dishes.length === 0) {
    return (
      <Container className="pb-8 pt-2">
        {breadcrumbs}
        <Stack space={8}>
          {header}
          <EmptyState title={t(EAT.noDataTitle, locale)}>{t(EAT.noDataBody, locale)}</EmptyState>
        </Stack>
      </Container>
    );
  }

  return (
    <Container className="pb-8 pt-2">
      {breadcrumbs}
      <Stack space={8}>
        {header}
        <PreloadCanteenData />
        <QueryBoundary filtered={filtered} fallback={<EatHubResults locale={locale} data={data} query={{}} now={now} />}>
          {filtered ? <EatHubResults locale={locale} data={data} query={query} now={now} /> : <LiveEatHubResults locale={locale} />}
        </QueryBoundary>
      </Stack>
    </Container>
  );
}
