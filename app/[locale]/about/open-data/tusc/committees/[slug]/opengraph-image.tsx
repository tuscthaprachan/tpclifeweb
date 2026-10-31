import { bodyName } from "@/components/domain/open-data/people";
import { UI } from "@/lib/i18n/strings";
import { ogImageRoute } from "@/lib/og/route";
import { getOpenDataBodies } from "@/lib/open-data/read";

const og = ogImageRoute<{ locale: string; slug: string }>(async ({ locale, slug }) => {
  const bodies = await getOpenDataBodies().catch(() => []);
  const body = bodies.find((b) => b.slug === slug);
  if (!body) return { locale, kicker: UI.odOpenData[locale], title: UI.odNavCommittees[locale], tone: "governance" };
  return {
    locale,
    kicker: `${UI.odOpenData[locale]} · ${UI.odNavCommittees[locale]}`,
    title: bodyName(body, locale).text,
    tone: "governance",
  };
});

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
