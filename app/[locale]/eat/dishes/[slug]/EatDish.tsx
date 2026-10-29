import { notFound } from "next/navigation";

import { EAT, dataForDish, t } from "@/components/domain/canteen";
import { DishDetail, LiveDishDetail } from "@/components/domain/canteen/pages/DishDetail";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container } from "@/components/ui";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { indexCanteen } from "@/lib/canteen/derive";
import { pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getCanteenData } from "@/lib/content";

export async function EatDish({ locale, slug, filtered }: { locale: Locale; slug: string; filtered: boolean }) {
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

      <QueryBoundary filtered={filtered} fallback={<DishDetail locale={locale} data={data} dish={dish} query={{}} />}>
        <LiveDishDetail locale={locale} data={data} dish={dish} />
      </QueryBoundary>
    </Container>
  );
}
