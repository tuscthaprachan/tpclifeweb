import { asc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { EnumSelect, TextField } from "@/components/admin/content/fields";
import { FormSection } from "@/components/admin/content/FormSection";
import { userNames } from "@/lib/admin/content/list";
import { OPEN_DATA_PATHS } from "@/lib/admin/open-data/paths";
import { canEditOwner } from "@/lib/admin/open-data/scope";
import { getDb } from "@/lib/db";
import { OPEN_DATA_BUDGET_VIEWS, openDataBudgetLines, openDataDocuments, type OpenDataOwner } from "@/lib/db/schema/content/open-data";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { deleteBudgetLine, saveBudgetLine } from "../actions";
import { ownerLabel } from "../parts";

const VIEW_KEY = { organisation: "odmViewOrganisation", project: "odmViewProject", category: "odmViewCategory" } as const;

export async function BudgetLineForm({ locale, owners, id, saved }: { locale: Locale; owners: readonly OpenDataOwner[]; id?: string; saved?: string }) {
  const db = getDb();
  const [line] = id ? await db.select().from(openDataBudgetLines).where(eq(openDataBudgetLines.id, id)) : [];
  if (id && (!line || !canEditOwner(owners, line.owner))) notFound();
  const names = line ? await userNames(db, [line.updatedBy]) : new Map<string, string>();
  const docs = await db
    .select({ id: openDataDocuments.id, owner: openDataDocuments.owner, number: openDataDocuments.number, titleTh: openDataDocuments.titleTh, titleEn: openDataDocuments.titleEn })
    .from(openDataDocuments)
    .where(inArray(openDataDocuments.owner, line ? [line.owner] : [...owners]))
    .orderBy(asc(openDataDocuments.owner), asc(openDataDocuments.number));
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);
  const record: ContentRecordInfo | undefined = line
    ? { id: line.id, status: "published", updatedAt: line.updatedAt.toISOString(), updatedByName: line.updatedBy ? names.get(line.updatedBy) : null }
    : undefined;

  return (
    <ContentForm
      key={record?.updatedAt}
      locale={locale}
      action={saveBudgetLine.bind(null, line?.id ?? null)}
      deleteAction={line ? deleteBudgetLine.bind(null, line.id) : undefined}
      record={record}
      listHref={OPEN_DATA_PATHS.budget}
      saved={saved}
      hasStatus={false}
    >
      <FormSection id="od-line-identity" icon="edit" legend={L("odmSecBudgetLine")} hint={L("odmHintAsPrinted")}>
        {line ? (
          <p className="m-0">
            <span className="font-medium">{L("fieldOwner")}:</span> {ownerLabel(line.owner, locale)}
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
          <TextField name="fiscalYear" label={L("odmFieldFiscalYear")} hint={L("odmHintFiscalYear")} defaultValue={line ? String(line.fiscalYear) : ""} inputMode="numeric" />
          <EnumSelect
            name="view"
            label={L("odmFieldView")}
            defaultValue={line?.view ?? ""}
            options={[{ value: "", label: L("choiceSelect") }, ...OPEN_DATA_BUDGET_VIEWS.map((v) => ({ value: v, label: L(VIEW_KEY[v]) }))]}
          />
        </div>
        <TextField name="organisationType" label={L("odmFieldOrganisationType")} defaultValue={line?.organisationType} />
        <TextField name="organisation" label={L("odmFieldOrganisation")} defaultValue={line?.organisation} />
        <TextField name="project" label={L("odmFieldProject")} hint={L("odmHintMarker")} defaultValue={line?.project} />
        <TextField name="category" label={L("odmFieldCategory")} hint={L("odmHintMarker")} defaultValue={line?.category} />
        <TextField name="amount" label={L("odmFieldAmountThb")} hint={L("odmHintAmount")} defaultValue={line?.amount} inputMode="text" />
      </FormSection>
      <FormSection id="od-line-source" icon="guides" legend={L("odmSecSource")}>
        <EnumSelect
          name="sourceDocument"
          label={L("odmFieldSourceDocument")}
          defaultValue={line?.sourceDocumentId ?? ""}
          options={[
            { value: "", label: L("choiceNone") },
            ...docs.map((d) => ({ value: d.id, label: `${owners.length > 1 && !line ? `${ownerLabel(d.owner, locale)} ` : ""}${d.number} ${(locale === "th" ? d.titleTh || d.titleEn : d.titleEn || d.titleTh).slice(0, 80)}` })),
          ]}
          className="max-w-[40rem]"
        />
        <TextField name="sourcePage" label={L("odmFieldSourcePage")} defaultValue={line?.sourcePage === null || line?.sourcePage === undefined ? "" : String(line.sourcePage)} inputMode="numeric" className="max-w-[10rem]" />
      </FormSection>
    </ContentForm>
  );
}
