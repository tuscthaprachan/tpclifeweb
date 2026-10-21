import { EAT, t } from "@/components/domain/canteen";
import { ogImageRoute } from "@/lib/og/route";

const og = ogImageRoute(({ locale }) => ({
  locale,
  kicker: t(EAT.title, locale),
  title: t(EAT.planTitle, locale),
  description: t(EAT.planIntro, locale),
  tone: "canteen",
}));

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
