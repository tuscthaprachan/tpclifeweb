import { EAT, t } from "@/components/domain/canteen";
import { EXTRAS } from "@/components/domain/canteen/extras";
import { indexCanteen } from "@/lib/canteen/derive";
import { pick } from "@/lib/i18n/config";
import { ogImageRoute } from "@/lib/og/route";
import { getCanteenData } from "@/lib/content";

const og = ogImageRoute<{ locale: string; slug: string }>(async ({ locale, slug }) => {
  const generic = { locale, kicker: t(EAT.title, locale), title: EXTRAS.whatIsTitle[locale], description: EXTRAS.whatIsIntro[locale], tone: "canteen" } as const;
  try {
    const canonical = indexCanteen(await getCanteenData()).canonicalBySlug.get(slug);
    if (!canonical) return generic;
    return { ...generic, title: pick(canonical.name, locale), description: pick(canonical.explainer, locale) || generic.description };
  } catch {
    return generic;
  }
});

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
