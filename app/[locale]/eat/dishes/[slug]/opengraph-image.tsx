import { EAT, eat, t } from "@/components/domain/canteen";
import { indexCanteen, stallOf } from "@/lib/canteen/derive";
import { pick } from "@/lib/i18n/config";
import { ogImageRoute } from "@/lib/og/route";
import { getCanteenData } from "@/lib/sanity/queries";

const og = ogImageRoute<{ locale: string; slug: string }>(async ({ locale, slug }) => {
  const generic = { locale, kicker: t(EAT.title, locale), title: t(EAT.dishesTitle, locale), description: t(EAT.dishesIntro, locale), tone: "canteen" } as const;
  try {
    const data = await getCanteenData();
    const dish = indexCanteen(data).dishBySlug.get(slug);
    if (!dish) return generic;
    const stall = stallOf(data, dish);
    return {
      ...generic,
      title: pick(dish.name, locale),
      description: stall ? `${eat.baht(locale, dish.price)} · ${eat.stallFull(locale, stall.number, pick(stall.name, locale))}` : eat.baht(locale, dish.price),
    };
  } catch {
    return generic;
  }
});

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
