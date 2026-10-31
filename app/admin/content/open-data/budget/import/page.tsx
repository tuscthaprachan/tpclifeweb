import { NotConfigured } from "@/components/admin/NotConfigured";
import { Card, ConsolePage } from "@/components/admin/ui";
import { getAdminLocale } from "@/lib/admin/locale";
import { requireOpenDataEditor } from "@/lib/admin/open-data/access";
import { BUDGET_COLUMNS, FUND_COLUMNS } from "@/lib/admin/open-data/csv-import";
import { isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { OpenDataHeader, ownerLabel } from "../../parts";
import { ImportForm } from "./ImportForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("odmTabImport", locale) };
}

export default async function OpenDataImportPage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const { owners } = await requireOpenDataEditor();
  const options = [...(owners.length > 1 ? [{ value: "", label: a("choiceSelect", locale) }] : []), ...owners.map((o) => ({ value: o, label: ownerLabel(o, locale) }))];
  return (
    <ConsolePage width="wide">
      <OpenDataHeader locale={locale} section="import" title={a("odmTabImport", locale)} description={a("odmImportDesc", locale)} />
      <Card title={a("odmImportBudgetHeading", locale)} icon="upload" level={2}>
        <ImportForm locale={locale} kind="budget" columns={BUDGET_COLUMNS} owners={options} />
      </Card>
      <Card title={a("odmImportFundsHeading", locale)} icon="upload" level={2}>
        <ImportForm locale={locale} kind="funds" columns={FUND_COLUMNS} owners={options} />
      </Card>
    </ConsolePage>
  );
}
