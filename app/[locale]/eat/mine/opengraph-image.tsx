import { EAT, t } from "@/components/domain/canteen";
import { BUDGET } from "@/components/domain/canteen/budget/strings";
import { ogImageRoute } from "@/lib/og/route";

const og = ogImageRoute(({ locale }) => ({
  locale,
  kicker: t(EAT.title, locale),
  title: t(BUDGET.mineTitle, locale),
  description: t(BUDGET.mineIntro, locale),
  tone: "canteen",
}));

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
