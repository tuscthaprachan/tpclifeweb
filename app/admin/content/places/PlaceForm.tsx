import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextarea, BilingualTextField, CheckboxField, EnumSelect, SlugField, TextField } from "@/components/admin/content/fields";
import { Fieldset, NotificationBanner, Stack } from "@/components/ui";
import { userNames } from "@/lib/admin/content/list";
import { categoryOptions } from "@/lib/admin/content/options";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getDb } from "@/lib/db";
import { places } from "@/lib/db/schema";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { HoursField } from "./HoursField";
import { deletePlace, savePlace } from "./actions";
import { placeUsage } from "./usage";

/** The place form, for the "new" page (no `id`) and the edit page. `error` is "inUse" after a refused delete. */
export async function PlaceForm({ locale, id, saved, error }: { locale: Locale; id?: string; saved?: string; error?: string }) {
  const db = getDb();
  const def = getContentType("places")!;
  const [place] = id ? await db.select().from(places).where(eq(places.id, id)) : [];
  if (id && !place) notFound();
  const names = place ? await userNames(db, [place.updatedBy]) : new Map<string, string>();
  const usage = place && error === "inUse" ? await placeUsage(db, place.id) : null;

  const record: ContentRecordInfo | undefined = place
    ? {
        id: place.id,
        status: place.status,
        updatedAt: place.updatedAt.toISOString(),
        updatedByName: place.updatedBy ? names.get(place.updatedBy) : null,
      }
    : undefined;
  const L = (key: AdminKey) => a(key, locale);
  const uses = usage
    ? [
        usage.events > 0 ? a("placesUseEvents", locale, { n: usage.events }) : null,
        usage.lostFound > 0 ? a("placesUseLostFound", locale, { n: usage.lostFound }) : null,
        usage.canteen > 0 ? a("placesUseCanteen", locale, { n: usage.canteen }) : null,
      ]
        .filter(Boolean)
        .join(locale === "th" ? " " : ", ")
    : "";

  return (
    <ContentForm
      key={record?.updatedAt}
      locale={locale}
      action={savePlace.bind(null, place?.id ?? null)}
      deleteAction={place ? deletePlace.bind(null, place.id) : undefined}
      record={record}
      listHref={contentPath(def)}
      saved={saved}
    >
      {usage && usage.total > 0 ? (
        <NotificationBanner variant="warning" title={L("placesInUseTitle")}>
          {a("placesInUseBody", locale, { uses })}
        </NotificationBanner>
      ) : null}
      <Fieldset id="place-about" legend={L("placesGroupAbout")}>
        <Stack space={4}>
          <BilingualTextField name="name" label={L("dirFieldName")} maxLength={150} defaultValue={{ th: place?.nameTh, en: place?.nameEn }} />
          <SlugField label={L("fieldSlug")} suggestFrom="name.en" defaultValue={place?.slug} />
          <EnumSelect
            name="category"
            label={L("fieldCategory")}
            hint={L("placesHintCategory")}
            defaultValue={place?.category ?? ""}
            options={[{ value: "", label: L("choiceSelect") }, ...categoryOptions(locale)]}
          />
          <BilingualTextField
            name="building"
            label={L("placesFieldBuilding")}
            hint={L("placesHintBuilding")}
            maxLength={150}
            defaultValue={{ th: place?.buildingTh, en: place?.buildingEn }}
          />
          <BilingualTextarea name="description" label={L("dirFieldDescription")} maxLength={1500} rows={4} defaultValue={{ th: place?.descriptionTh, en: place?.descriptionEn }} />
          <CheckboxField name="isKeyLocation" label={L("placesLabelKey")} hint={L("placesHintKey")} defaultChecked={place?.isKeyLocation ?? false} />
        </Stack>
      </Fieldset>
      <Fieldset id="place-hours" legend={L("placesGroupHours")}>
        <Stack space={4}>
          <HoursField defaultValue={place?.openingHours ?? []} />
          <BilingualTextField
            name="closureNote"
            label={L("placesFieldClosure")}
            hint={L("placesHintClosure")}
            maxLength={300}
            defaultValue={{ th: place?.closureNoteTh, en: place?.closureNoteEn }}
          />
        </Stack>
      </Fieldset>
      <Fieldset id="place-map" legend={L("placesGroupMap")} hint={L("placesHintMap")}>
        <div className="grid gap-[var(--space-4)] sm:grid-cols-2">
          <TextField name="lat" label={L("dirFieldLat")} inputMode="text" maxLength={20} defaultValue={place?.lat != null ? String(place.lat) : ""} />
          <TextField name="lng" label={L("dirFieldLng")} inputMode="text" maxLength={20} defaultValue={place?.lng != null ? String(place.lng) : ""} />
        </div>
      </Fieldset>
    </ContentForm>
  );
}
