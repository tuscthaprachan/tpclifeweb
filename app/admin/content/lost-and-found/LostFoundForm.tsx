import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextarea, BilingualTextField, DateField, DateTimeField, EnumSelect, TextField } from "@/components/admin/content/fields";
import { ImagePicker } from "@/components/admin/content/ImagePicker";
import { ReferencePicker } from "@/components/admin/content/ReferencePicker";
import { categoryLabel } from "@/components/domain/lostfound/categoryLabel";
import { kindLabel } from "@/components/domain/lostfound/kindLabel";
import { statusLabel } from "@/components/domain/lostfound/statusLabel";
import { InsetText, NotificationBanner } from "@/components/ui";
import { formatBangkokDateTime } from "@/lib/admin/content/datetime";
import { isStorageConfigured, listImageChoices } from "@/lib/admin/content/images";
import { loadChoices, userNames } from "@/lib/admin/content/list";
import { ownerOptions } from "@/lib/admin/content/options";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getDb } from "@/lib/db";
import { cases, lostFoundItemPhotos, lostFoundItems } from "@/lib/db/schema";
import { LOST_FOUND_CATEGORIES, LOST_FOUND_KINDS, LOST_FOUND_STATUSES } from "@/lib/db/schema/content/enums";
import { a } from "@/lib/i18n/admin";
import { localePath, type Locale } from "@/lib/i18n/config";
import { deleteLostFound, saveLostFound } from "./actions";
import { PrivateFields } from "./PrivateFields";
import { CLAIM_CHANNELS } from "./validate";
import { FormSection } from "@/components/admin/content/FormSection";
import { Package } from "lucide-react";

/**
 * The lost and found listing form, for the "new" page (no `id`) and the edit
 * page. The first section is exactly what the public listing shows; the
 * private fields come last, in a section of their own, and only here.
 */
export async function LostFoundForm({ locale, id, saved }: { locale: Locale; id?: string; saved?: string }) {
  const db = getDb();
  const def = getContentType("lost-and-found")!;

  const [item] = id ? await db.select().from(lostFoundItems).where(eq(lostFoundItems.id, id)) : [];
  if (id && !item) notFound();
  const [placeChoices, imageChoices, photos, names] = await Promise.all([
    loadChoices(db, getContentType("places")!),
    listImageChoices(db),
    item ? db.select().from(lostFoundItemPhotos).where(eq(lostFoundItemPhotos.itemId, item.id)).orderBy(asc(lostFoundItemPhotos.position)) : [],
    item ? userNames(db, [item.updatedBy]) : new Map<string, string>(),
  ]);

  const record: ContentRecordInfo | undefined = item
    ? {
        id: item.id,
        status: item.status,
        updatedAt: item.updatedAt.toISOString(),
        updatedByName: item.updatedBy ? names.get(item.updatedBy) : null,
        viewHref: localePath(locale, `/lost-and-found/${item.slug}`),
      }
    : undefined;
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);
  const [linkedCase] = item?.caseId ? await db.select({ reference: cases.reference }).from(cases).where(eq(cases.id, item.caseId)) : [];
  const caseReference = linkedCase?.reference;
  const pendingReport = item?.status === "draft" && item.submittedByStudent;
  const claim = item?.claimContact;

  return (
    <ContentForm
      key={record?.updatedAt}
      locale={locale}
      action={saveLostFound.bind(null, item?.id ?? null)}
      deleteAction={item ? deleteLostFound.bind(null, item.id) : undefined}
      record={record}
      listHref={contentPath(def)}
      saved={saved}
    >
      {pendingReport ? (
        <NotificationBanner variant="info" title={L("lfReportBannerTitle")}>
          {L("lfReportBanner")}
        </NotificationBanner>
      ) : null}

      <div className="flex flex-col gap-[var(--space-1)]">
        <p className="m-0 text-ink-600">{L("lfSectionPublicHint")}</p>
        {item ? <p className="m-0 text-sm font-medium text-ink-900">{a("lfReference", locale, { reference: item.reference })}</p> : null}
      </div>
      <FormSection id="lf-item" icon={Package} legend={L("cfSecLfItem")}>
        <EnumSelect
          name="kind"
          label={L("lfFieldKind")}
          defaultValue={item?.kind ?? "found"}
          options={LOST_FOUND_KINDS.map((value) => ({ value, label: kindLabel(value, locale) }))}
        />
        <BilingualTextField name="title" label={L("fieldTitle")} maxLength={200} defaultValue={{ th: item?.titleTh, en: item?.titleEn }} />
        <BilingualTextarea
          name="description"
          label={L("lfFieldDescription")}
          hint={L("lfFieldDescriptionHint")}
          maxLength={2000}
          rows={5}
          defaultValue={{ th: item?.descriptionTh, en: item?.descriptionEn }}
        />
        <EnumSelect
          name="category"
          label={L("fieldCategory")}
          defaultValue={item?.category ?? ""}
          options={[{ value: "", label: L("choiceSelect") }, ...LOST_FOUND_CATEGORIES.map((value) => ({ value, label: categoryLabel(value, locale) }))]}
        />
      </FormSection>
      <FormSection id="lf-where" icon="places" legend={L("cfSecLfWhere")}>
        <ReferencePicker name="placeId" label={L("lfFieldPlace")} options={placeChoices} defaultValue={item?.placeId ?? null} emptyLabel={L("lfPlaceNone")} />
        <BilingualTextField
          name="locationNote"
          label={L("lfFieldLocationNote")}
          hint={L("lfFieldLocationNoteHint")}
          maxLength={300}
          defaultValue={{ th: item?.locationNoteTh, en: item?.locationNoteEn }}
        />
        <DateField name="occurredOn" label={L("lfFieldOccurredOn")} defaultValue={item?.occurredOn} />
      </FormSection>
      <FormSection id="lf-photos" icon="images" legend={L("cfSecPhotos")}>
        <ImagePicker
          name="photos"
          label={L("lfFieldPhotos")}
          hint={L("lfFieldPhotosHint")}
          multiple
          images={imageChoices}
          storageConfigured={isStorageConfigured()}
          defaultValue={photos.map((p) => p.imageId)}
        />
      </FormSection>
      <FormSection id="lf-handling" icon="lostFound" legend={L("cfSecLfHandling")}>
        <EnumSelect
          name="registerStatus"
          label={L("lfFieldProgress")}
          hint={L("lfFieldProgressHint")}
          defaultValue={item?.registerStatus ?? "open"}
          options={LOST_FOUND_STATUSES.map((value) => ({ value, label: statusLabel(value, locale) }))}
        />
        <BilingualTextField
          name="heldAt"
          label={L("lfFieldHeldAt")}
          hint={L("lfFieldHeldAtHint")}
          maxLength={300}
          defaultValue={{ th: item?.heldAtTh, en: item?.heldAtEn }}
        />
        <DateField name="claimBy" label={L("lfFieldClaimBy")} hint={L("lfFieldClaimByHint")} defaultValue={item?.claimBy} />
        <fieldset className="m-0 flex flex-col gap-[var(--space-3)] border-0 p-0">
          <legend className="mb-[var(--space-1)] text-lg font-semibold text-ink-900">{L("lfFieldClaimContact")}</legend>
          <p className="m-0 text-sm text-ink-600">{L("lfFieldClaimContactHint")}</p>
          <BilingualTextField name="claimLabel" label={L("blockContactLabel")} maxLength={100} defaultValue={claim?.label} />
          <EnumSelect
            name="claimChannel"
            label={L("blockContactChannel")}
            defaultValue={claim?.channel ?? ""}
            options={[{ value: "", label: L("choiceNone") }, ...CLAIM_CHANNELS.map((value) => ({ value, label: L(`channel_${value}`) }))]}
          />
          <TextField name="claimValue" label={L("blockContactValue")} hint={L("blockContactValueHint")} maxLength={300} defaultValue={claim?.value} />
          <BilingualTextField name="claimHours" label={L("blockContactHours")} maxLength={100} defaultValue={claim?.hours} />
        </fieldset>
        <EnumSelect
          name="owner"
          label={L("fieldOwner")}
          defaultValue={item?.owner ?? ""}
          options={[{ value: "", label: L("choiceSelect") }, ...ownerOptions(locale)]}
        />
        <DateTimeField name="resolvedAt" label={L("lfFieldResolvedAt")} hint={L("lfFieldResolvedAtHint")} defaultValue={formatBangkokDateTime(item?.resolvedAt)} />
      </FormSection>
      {item?.caseId ? (
        <FormSection id="lf-case" icon="cases" legend={L("lfcEditorCaseTitle")}>
          <InsetText>{L("lfcEditorCaseBody")}</InsetText>
          <p className="m-0">
            <a href={`/admin/cases/${item.caseId}`}>{a("lfcEditorCaseLink", locale, { reference: caseReference ?? item.reference })}</a>
          </p>
        </FormSection>
      ) : item ? (
        // A listing made before cases existed keeps its two plaintext private fields until it is moved to a case.
        <PrivateFields submitterContact={item.submitterContact ?? null} staffVerificationDetail={item.staffVerificationDetail ?? null} />
      ) : (
        <InsetText>
          <p className="m-0">{L("lfcEditorNewNote")}</p>
          <p className="m-0 mt-[var(--space-2)]">
            <a href="/admin/cases/new/found">{L("lfcEditorLogFound")}</a>
            {" | "}
            <a href="/admin/cases/new/lost">{L("lfcEditorLogLost")}</a>
          </p>
        </InsetText>
      )}
    </ContentForm>
  );
}
