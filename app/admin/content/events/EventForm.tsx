import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextarea, BilingualTextField, CheckboxField, DateTimeField, EnumSelect, SlugField, TextField } from "@/components/admin/content/fields";
import { ImagePicker } from "@/components/admin/content/ImagePicker";
import { ReferencePicker } from "@/components/admin/content/ReferencePicker";
import { BilingualRichTextField } from "@/components/admin/content/RichTextEditor";
import { Fieldset, Stack } from "@/components/ui";
import { formatBangkokDateTime } from "@/lib/admin/content/datetime";
import { loadChoices, userNames } from "@/lib/admin/content/list";
import { categoryOptions, ownerOptions } from "@/lib/admin/content/options";
import { loadRichTextRefs } from "@/lib/admin/content/refs";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { localePath, type Locale } from "@/lib/i18n/config";
import { deleteEvent, saveEvent } from "./actions";

/** The event form, for the "new" page (no `id`) and the edit page. */
export async function EventForm({ locale, id, saved }: { locale: Locale; id?: string; saved?: string }) {
  const db = getDb();
  const def = getContentType("events")!;
  const [refs, placeChoices] = await Promise.all([loadRichTextRefs(db), loadChoices(db, getContentType("places")!)]);

  const [event] = id ? await db.select().from(events).where(eq(events.id, id)) : [];
  if (id && !event) notFound();
  const names = event ? await userNames(db, [event.updatedBy]) : new Map<string, string>();

  const record: ContentRecordInfo | undefined = event
    ? {
        id: event.id,
        status: event.status,
        updatedAt: event.updatedAt.toISOString(),
        updatedByName: event.updatedBy ? names.get(event.updatedBy) : null,
        viewHref: localePath(locale, `/events/${event.slug}`),
      }
    : undefined;
  const L = (key: AdminKey) => a(key, locale);

  return (
    <ContentForm
      key={record?.updatedAt}
      locale={locale}
      action={saveEvent.bind(null, event?.id ?? null)}
      deleteAction={event ? deleteEvent.bind(null, event.id) : undefined}
      record={record}
      listHref={contentPath(def)}
      saved={saved}
    >
      <Fieldset legend={L("eventsGroupAbout")} id="g-about">
        <Stack space={4}>
          <BilingualTextField name="title" label={L("fieldTitle")} maxLength={200} defaultValue={{ th: event?.titleTh, en: event?.titleEn }} />
          <SlugField label={L("fieldSlug")} defaultValue={event?.slug} />
          <BilingualTextarea name="summary" label={L("fieldSummary")} hint={L("eventsHintSummary")} maxLength={500} rows={3} defaultValue={{ th: event?.summaryTh, en: event?.summaryEn }} />
          <BilingualRichTextField name="body" label={L("eventsFieldBody")} refs={refs} defaultValue={{ th: event?.bodyTh, en: event?.bodyEn }} />
          <EnumSelect name="owner" label={L("fieldOwner")} defaultValue={event?.owner ?? ""} options={[{ value: "", label: L("choiceSelect") }, ...ownerOptions(locale)]} />
          <EnumSelect name="category" label={L("fieldCategory")} defaultValue={event?.category ?? ""} options={[{ value: "", label: L("choiceNone") }, ...categoryOptions(locale)]} />
          <ImagePicker
            name="cover"
            label={L("fieldCoverImage")}
            images={refs.images}
            storageConfigured={refs.storageConfigured}
            defaultValue={event?.coverImageId ? [event.coverImageId] : []}
          />
        </Stack>
      </Fieldset>

      <Fieldset legend={L("eventsGroupWhen")} id="g-when">
        <Stack space={4}>
          <DateTimeField name="startsAt" label={L("eventsFieldStartsAt")} defaultValue={formatBangkokDateTime(event?.startsAt)} />
          <DateTimeField name="endsAt" label={L("eventsFieldEndsAt")} hint={L("eventsHintEndsAt")} defaultValue={formatBangkokDateTime(event?.endsAt)} />
          <CheckboxField name="isAllDay" label={L("eventsFieldAllDay")} hint={L("eventsHintAllDay")} defaultChecked={event?.isAllDay} />
        </Stack>
      </Fieldset>

      <Fieldset legend={L("eventsGroupWhere")} id="g-where">
        <Stack space={4}>
          <BilingualTextField name="location" label={L("eventsFieldLocation")} hint={L("eventsHintLocation")} maxLength={200} defaultValue={{ th: event?.locationTh, en: event?.locationEn }} />
          <ReferencePicker name="place" label={L("eventsFieldPlace")} hint={L("eventsHintPlace")} options={placeChoices} defaultValue={event?.placeId} />
        </Stack>
      </Fieldset>

      <Fieldset legend={L("eventsGroupJoin")} id="g-join">
        <Stack space={4}>
          <TextField
            name="registrationUrl"
            label={L("eventsFieldRegistrationUrl")}
            hint={L("eventsHintRegistrationUrl")}
            type="url"
            inputMode="url"
            defaultValue={event?.registrationUrl}
            className="max-w-[32rem]"
          />
          <ReferencePicker
            name="relatedForm"
            label={L("eventsFieldRelatedForm")}
            hint={L("eventsHintRelatedForm")}
            options={refs.forms}
            defaultValue={event?.relatedFormId}
          />
        </Stack>
      </Fieldset>

      <Fieldset legend={L("eventsGroupCancel")} id="g-cancel">
        <Stack space={4}>
          <CheckboxField name="isCancelled" label={L("eventsFieldCancelled")} hint={L("eventsHintCancelled")} defaultChecked={event?.isCancelled} />
          <BilingualTextarea
            name="cancellationNote"
            label={L("eventsFieldCancellationNote")}
            hint={L("eventsHintCancellationNote")}
            maxLength={500}
            rows={3}
            defaultValue={{ th: event?.cancellationNoteTh, en: event?.cancellationNoteEn }}
          />
        </Stack>
      </Fieldset>
    </ContentForm>
  );
}
