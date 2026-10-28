import { notFound } from "next/navigation";

import { EAT, eat, t } from "@/components/domain/canteen";
import { indexCanteen } from "@/lib/canteen/derive";
import { pick } from "@/lib/i18n/config";
import { ogImageRoute } from "@/lib/og/route";
import { getCanteenData } from "@/lib/content";

const og = ogImageRoute<{ locale: string; slug: string }>(async ({ locale, slug }) => {
  const generic = { locale, kicker: t(EAT.title, locale), title: t(EAT.stallsTitle, locale), description: t(EAT.stallsIntro, locale), tone: "canteen" } as const;
  let stall;
  try {
    stall = indexCanteen(await getCanteenData()).stallBySlug.get(slug);
  } catch {
    return generic;
  }
  if (!stall) {
    if (slug) notFound();
    return generic;
  }
  return {
    ...generic,
    title: eat.stallFull(locale, stall.number, pick(stall.name, locale)),
    description: stall.wayfinding ? pick(stall.wayfinding, locale) : generic.description,
  };
});

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
