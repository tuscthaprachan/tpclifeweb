import { NotConfigured } from "@/components/admin/NotConfigured";
import { ConsolePage } from "@/components/admin/ui";
import { isUuid } from "@/lib/admin/content/form-state";
import { getAdminLocale } from "@/lib/admin/locale";
import { requireOpenDataEditor } from "@/lib/admin/open-data/access";
import { OPEN_DATA_PATHS } from "@/lib/admin/open-data/paths";
import { isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { notFound } from "next/navigation";
import { OpenDataHeader } from "../../../../parts";
import { DecisionForm } from "../DecisionForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("listAdd", locale, { item: a("odmDecisionOne", locale) }) };
}

export default async function NewDecisionPage({ params }: { params: Promise<{ id: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const { owners } = await requireOpenDataEditor();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  return (
    <ConsolePage width="wide">
      <OpenDataHeader
        locale={locale}
        section="meetings"
        title={a("listAdd", locale, { item: a("odmDecisionOne", locale) })}
        trail={[
          { label: a("odmTabMeetings", locale), href: OPEN_DATA_PATHS.meetings },
          { label: a("odmMeetingOne", locale), href: `${OPEN_DATA_PATHS.meetings}/${id}` },
        ]}
      />
      <DecisionForm locale={locale} owners={owners} meetingId={id} />
    </ConsolePage>
  );
}
