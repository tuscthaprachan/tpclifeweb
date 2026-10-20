import { getSiteSettings } from "@/components/layout/site-settings";
import { pick } from "@/lib/i18n/config";
import { ogImageRoute } from "@/lib/og/route";

const og = ogImageRoute(async ({ locale }) => ({ locale, title: pick((await getSiteSettings()).tagline, locale) }));

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
