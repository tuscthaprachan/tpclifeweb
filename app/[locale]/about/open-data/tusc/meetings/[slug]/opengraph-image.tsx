import { meetingLabel } from "@/components/domain/open-data/meetings";
import { UI } from "@/lib/i18n/strings";
import { ogImageRoute } from "@/lib/og/route";
import { getOpenDataMeetings } from "@/lib/open-data/read";

const og = ogImageRoute<{ locale: string; slug: string }>(async ({ locale, slug }) => {
  const meeting = (await getOpenDataMeetings().catch(() => [])).find((m) => m.slug === slug);
  if (!meeting) return { locale, kicker: UI.odOpenData[locale], title: UI.odNavMeetings[locale], tone: "governance" };
  return {
    locale,
    kicker: `${UI.odOpenData[locale]} · ${UI.odNavMeetings[locale]}`,
    title: meetingLabel(meeting, locale),
    tone: "governance",
  };
});

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
