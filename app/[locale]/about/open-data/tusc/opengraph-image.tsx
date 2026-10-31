import { UI } from "@/lib/i18n/strings";
import { ogImageRoute } from "@/lib/og/route";

const og = ogImageRoute(({ locale }) => ({
  locale,
  kicker: UI.odOpenData[locale],
  title: UI.odTuscBody[locale],
  description: UI.odTuscSummary[locale],
  tone: "governance",
}));

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
