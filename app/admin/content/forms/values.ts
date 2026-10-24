import { toPrerequisites } from "../_pages/rows";
import type { validateFormRecordForm } from "./validate";

type FormRecordData = Extract<Awaited<ReturnType<typeof validateFormRecordForm>>, { ok: true }>["data"];

/** An empty rich text document is stored as null, so "no description" reads as absent. */
const orNull = <T extends { content: unknown[] }>(doc: T): T | null => (doc.content.length === 0 ? null : doc);

/** The `forms` columns a validated form record's form sets. */
export function formValues(d: FormRecordData): Record<string, unknown> {
  return {
    slug: d.slug,
    titleTh: d.title.th,
    titleEn: d.title.en,
    purposeTh: d.purpose.th,
    purposeEn: d.purpose.en,
    descriptionTh: orNull(d.description.th),
    descriptionEn: orNull(d.description.en),
    category: d.category,
    owner: d.owner,
    audienceTh: d.audience.th || null,
    audienceEn: d.audience.en || null,
    prerequisites: toPrerequisites(d.prerequisites),
    requiresSignIn: d.requiresSignIn,
    signInType: d.signInType,
    signInNoteTh: d.signInNote.th || null,
    signInNoteEn: d.signInNote.en || null,
    destinationType: d.destinationType,
    destinationUrl: d.destinationUrl,
    estimatedMinutes: d.estimatedMinutes,
    turnaroundTh: d.turnaround.th || null,
    turnaroundEn: d.turnaround.en || null,
    deadline: d.deadline,
    contact: d.contact
      ? { label: d.contact.label, channel: d.contact.channel!, value: d.contact.value, ...(d.contact.hours.th || d.contact.hours.en ? { hours: d.contact.hours } : {}) }
      : null,
    isActive: d.isActive,
    isPriority: d.isPriority,
    lastVerified: d.lastVerified,
  };
}
