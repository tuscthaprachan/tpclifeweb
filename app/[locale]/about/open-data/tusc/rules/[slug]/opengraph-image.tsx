import { documentTitle } from "@/components/domain/open-data";
import { UI } from "@/lib/i18n/strings";
import { ogImageRoute } from "@/lib/og/route";
import { getOpenDataDocument } from "@/lib/open-data/read";

const og = ogImageRoute<{ locale: string; slug: string }>(async ({ locale, slug }) => {
  const doc = await getOpenDataDocument(slug).catch(() => null);
  if (!doc) return { locale, kicker: UI.odOpenData[locale], title: UI.odRlTitle[locale], tone: "governance" };
  return {
    locale,
    kicker: `${UI.odOpenData[locale]} · ${UI.odRlLabel[locale]}`,
    title: documentTitle(doc, locale),
    tone: "governance",
  };
});

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
