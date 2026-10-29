import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { FormSection } from "@/components/admin/content/FormSection";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextarea, BilingualTextField, CheckboxField, DateField, SlugField, TextField } from "@/components/admin/content/fields";
import { Stack } from "@/components/ui";
import { userNames } from "@/lib/admin/content/list";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getDb } from "@/lib/db";
import { shuttleRoutes, shuttleStops } from "@/lib/db/schema";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { localePath, type Locale } from "@/lib/i18n/config";
import { DaysField } from "../organisations/_shared/DaysField";
import { StopsField } from "./StopsField";
import { ValueListField } from "./ValueListField";
import { deleteShuttleRoute, saveShuttleRoute } from "./actions";

/** The shuttle route form, for the "new" page (no `id`) and the edit page. */
export async function ShuttleForm({ locale, id, saved }: { locale: Locale; id?: string; saved?: string }) {
  const db = getDb();
  const def = getContentType("shuttle")!;
  const [route] = id ? await db.select().from(shuttleRoutes).where(eq(shuttleRoutes.id, id)) : [];
  if (id && !route) notFound();
  const [stops, names] = route
    ? await Promise.all([
        db.select().from(shuttleStops).where(eq(shuttleStops.routeId, route.id)).orderBy(asc(shuttleStops.position)),
        userNames(db, [route.updatedBy]),
      ])
    : [[], new Map<string, string>()];

  const record: ContentRecordInfo | undefined = route
    ? {
        id: route.id,
        status: route.status,
        updatedAt: route.updatedAt.toISOString(),
        updatedByName: route.updatedBy ? names.get(route.updatedBy) : null,
        viewHref: localePath(locale, "/getting-around"),
      }
    : undefined;
  const L = (key: AdminKey) => a(key, locale);

  return (
    <ContentForm
      key={record?.updatedAt}
      locale={locale}
      action={saveShuttleRoute.bind(null, route?.id ?? null)}
      deleteAction={route ? deleteShuttleRoute.bind(null, route.id) : undefined}
      record={record}
      listHref={contentPath(def)}
      saved={saved}
    >
      <FormSection icon="shuttle" id="shuttle-route" legend={L("shuttleGroupRoute")}>
        <Stack space={4}>
          <BilingualTextField name="name" label={L("dirFieldName")} maxLength={150} defaultValue={{ th: route?.nameTh, en: route?.nameEn }} />
          <SlugField label={L("fieldSlug")} suggestFrom="name.en" defaultValue={route?.slug} />
          <BilingualTextarea name="description" label={L("dirFieldDescription")} maxLength={1500} rows={3} defaultValue={{ th: route?.descriptionTh, en: route?.descriptionEn }} />
          <CheckboxField name="isActive" label={L("shuttleLabelActive")} hint={L("shuttleHintActive")} defaultChecked={route?.isActive ?? true} />
        </Stack>
      </FormSection>

      <FormSection icon="events" id="shuttle-calendar" legend={L("shuttleGroupCalendar")}>
        <Stack space={4}>
          <DaysField name="daysOfWeek" legend={L("shuttleFieldDays")} defaultValue={route?.daysOfWeek ?? [1, 2, 3, 4, 5]} />
          <div className="grid gap-[var(--space-4)] sm:grid-cols-2">
            <DateField name="validFrom" label={L("shuttleFieldValidFrom")} hint={L("shuttleHintValid")} defaultValue={route?.validFrom} className="max-w-full" />
            <DateField name="validUntil" label={L("shuttleFieldValidUntil")} hint={L("shuttleHintValid")} defaultValue={route?.validUntil} className="max-w-full" />
          </div>
          <ValueListField
            name="excludedDates"
            legend={L("shuttleFieldExcluded")}
            hint={L("shuttleHintExcluded")}
            itemLabel={L("shuttleFieldDate")}
            inputLabel={L("shuttleFieldDate")}
            type="date"
            defaultValue={route?.excludedDates ?? []}
            max={120}
          />
          <ValueListField
            name="addedDates"
            legend={L("shuttleFieldAdded")}
            hint={L("shuttleHintAdded")}
            itemLabel={L("shuttleFieldDate")}
            inputLabel={L("shuttleFieldDate")}
            type="date"
            defaultValue={route?.addedDates ?? []}
            max={120}
          />
        </Stack>
      </FormSection>

      <FormSection icon="overdue" id="shuttle-times" legend={L("shuttleGroupTimetable")}>
        <ValueListField
          name="departures"
          legend={L("shuttleFieldDepartures")}
          hint={L("shuttleHintDepartures")}
          itemLabel={L("shuttleFieldDeparture")}
          inputLabel={L("shuttleFieldTime")}
          type="time"
          defaultValue={route?.departures ?? []}
          max={200}
        />
      </FormSection>

      <FormSection icon="places" id="shuttle-stops" legend={L("shuttleGroupStops")}>
        <StopsField defaultValue={stops.map((s) => ({ nameTh: s.nameTh, nameEn: s.nameEn, offsetMinutes: s.offsetMinutes, noteTh: s.noteTh, noteEn: s.noteEn, lat: s.lat, lng: s.lng }))} />
      </FormSection>

      <FormSection icon="info" id="shuttle-more" legend={L("shuttleGroupMore")}>
        <Stack space={4}>
          <BilingualTextField name="fare" label={L("shuttleFieldFare")} maxLength={300} defaultValue={{ th: route?.fareTh, en: route?.fareEn }} />
          <BilingualTextarea name="notes" label={L("shuttleFieldNotes")} maxLength={1500} rows={3} defaultValue={{ th: route?.notesTh, en: route?.notesEn }} />
          <TextField name="realtimeFeedUrl" type="url" label={L("shuttleFieldRealtime")} hint={L("shuttleHintRealtime")} inputMode="url" defaultValue={route?.realtimeFeedUrl} />
          <BilingualTextField name="sourceNote" label={L("shuttleFieldSource")} hint={L("shuttleHintSource")} maxLength={300} defaultValue={{ th: route?.sourceNoteTh, en: route?.sourceNoteEn }} />
          <DateField name="lastVerified" label={L("shuttleFieldVerified")} defaultValue={route?.lastVerified} />
        </Stack>
      </FormSection>
    </ContentForm>
  );
}
