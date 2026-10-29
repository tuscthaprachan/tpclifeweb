import { notFound } from "next/navigation";

import { EAT, dataForCanonicals, t } from "@/components/domain/canteen";
import { EXTRAS } from "@/components/domain/canteen/extras";
import { LiveWhatIsDetail, WhatIsDetail } from "@/components/domain/canteen/pages/WhatIs";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container } from "@/components/ui";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { indexCanteen } from "@/lib/canteen/derive";
import { pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getCanteenData } from "@/lib/content";

export async function EatWhatIsDish({ locale, slug, filtered }: { locale: Locale; slug: string; filtered: boolean }) {
  const full = await getCanteenData();
  const canonical = indexCanteen(full).canonicalBySlug.get(slug);
  if (!canonical) notFound();
  const data = dataForCanonicals(full, canonical._id);

  return (
    <Container className="pb-8 pt-2">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: t(EAT.title, locale), path: "/eat" },
          { label: EXTRAS.whatIsTitle[locale], path: "/eat/what-is" },
          { label: pick(canonical.name, locale) },
        ]}
      />

      <QueryBoundary filtered={filtered} fallback={<WhatIsDetail locale={locale} data={data} canonical={canonical} query={{}} />}>
        <LiveWhatIsDetail locale={locale} data={data} canonical={canonical} />
      </QueryBoundary>
    </Container>
  );
}
