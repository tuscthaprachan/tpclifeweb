"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { EMPTY_FORM_STATE, isUuid, type ContentFormState } from "@/lib/admin/content/form-state";
import { ContentConflictError, ContentNotFoundError, deleteContent, saveContent } from "@/lib/admin/content/save";
import { getAdminLocale } from "@/lib/admin/locale";
import { getDb } from "@/lib/db";
import { shuttleRoutes, shuttleStops } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { validateShuttleForm } from "./validate";

const LIST = "/admin/content/shuttle";

/**
 * Create (id null) or update a shuttle route with its stops. Bound to the page
 * with `.bind(null, id)`; returns field errors, or redirects to the edit page
 * when saved.
 */
export async function saveShuttleRoute(id: string | null, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  const db = getDb();
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);

  if (id !== null && !isUuid(id)) return { errors: {}, formError: L("errNotFound") };
  const [existing] = id ? await db.select({ status: shuttleRoutes.status }).from(shuttleRoutes).where(eq(shuttleRoutes.id, id)) : [];
  if (id && !existing) return { errors: {}, formError: L("errNotFound") };

  const checked = await validateShuttleForm(db, { locale, id, formData, existingStatus: existing?.status });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };
  const { status, intent } = checked;
  const d = checked.data;

  let saved;
  try {
    saved = await saveContent({
      entityType: "shuttleRoute",
      table: shuttleRoutes,
      actor: await contentActor(staff),
      id: id ?? undefined,
      status,
      values: {
        slug: d.slug,
        nameTh: d.name.th,
        nameEn: d.name.en,
        descriptionTh: d.description.th || null,
        descriptionEn: d.description.en || null,
        daysOfWeek: d.daysOfWeek,
        excludedDates: d.excludedDates,
        addedDates: d.addedDates,
        validFrom: d.validFrom,
        validUntil: d.validUntil,
        departures: d.departures,
        fareTh: d.fare.th || null,
        fareEn: d.fare.en || null,
        notesTh: d.notes.th || null,
        notesEn: d.notes.en || null,
        realtimeFeedUrl: d.realtimeFeedUrl,
        isActive: d.isActive,
        sourceNoteTh: d.sourceNote.th || null,
        sourceNoteEn: d.sourceNote.en || null,
        lastVerified: d.lastVerified,
      },
      children: async (tx, routeId) => {
        await tx.delete(shuttleStops).where(eq(shuttleStops.routeId, routeId));
        const stopRows = d.stops.map((stop, position) => ({
          routeId,
          position,
          nameTh: stop.name.th,
          nameEn: stop.name.en,
          offsetMinutes: stop.offsetMinutes,
          noteTh: stop.note.th || null,
          noteEn: stop.note.en || null,
          lat: stop.lat,
          lng: stop.lng,
        }));
        if (stopRows.length > 0) await tx.insert(shuttleStops).values(stopRows);
        return { stops: stopRows };
      },
    });
  } catch (error) {
    if (error instanceof ContentConflictError) return { errors: { slug: L("errSlugTaken") } };
    if (error instanceof ContentNotFoundError) return { errors: {}, formError: L("errNotFound") };
    throw error;
  }
  const notice = intent === "publish" ? "published" : intent === "unpublish" ? "unpublished" : existing?.status === "published" ? "updated" : "saved";
  redirect(`${LIST}/${saved.id}?saved=${notice}`);
}

/** Deletes a shuttle route (its stops go with it) and returns to the list. Bound with `.bind(null, id)`. */
export async function deleteShuttleRoute(id: string): Promise<void> {
  const staff = await requireEditor();
  if (!isUuid(id)) redirect(LIST);
  try {
    await deleteContent({ entityType: "shuttleRoute", table: shuttleRoutes, actor: await contentActor(staff), id });
  } catch (error) {
    if (!(error instanceof ContentNotFoundError)) throw error;
  }
  redirect(`${LIST}?notice=deleted`);
}
