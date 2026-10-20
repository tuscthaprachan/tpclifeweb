import { EAT, t } from "@/components/domain/canteen";
import { PICK } from "@/components/domain/canteen/pick/strings";
import { ogImageRoute } from "@/lib/og/route";

const og = ogImageRoute(({ locale }) => ({
  locale,
  kicker: t(EAT.title, locale),
  title: PICK.title[locale],
  description: PICK.intro[locale],
  tone: "canteen",
}));

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
