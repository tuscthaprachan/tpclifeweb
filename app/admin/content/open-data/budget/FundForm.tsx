import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { EnumSelect, TextField } from "@/components/admin/content/fields";
import { FormSection } from "@/components/admin/content/FormSection";
import { userNames } from "@/lib/admin/content/list";
import { OPEN_DATA_PATHS } from "@/lib/admin/open-data/paths";
import { canEditOwner } from "@/lib/admin/open-data/scope";
import { getDb } from "@/lib/db";
import { openDataFunds, type OpenDataOwner } from "@/lib/db/schema/content/open-data";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { deleteFund, saveFund } from "../actions";
import { ownerLabel } from "../parts";

export async function FundForm({ locale, owners, id, saved }: { locale: Locale; owners: readonly OpenDataOwner[]; id?: string; saved?: string }) {
  const db = getDb();
  const [fund] = id ? await db.select().from(openDataFunds).where(eq(openDataFunds.id, id)) : [];
  if (id && (!fund || !canEditOwner(owners, fund.owner))) notFound();
  const names = fund ? await userNames(db, [fund.updatedBy]) : new Map<string, string>();
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);
  const record: ContentRecordInfo | undefined = fund
    ? { id: fund.id, status: "published", updatedAt: fund.updatedAt.toISOString(), updatedByName: fund.updatedBy ? names.get(fund.updatedBy) : null }
    : undefined;

  return (
    <ContentForm
      key={record?.updatedAt}
      locale={locale}
      action={saveFund.bind(null, fund?.id ?? null)}
      deleteAction={fund ? deleteFund.bind(null, fund.id) : undefined}
      record={record}
      listHref={OPEN_DATA_PATHS.funds}
      saved={saved}
      hasStatus={false}
    >
      <FormSection id="od-fund" icon="edit" legend={L("odmSecFund")} hint={L("odmHintAsPrinted")}>
        {fund ? (
          <p className="m-0">
            <span className="font-medium">{L("fieldOwner")}:</span> {ownerLabel(fund.owner, locale)}
          </p>
        ) : (
          <EnumSelect
            name="owner"
            label={L("fieldOwner")}
            defaultValue={owners.length === 1 ? owners[0] : ""}
            options={[...(owners.length === 1 ? [] : [{ value: "", label: L("choiceSelect") }]), ...owners.map((o) => ({ value: o, label: ownerLabel(o, locale) }))]}
          />
        )}
        <div className="grid gap-[var(--space-4)] md:grid-cols-2">
          <TextField name="number" label={L("odmFieldFundNumber")} defaultValue={fund ? String(fund.number) : ""} inputMode="numeric" />
          <TextField name="code" label={L("odmFieldFundCode")} defaultValue={fund?.code} />
        </div>
        <TextField name="type" label={L("odmFieldFundType")} defaultValue={fund?.type} />
        <TextField name="name" label={L("odmFieldFundName")} defaultValue={fund?.name} />
        <TextField name="annotation" label={L("odmFieldAnnotation")} hint={L("odmHintMarker")} defaultValue={fund?.annotation} />
      </FormSection>
    </ContentForm>
  );
}
