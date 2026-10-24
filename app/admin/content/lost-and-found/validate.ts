import { eq } from "drizzle-orm";
import { z } from "zod";
import { fieldKit, formDataToObject, parseForm } from "@/lib/admin/content/fields";
import { resolveIntent, type FieldErrors, type ResolvedIntent } from "@/lib/admin/content/form-state";
import { checkImages } from "@/lib/admin/content/images";
import type { AuditExecutor } from "@/lib/db/audit";
import { places } from "@/lib/db/schema";
import type { HelpContactJson } from "@/lib/db/schema/content/common";
import { OWNERS, LOST_FOUND_CATEGORIES, LOST_FOUND_KINDS, LOST_FOUND_STATUSES, type ContentStatus } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

export const CLAIM_CHANNELS = ["line", "email", "phone", "inPerson", "url"] as const;
export const MAX_PHOTOS = 10;

const filled = (formData: FormData, names: string[]) => names.some((n) => String(formData.get(n) ?? "").trim() !== "");

/**
 * Everything a lost and found listing form must satisfy, apart from writing
 * it. The private fields (reporter contact, verification detail) are only
 * length-checked; nothing here ever copies them into a public field.
 */
export async function validateLostFoundForm(
  db: AuditExecutor,
  input: { locale: Locale; formData: FormData; existingStatus?: ContentStatus },
) {
  const { locale, formData } = input;
  const L = (key: AdminKey) => a(key, locale);
  const resolved: ResolvedIntent = resolveIntent(formData, input.existingStatus);
  const { publishing } = resolved;

  // A claim contact is all or nothing: once any part is typed, the whole contact is needed.
  const anyClaim = filled(formData, ["claimLabel.th", "claimLabel.en", "claimChannel", "claimValue", "claimHours.th", "claimHours.en"]);

  const k = fieldKit(locale, publishing);
  const schema = z.object({
    kind: k.enumOf(L("lfFieldKind"), LOST_FOUND_KINDS),
    title: k.bilingual(L("fieldTitle"), { required: true, max: 200 }),
    description: k.bilingual(L("lfFieldDescription"), { required: true, max: 2000 }),
    category: k.enumOf(L("fieldCategory"), LOST_FOUND_CATEGORIES),
    placeId: k.reference(L("lfFieldPlace")),
    locationNote: k.bilingual(L("lfFieldLocationNote"), { max: 300 }),
    occurredOn: k.date(L("lfFieldOccurredOn"), { required: true }),
    registerStatus: k.enumOf(L("lfFieldProgress"), LOST_FOUND_STATUSES),
    heldAt: k.bilingual(L("lfFieldHeldAt"), { max: 300 }),
    claimBy: k.date(L("lfFieldClaimBy")),
    claimLabel: k.bilingual(L("blockContactLabel"), { required: anyClaim, max: 100 }),
    claimChannel: k.enumOf(L("blockContactChannel"), CLAIM_CHANNELS, { required: anyClaim }),
    claimValue: k.text(L("blockContactValue"), { required: anyClaim, max: 300 }),
    claimHours: k.bilingual(L("blockContactHours"), { max: 100 }),
    owner: k.enumOf(L("fieldOwner"), OWNERS),
    resolvedAt: k.dateTime(L("lfFieldResolvedAt")),
    photos: k.references(L("lfFieldPhotos"), { max: MAX_PHOTOS }),
    submitterContact: k.nullableText(L("lfFieldSubmitterContact"), { max: 500 }),
    staffVerificationDetail: k.nullableText(L("lfFieldVerification"), { max: 2000 }),
  });

  const parsed = parseForm(schema, formDataToObject(formData));
  const errors: FieldErrors = parsed.ok ? {} : { ...parsed.errors };

  if (parsed.ok) {
    const data = parsed.data;

    if (data.placeId) {
      const [place] = await db.select({ id: places.id }).from(places).where(eq(places.id, data.placeId));
      if (!place) errors.placeId = a("errSelectField", locale, { field: L("lfFieldPlace") });
    }
    if (publishing && !data.placeId && !data.locationNote.th && !data.locationNote.en) errors.placeId = L("lfErrLocation");

    if (data.claimChannel === "url") {
      const url = parseForm(z.object({ v: k.url(L("blockContactValue")) }), { v: data.claimValue });
      if (!url.ok) errors.claimValue = url.errors.v ?? L("lfErrClaimIncomplete");
    }

    const images = await checkImages(db, data.photos);
    if (images.missing.length > 0) errors.photos = a("errSelectField", locale, { field: L("lfFieldPhotos") });
    else if (publishing && images.undescribed.length > 0) errors.photos = L("errImageUndescribed");
  }

  if (!parsed.ok || Object.keys(errors).length > 0) return { ok: false as const, errors };
  const d = parsed.data;
  const claimContact: HelpContactJson | null = anyClaim
    ? {
        label: d.claimLabel,
        channel: d.claimChannel!,
        value: d.claimValue,
        ...(d.claimHours.th || d.claimHours.en ? { hours: d.claimHours } : {}),
      }
    : null;
  const data = {
    kind: d.kind!,
    title: d.title,
    description: d.description,
    category: d.category!,
    placeId: d.placeId,
    locationNote: d.locationNote,
    occurredOn: d.occurredOn!,
    registerStatus: d.registerStatus!,
    heldAt: d.heldAt,
    claimBy: d.claimBy,
    claimContact,
    owner: d.owner!,
    resolvedAt: d.resolvedAt,
    photos: d.photos,
    submitterContact: d.submitterContact,
    staffVerificationDetail: d.staffVerificationDetail,
  };
  return { ok: true as const, data, ...resolved };
}

export type LostFoundFormData = Extract<Awaited<ReturnType<typeof validateLostFoundForm>>, { ok: true }>["data"];
