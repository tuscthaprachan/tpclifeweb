import { STUDENT_BODIES } from "@/data/harvested-inventory";
import { UI } from "@/lib/i18n/strings";
import { ogImageRoute } from "@/lib/og/route";

const og = ogImageRoute(({ locale }) => ({
  locale,
  kicker: UI.about[locale],
  title: STUDENT_BODIES.tusu.name[locale],
  description: STUDENT_BODIES.tusu.role[locale],
  tone: "governance",
}));

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
