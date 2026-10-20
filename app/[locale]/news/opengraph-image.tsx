import { pick } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { ogImageRoute } from "@/lib/og/route";

const og = ogImageRoute(({ locale }) => ({ locale, title: pick(UI.news, locale), tone: "brand" }));

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
