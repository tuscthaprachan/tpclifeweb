import { categoryLabel, kindLabel } from "@/components/domain/lostfound";
import { pick } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { ogImageRoute } from "@/lib/og/route";
import { getLostFoundItemBySlug } from "@/lib/content";

const og = ogImageRoute<{ locale: string; slug: string }>(async ({ locale, slug }) => {
  const item = await getLostFoundItemBySlug(slug).catch(() => null);
  const section = pick(UI.lostAndFound, locale);
  if (!item) return { locale, title: section, description: pick(UI.lostAndFoundIntro, locale), tone: "brand" };
  return {
    locale,
    kicker: `${section} · ${kindLabel(item.kind, locale)}`,
    title: pick(item.title, locale),
    description: categoryLabel(item.category, locale),
    tone: "brand",
  };
});

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
