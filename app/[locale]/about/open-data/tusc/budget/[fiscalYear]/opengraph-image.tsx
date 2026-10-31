import { fillText } from "@/components/domain/open-data";
import { UI } from "@/lib/i18n/strings";
import { ogImageRoute } from "@/lib/og/route";

const og = ogImageRoute<{ locale: string; fiscalYear: string }>(({ locale, fiscalYear }) => {
  const year = Number(fiscalYear);
  return {
    locale,
    kicker: `${UI.odOpenData[locale]} · ${UI.odNavBudget[locale]}`,
    title: Number.isInteger(year) ? fillText(UI.odBudBulletinTitle[locale], { year, ce: year - 543 }) : UI.odKeyBudget[locale],
    tone: "governance",
  };
});

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
