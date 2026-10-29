import Link from "next/link";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { Stack } from "@/components/ui/Stack";
import { Heading } from "@/components/ui/Heading";
import { Cluster } from "@/components/ui/Cluster";
import { Button } from "@/components/ui/Button";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import type { LostFoundCardItem } from "@/components/domain/lostfound/LostFoundCard";
import { LiveLostFoundResults, LostFoundResults } from "@/components/domain/lostfound/LostFoundResults";
import { localePath, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getLostFoundPage } from "@/lib/content";
import type { LostFoundItem } from "@/lib/content/types";

const REGISTER_LIMIT = 2000;

function toCardItem(item: LostFoundItem): LostFoundCardItem {
  const cover = item.photos?.[0];
  return {
    _id: item._id,
    reference: item.reference,
    kind: item.kind,
    title: item.title,
    slug: item.slug,
    category: item.category,
    status: item.status,
    occurredOn: item.occurredOn,
    photos: cover ? [{ url: cover.url, alt: cover.alt, isDecorative: cover.isDecorative }] : undefined,
  };
}

export async function LostFoundIndex({ locale, filtered }: { locale: Locale; filtered: boolean }) {
  const { items: register } = await getLostFoundPage({}, 1, REGISTER_LIMIT);
  const items = register.map(toCardItem);

  return (
    <Container className="pb-8 pt-2">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.lostAndFound[locale] }]} />

      <Stack space={8}>
        <Stack space={4}>
          <Stack space={2}>
            <Heading level={1}>{UI.lostAndFound[locale]}</Heading>
            <p className="m-0 text-ink-600">{UI.lostAndFoundIntro[locale]}</p>
          </Stack>
          {/* Prominent, since reporting something is the action most readers who cannot find their item actually want. */}
          <Cluster space={3}>
            <Button href={localePath(locale, "/lost-and-found/report")}>{UI.reportLostItem[locale]}</Button>
            <Button href={localePath(locale, "/lost-and-found/found")} variant="secondary">
              {UI.reportFoundItem[locale]}
            </Button>
          </Cluster>
          <Cluster space={4}>
            <Link href={localePath(locale, "/lost-and-found/track")} className="inline-flex min-h-[var(--target-min)] items-center text-action underline">
              {UI.lfpTrackLink[locale]}
            </Link>
            <Link href={localePath(locale, "/lost-and-found/privacy")} className="inline-flex min-h-[var(--target-min)] items-center text-action underline">
              {UI.lfpPrivacyLink[locale]}
            </Link>
          </Cluster>
        </Stack>

        <QueryBoundary filtered={filtered} fallback={<LostFoundResults locale={locale} items={items} query={{}} />}>
          <LiveLostFoundResults locale={locale} items={items} />
        </QueryBoundary>
      </Stack>
    </Container>
  );
}
