import { notFound } from "next/navigation";

import { EAT, dataForStall, t } from "@/components/domain/canteen";
import { StallDetail } from "@/components/domain/canteen/pages/StallDetail";
import { LiveStallDetail } from "@/components/domain/canteen/pages/StallDetailLive";
import { PreloadCanteenData } from "@/components/domain/canteen/pages/Preload";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container } from "@/components/ui";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { indexCanteen } from "@/lib/canteen/derive";
import type { RawParams } from "@/lib/canteen/params";
import { pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getCanteenData } from "@/lib/content";

export async function EatStall({ locale, slug, filtered, query = {} }: { locale: Locale; slug: string; filtered: boolean; query?: RawParams }) {
  const full = await getCanteenData();
  const stall = indexCanteen(full).stallBySlug.get(slug);
  if (!stall) notFound();
  const data = dataForStall(full, stall._id);
  const now = new Date();

  return (
    <Container className="pb-8 pt-2">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: t(EAT.title, locale), path: "/eat" },
          { label: t(EAT.stallsTitle, locale), path: "/eat/stalls" },
          { label: pick(stall.name, locale) },
        ]}
      />

      <PreloadCanteenData />
      <QueryBoundary filtered={filtered} fallback={<StallDetail locale={locale} data={data} stall={stall} query={{}} now={now} />}>
        {filtered ? <StallDetail locale={locale} data={data} stall={stall} query={query} now={now} /> : <LiveStallDetail locale={locale} slug={slug} />}
      </QueryBoundary>
    </Container>
  );
}
