import { NotConfigured } from "@/components/admin/NotConfigured";
import { ConsolePage } from "@/components/admin/ui";
import { getAdminLocale } from "@/lib/admin/locale";
import { requireOpenDataEditor } from "@/lib/admin/open-data/access";
import { OPEN_DATA_PATHS } from "@/lib/admin/open-data/paths";
import { isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { OpenDataHeader } from "../../../parts";
import { FundForm } from "../../FundForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("listAdd", locale, { item: a("odmFundOne", locale) }) };
}

export default async function NewFundFormPage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const { owners } = await requireOpenDataEditor();
  return (
    <ConsolePage width="wide">
      <OpenDataHeader locale={locale} section="funds" title={a("listAdd", locale, { item: a("odmFundOne", locale) })} trail={[{ label: a("odmTabFunds", locale), href: OPEN_DATA_PATHS.funds }]} />
      <FundForm locale={locale} owners={owners} />
    </ConsolePage>
  );
}
