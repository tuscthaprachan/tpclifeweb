import { categoryLabel } from "@/components/domain/event";
import { pick } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { ogImageRoute } from "@/lib/og/route";
import { getEventBySlug } from "@/lib/content";

const og = ogImageRoute<{ locale: string; slug: string }>(async ({ locale, slug }) => {
  const event = await getEventBySlug(slug).catch(() => null);
  const section = pick(UI.events, locale);
  if (!event) return { locale, title: section, tone: "activity" };
  const kicker = [event.category ? categoryLabel(event.category, locale) : section, event.startsAt ? formatDate(event.startsAt, locale) : ""]
    .filter(Boolean)
    .join(" · ");
  return { locale, kicker, title: pick(event.title, locale), description: pick(event.summary, locale), tone: "activity" };
});

export const generateImageMetadata = og.generateImageMetadata;
export default og.Image;
