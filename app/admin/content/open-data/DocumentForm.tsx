import { asc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextField, CheckboxField, DateField, EnumSelect, SlugField, TextField } from "@/components/admin/content/fields";
import { FormSection } from "@/components/admin/content/FormSection";
import { documentTypeLabel } from "@/components/domain/open-data/documents";
import { userNames } from "@/lib/admin/content/list";
import { getDb } from "@/lib/db";
import { OPEN_DATA_DOCUMENT_TYPES, openDataDocuments } from "@/lib/db/schema/content/open-data";
import { canEditOwner } from "@/lib/admin/open-data/scope";
import { OPEN_DATA_PATHS } from "@/lib/admin/open-data/paths";
import { ADMIN_UPLOAD_MAX_BYTES } from "@/lib/admin/content/upload-limit";
import type { OpenDataOwner } from "@/lib/db/schema/content/open-data";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { saveDocument } from "./actions";
import { FileField } from "./FileField";
import { TranscriptField } from "./TranscriptField";
import { ownerLabel } from "./parts";

/** The document form for the "new" page (no `id`) and the edit page. */
export async function DocumentForm({ locale, owners, id, saved }: { locale: Locale; owners: readonly OpenDataOwner[]; id?: string; saved?: string }) {
  const db = getDb();
  const [doc] = id ? await db.select().from(openDataDocuments).where(eq(openDataDocuments.id, id)) : [];
  if (id && (!doc || !canEditOwner(owners, doc.owner))) notFound();
  const names = doc ? await userNames(db, [doc.updatedBy]) : new Map<string, string>();
  const others = await db
    .select({ id: openDataDocuments.id, owner: openDataDocuments.owner, number: openDataDocuments.number, titleTh: openDataDocuments.titleTh, titleEn: openDataDocuments.titleEn })
    .from(openDataDocuments)
    .where(inArray(openDataDocuments.owner, [...owners]))
    .orderBy(asc(openDataDocuments.owner), asc(openDataDocuments.number));
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);

  const record: ContentRecordInfo | undefined = doc
    ? { id: doc.id, status: doc.status, updatedAt: doc.updatedAt.toISOString(), updatedByName: doc.updatedBy ? names.get(doc.updatedBy) : null }
    : undefined;
  const replacedOptions = [
    { value: "", label: L("choiceNone") },
    ...others
      .filter((o) => o.id !== doc?.id && (!doc || o.owner === doc.owner))
      .map((o) => ({ value: o.id, label: `${owners.length > 1 ? `${ownerLabel(o.owner, locale)} ` : ""}${o.number} ${(locale === "th" ? o.titleTh || o.titleEn : o.titleEn || o.titleTh).slice(0, 80)}` })),
  ];

  return (
    <ContentForm
      key={record?.updatedAt}
      locale={locale}
      action={saveDocument.bind(null, doc?.id ?? null)}
      record={record}
      listHref={OPEN_DATA_PATHS.documents}
      saved={saved}
    >
      <FormSection id="od-doc-identity" icon="edit" legend={L("odmSecIdentity")}>
        {doc ? (
          <p className="m-0">
            <span className="font-medium">{L("fieldOwner")}:</span> {ownerLabel(doc.owner, locale)}
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
          <TextField name="number" label={L("odmFieldNumber")} hint={L("odmHintNumber")} defaultValue={doc?.number} maxLength={3} inputMode="numeric" />
          <EnumSelect
            name="type"
            label={L("odmFieldType")}
            defaultValue={doc?.type ?? ""}
            options={[{ value: "", label: L("choiceSelect") }, ...OPEN_DATA_DOCUMENT_TYPES.map((t) => ({ value: t, label: documentTypeLabel(t, locale) }))]}
          />
        </div>
        <BilingualTextField name="title" label={L("fieldTitle")} maxLength={400} defaultValue={{ th: doc?.titleTh, en: doc?.titleEn }} />
        <SlugField label={L("fieldSlug")} defaultValue={doc?.slug} />
      </FormSection>
      <FormSection id="od-doc-facts" icon="info" legend={L("odmSecFacts")} hint={L("odmHintFacts")}>
        <BilingualTextField name="issuer" label={L("odmFieldIssuer")} maxLength={400} defaultValue={{ th: doc?.issuerTh, en: doc?.issuerEn }} />
        <div className="grid gap-[var(--space-4)] md:grid-cols-2">
          <TextField name="reference" label={L("odmFieldReference")} defaultValue={doc?.reference} />
          <TextField name="signatory" label={L("odmFieldSignatory")} defaultValue={doc?.signatory} />
          <TextField name="dateText" label={L("odmFieldDateText")} hint={L("odmHintDateText")} defaultValue={doc?.dateText} />
          <DateField name="dateIso" label={L("odmFieldDateIso")} hint={L("odmHintDateIso")} defaultValue={doc?.dateIso} />
          <TextField name="pages" label={L("odmFieldPages")} defaultValue={doc?.pages === null || doc?.pages === undefined ? "" : String(doc.pages)} inputMode="numeric" />
        </div>
        <CheckboxField name="scan" label={L("odmFieldScan")} hint={L("odmHintScan")} defaultChecked={doc?.scan} />
        <EnumSelect name="replacedBy" label={L("odmFieldReplacedBy")} hint={L("odmHintReplacedBy")} defaultValue={doc?.replacedById ?? ""} options={replacedOptions} />
      </FormSection>
      <FormSection id="od-doc-file" icon="upload" legend={L("odmSecFile")}>
        <TextField name="driveUrl" label={L("odmFieldDriveUrl")} hint={L("odmHintDriveUrl")} type="url" inputMode="url" defaultValue={doc?.driveUrl} />
        <FileField
          name="file"
          label={L("odmFieldFile")}
          hint={a("odmHintFile", locale, { mb: ADMIN_UPLOAD_MAX_BYTES / 1024 / 1024 })}
          accept="application/pdf,text/csv,.pdf,.csv"
          current={
            doc?.fileKey ? (
              <p className="m-0 text-sm">
                {L("odmFileCurrent")}{" "}
                {doc.fileUrl ? (
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                    {doc.fileKey.split("/").pop()}
                  </a>
                ) : (
                  doc.fileKey
                )}
              </p>
            ) : null
          }
        />
        {doc?.fileKey ? <CheckboxField name="removeFile" label={L("odmFieldRemoveFile")} hint={L("odmHintRemoveFile")} /> : null}
      </FormSection>
      <FormSection id="od-doc-transcript" icon="guides" legend={L("odmSecTranscript")} hint={L("odmHintTranscript")}>
        <TranscriptField name="transcript" label={L("odmFieldTranscript")} defaultValue={doc?.transcriptMarkdown ?? ""} />
      </FormSection>
    </ContentForm>
  );
}
