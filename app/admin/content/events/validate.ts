import { z } from "zod";
import { inArray } from "drizzle-orm";
import { fieldKit, formDataToObject, parseForm } from "@/lib/admin/content/fields";
import { resolveIntent, type FieldErrors, type ResolvedIntent } from "@/lib/admin/content/form-state";
import { checkImages } from "@/lib/admin/content/images";
import { isSlugTaken } from "@/lib/admin/content/slug";
import type { AuditExecutor } from "@/lib/db/audit";
import { events, forms, places } from "@/lib/db/schema";
import { CATEGORIES, OWNERS, type ContentStatus } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

/**
 * Everything an event form must satisfy, apart from writing it. Split out of
 * the Server Action so tests can run it against a database without a session.
 */
export async function validateEventForm(
  db: AuditExecutor,
  input: { locale: Locale; id: string | null; formData: FormData; existingStatus?: ContentStatus },
) {
  const { locale, id, formData } = input;
  const L = (key: AdminKey) => a(key, locale);
  const resolved: ResolvedIntent = resolveIntent(formData, input.existingStatus);
  const { publishing } = resolved;

  const k = fieldKit(locale, publishing);
  const schema = z.object({
    slug: k.slug(L("fieldSlug")),
    title: k.bilingual(L("fieldTitle"), { required: true, max: 200 }),
    summary: k.bilingual(L("fieldSummary"), { required: true, max: 500 }),
    body: k.bilingualRichText(L("eventsFieldBody")),
    startsAt: k.dateTime(L("eventsFieldStartsAt"), { required: true }),
    endsAt: k.dateTime(L("eventsFieldEndsAt")),
    isAllDay: k.checkbox(),
    location: k.bilingual(L("eventsFieldLocation"), { max: 200 }),
    place: k.reference(L("eventsFieldPlace")),
    owner: k.enumOf(L("fieldOwner"), OWNERS),
    category: k.enumOf(L("fieldCategory"), CATEGORIES, { required: false }),
    cover: k.reference(L("fieldCoverImage")),
    relatedForm: k.reference(L("eventsFieldRelatedForm")),
    registrationUrl: k.url(L("eventsFieldRegistrationUrl")),
    isCancelled: k.checkbox(),
    cancellationNote: k.bilingual(L("eventsFieldCancellationNote"), { max: 500 }),
  });

  const parsed = parseForm(schema, formDataToObject(formData));
  const errors: FieldErrors = parsed.ok ? {} : { ...parsed.errors };

  if (parsed.ok) {
    const data = parsed.data;
    if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) errors.endsAt = L("eventsErrEndsBeforeStart");

    const taken = await isSlugTaken(db, {
      table: events,
      slugColumn: events.slug,
      idColumn: events.id,
      slug: data.slug,
      excludeId: id ?? undefined,
    });
    if (taken) errors.slug = L("errSlugTaken");

    if (data.cover) {
      const images = await checkImages(db, [data.cover]);
      if (images.missing.includes(data.cover)) errors.cover = a("errSelectField", locale, { field: L("fieldCoverImage") });
      else if (publishing && images.undescribed.includes(data.cover)) errors.cover = L("errImageUndescribed");
    }
    if (data.place) {
      const found = await db.select({ id: places.id }).from(places).where(inArray(places.id, [data.place]));
      if (found.length === 0) errors.place = a("errSelectField", locale, { field: L("eventsFieldPlace") });
    }
    if (data.relatedForm) {
      const found = await db.select({ id: forms.id }).from(forms).where(inArray(forms.id, [data.relatedForm]));
      if (found.length === 0) errors.relatedForm = a("errSelectField", locale, { field: L("eventsFieldRelatedForm") });
    }
  }

  if (!parsed.ok || Object.keys(errors).length > 0) return { ok: false as const, errors };
  return { ok: true as const, data: parsed.data, ...resolved };
}

const pairOrNull = (p: { th: string; en: string }) => (p.th || p.en ? p : null);

/** The columns a validated event form writes. Optional text pairs are null when both languages are empty. */
export function eventValues(data: Extract<Awaited<ReturnType<typeof validateEventForm>>, { ok: true }>["data"]) {
  const location = pairOrNull(data.location);
  const note = pairOrNull(data.cancellationNote);
  return {
    slug: data.slug,
    titleTh: data.title.th,
    titleEn: data.title.en,
    summaryTh: data.summary.th,
    summaryEn: data.summary.en,
    bodyTh: data.body.th,
    bodyEn: data.body.en,
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    isAllDay: data.isAllDay,
    locationTh: location?.th ?? null,
    locationEn: location?.en ?? null,
    placeId: data.place,
    owner: data.owner,
    category: data.category,
    coverImageId: data.cover,
    relatedFormId: data.relatedForm,
    registrationUrl: data.registrationUrl,
    isCancelled: data.isCancelled,
    cancellationNoteTh: note?.th ?? null,
    cancellationNoteEn: note?.en ?? null,
  };
}
