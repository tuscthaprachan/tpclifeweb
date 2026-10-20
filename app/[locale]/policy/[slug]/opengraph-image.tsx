import { pick } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { ogImageRoute } from "@/lib/og/route";
import { getPolicyBySlug } from "@/lib/sanity/queries";

const og = ogImageRoute<{ locale: string; slug: string }>(async ({ locale, slug }) => {
  const policy = await getPolicyBySlug(slug).catch(() => null);
  const kicker = pick(UI.policyTracker, locale);
  if (!policy) return { locale, title: kicker, description: pick(UI.policyIntro, locale), tone: "governance" };
  return { locale, kicker, title: pick(policy.title, locale), description: pick(policy.summary, locale), tone: "governance" };
});

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
