import { pick } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getFormBySlug } from "@/lib/sanity/queries";
import { ogImageRoute } from "@/lib/og/route";

const og = ogImageRoute<{ locale: string; slug: string }>(async ({ locale, slug }) => {
  const kicker = UI.forms[locale];
  const form = await getFormBySlug(slug).catch(() => null);
  if (!form) return { locale, title: kicker, description: UI.formsIntro[locale] };
  return { locale, kicker, title: pick(form.title, locale), description: pick(form.purpose, locale) };
});

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
