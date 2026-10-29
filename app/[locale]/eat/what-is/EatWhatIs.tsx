import { EAT, dataForCanonicals, t } from "@/components/domain/canteen";
import { EXTRAS } from "@/components/domain/canteen/extras";
import { LiveWhatIsList, WhatIsList } from "@/components/domain/canteen/pages/WhatIs";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, EmptyState, Heading, Stack } from "@/components/ui";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getCanteenData } from "@/lib/content";

export async function EatWhatIs({ locale, filtered }: { locale: Locale; filtered: boolean }) {
  const full = await getCanteenData();
  const data = dataForCanonicals(full);

  return (
    <Container className="pb-8 pt-2">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: t(EAT.title, locale), path: "/eat" },
          { label: EXTRAS.whatIsTitle[locale] },
        ]}
      />
      <Stack space={8}>
        <Stack space={2}>
          <Heading level={1} className="text-3xl">{EXTRAS.whatIsTitle[locale]}</Heading>
          <p className="m-0 max-w-prose text-ink-600">{EXTRAS.whatIsIntro[locale]}</p>
        </Stack>

        {data.canonicals.length === 0 ? (
          <EmptyState title={EXTRAS.whatIsNoData[locale]}>{EXTRAS.whatIsNoDataBody[locale]}</EmptyState>
        ) : (
          <QueryBoundary filtered={filtered} fallback={<WhatIsList locale={locale} data={data} query={{}} />}>
            <LiveWhatIsList locale={locale} data={data} />
          </QueryBoundary>
        )}
      </Stack>
    </Container>
  );
}
