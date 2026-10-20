import { EAT, t } from "@/components/domain/canteen";
import { ogImageRoute } from "@/lib/og/route";

const og = ogImageRoute(({ locale }) => ({
  locale,
  title: t(EAT.title, locale),
  description: t(EAT.intro, locale),
  tone: "canteen",
}));

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
