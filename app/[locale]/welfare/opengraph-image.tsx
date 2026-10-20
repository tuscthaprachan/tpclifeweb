import { UI } from "@/lib/i18n/strings";
import { ogImageRoute } from "@/lib/og/route";

const og = ogImageRoute(({ locale }) => ({ locale, title: UI.welfare[locale], tone: "welfare" }));

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
