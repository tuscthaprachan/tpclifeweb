import { EAT, t } from "@/components/domain/canteen";
import { MAP_STRINGS } from "@/components/domain/canteen/map";
import { ogImageRoute } from "@/lib/og/route";

const og = ogImageRoute(({ locale }) => ({
  locale,
  kicker: t(EAT.title, locale),
  title: MAP_STRINGS.pageTitle[locale],
  description: MAP_STRINGS.pageIntro[locale],
  tone: "canteen",
}));

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
