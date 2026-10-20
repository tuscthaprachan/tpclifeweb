import { getNewsPostBySlug } from "@/components/domain/news";
import { pick } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { ogImageRoute } from "@/lib/og/route";

const og = ogImageRoute<{ locale: string; slug: string }>(async ({ locale, slug }) => {
  const post = await getNewsPostBySlug(slug).catch(() => null);
  const kicker = pick(UI.news, locale);
  if (!post) return { locale, title: kicker, tone: "brand" };
  return { locale, kicker, title: pick(post.title, locale), description: pick(post.summary, locale), tone: "brand" };
});

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
