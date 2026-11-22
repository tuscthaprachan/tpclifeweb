import { faqs } from "../schema/content/pages";
import { places } from "../schema/content/directory";
import { CATEGORIES } from "../schema/content/enums";
import type { OpeningHoursJson } from "../schema/content/common";
import { FAQ_DOCS, PLACE_DOCS, type SeedDoc } from "./data/handbook";
import { excludedSet, published, rich, type Bi, type SeedDb } from "./util";

/**
 * The TU91 handbook content (lib/db/seed/data/handbook.ts): FAQs and places.
 * New organisations and the Thai-name enrichments are applied by
 * seed/directory.ts. Portable Text is converted to ProseMirror here.
 */

type Category = (typeof CATEGORIES)[number];

/** The old docs carry `{ _type, th, en }` locale objects; take just th and en. */
const bi = (v: unknown): Bi => {
  const o = v as Bi;
  return { th: o.th, en: o.en };
};

/** The slug is the doc id minus its type prefix (the handbook FAQs had no slug field of their own). */
const faqSlug = (doc: SeedDoc) => doc._id.replace(/^faq-/, "");

export async function seedHandbook(db: SeedDb): Promise<void> {
  for (const doc of FAQ_DOCS) {
    const question = bi(doc.question);
    const answer = doc.answer as { th: unknown[]; en: unknown[] };
    await db
      .insert(faqs)
      .values({
        ...published(),
        slug: faqSlug(doc),
        questionTh: question.th,
        questionEn: question.en,
        answerTh: rich(answer.th),
        answerEn: rich(answer.en),
        category: doc.category as Category,
        sortOrder: doc.order as number,
      })
      .onConflictDoUpdate({ target: faqs.slug, set: excludedSet(faqs) });
  }

  for (const doc of PLACE_DOCS) {
    const building = doc.building ? bi(doc.building) : null;
    const description = doc.description ? bi(doc.description) : null;
    const hours: OpeningHoursJson[] = ((doc.openingHours as Array<Record<string, unknown>> | undefined) ?? []).map(
      (h) => ({
        daysOfWeek: h.daysOfWeek as number[],
        opens: h.opens as string,
        closes: h.closes as string,
        ...(h.note ? { note: bi(h.note) } : {}),
        ...(h.validFrom ? { validFrom: h.validFrom as string } : {}),
        ...(h.validUntil ? { validUntil: h.validUntil as string } : {}),
      }),
    );
    await db
      .insert(places)
      .values({
        ...published(),
        slug: (doc.slug as { current: string }).current,
        nameTh: bi(doc.name).th,
        nameEn: bi(doc.name).en,
        buildingTh: building?.th ?? null,
        buildingEn: building?.en ?? null,
        descriptionTh: description?.th ?? null,
        descriptionEn: description?.en ?? null,
        category: doc.category as Category,
        openingHours: hours,
        isKeyLocation: Boolean(doc.isKeyLocation),
      })
      .onConflictDoUpdate({ target: places.slug, set: excludedSet(places) });
  }
}
