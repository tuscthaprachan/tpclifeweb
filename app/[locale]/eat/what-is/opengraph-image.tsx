import { EAT, t } from "@/components/domain/canteen";
import { EXTRAS } from "@/components/domain/canteen/extras";
import { ogImageRoute } from "@/lib/og/route";

const og = ogImageRoute(({ locale }) => ({
  locale,
  kicker: t(EAT.title, locale),
  title: EXTRAS.whatIsTitle[locale],
  description: EXTRAS.whatIsIntro[locale],
  tone: "canteen",
}));

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
