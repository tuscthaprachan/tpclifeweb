import { NotConfigured } from "@/components/admin/NotConfigured";
import { ConsolePage } from "@/components/admin/ui";
import { getAdminLocale } from "@/lib/admin/locale";
import { requireOpenDataEditor } from "@/lib/admin/open-data/access";
import { OPEN_DATA_PATHS } from "@/lib/admin/open-data/paths";
import { isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { OpenDataHeader } from "../../parts";
import { MeetingForm } from "../MeetingForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("listAdd", locale, { item: a("odmMeetingOne", locale) }) };
}

export default async function NewMeetingPage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const { owners } = await requireOpenDataEditor();
  return (
    <ConsolePage width="wide">
      <OpenDataHeader locale={locale} section="meetings" title={a("listAdd", locale, { item: a("odmMeetingOne", locale) })} trail={[{ label: a("odmTabMeetings", locale), href: OPEN_DATA_PATHS.meetings }]} />
      <MeetingForm locale={locale} owners={owners} />
    </ConsolePage>
  );
}
