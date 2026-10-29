import { notFound } from "next/navigation";

import { EAT, dataForDish, t } from "@/components/domain/canteen";
import { DishDetail } from "@/components/domain/canteen/pages/DishDetail";
import { LiveDishDetail } from "@/components/domain/canteen/pages/DishDetailLive";
import { PreloadCanteenData } from "@/components/domain/canteen/pages/Preload";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container } from "@/components/ui";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { indexCanteen } from "@/lib/canteen/derive";
import type { RawParams } from "@/lib/canteen/params";
import { pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getCanteenData } from "@/lib/content";

export async function EatDish({ locale, slug, filtered, query = {} }: { locale: Locale; slug: string; filtered: boolean; query?: RawParams }) {
  const full = await getCanteenData();
  const dish = indexCanteen(full).dishBySlug.get(slug);
  if (!dish) notFound();
  const data = dataForDish(full, dish);

  return (
    <Container className="pb-8 pt-2">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: t(EAT.title, locale), path: "/eat" },
          { label: t(EAT.dishesTitle, locale), path: "/eat/dishes" },
          { label: pick(dish.name, locale) },
        ]}
      />

      <PreloadCanteenData />
      <QueryBoundary filtered={filtered} fallback={<DishDetail locale={locale} data={data} dish={dish} query={{}} />}>
        {filtered ? <DishDetail locale={locale} data={data} dish={dish} query={query} /> : <LiveDishDetail locale={locale} slug={slug} />}
      </QueryBoundary>
    </Container>
  );
}
