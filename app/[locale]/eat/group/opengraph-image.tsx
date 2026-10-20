import { EAT, t } from "@/components/domain/canteen";
import { GROUP } from "@/components/domain/canteen/group/strings";
import { ogImageRoute } from "@/lib/og/route";

const og = ogImageRoute(({ locale }) => ({
  locale,
  kicker: t(EAT.title, locale),
  title: GROUP.pageTitle[locale],
  description: GROUP.pageIntro[locale],
  tone: "canteen",
}));

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
