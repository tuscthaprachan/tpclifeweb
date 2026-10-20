import { pick } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getContentPageBySlug } from "@/lib/sanity/queries";
import { ogImageRoute } from "@/lib/og/route";

const og = ogImageRoute<{ locale: string; slug: string }>(async ({ locale, slug }) => {
  const kicker = UI.welfare[locale];
  const page = await getContentPageBySlug("welfarePage", slug).catch(() => null);
  if (!page) return { locale, title: kicker, tone: "welfare" };
  return { locale, kicker, title: pick(page.title, locale), description: pick(page.summary, locale), tone: "welfare" };
});

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
