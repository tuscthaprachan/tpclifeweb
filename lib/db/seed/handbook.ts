import { faqs } from "../schema/content/pages";
import { places } from "../schema/content/directory";
import type { ExternalLinkJson, OpeningHoursJson } from "../schema/content/common";
import { FAQ_DOCS, GUIDE_PAGE_DOCS, PLACE_DOCS, WELFARE_PAGE_DOCS, type SeedDoc } from "./data/handbook";
import { upsertContentPage, type PageSeed } from "./pages";
import { excludedSet, published, rich, type Bi, type SeedDb } from "./util";

/**
 * The TU91 handbook content (sanity/seed/handbook.ts): FAQs, welfare pages,
 * guide pages and places. New organisations and the Thai-name enrichments are
 * applied by seed/directory.ts. Portable Text is converted to ProseMirror here.
 */

type Category = PageSeed["category"];

/** The old docs carry `{ _type, th, en }` locale objects; take just th and en. */
const bi = (v: unknown): Bi => {
  const o = v as Bi;
  return { th: o.th, en: o.en };
};

function externalLinks(links: unknown): ExternalLinkJson[] {
  return ((links as Array<Record<string, unknown>> | undefined) ?? []).map((l) => ({
    label: bi(l.label),
    url: String(l.url),
    ...(l.description ? { description: bi(l.description) } : {}),
    requiresSignIn: Boolean(l.requiresSignIn),
  }));
}

function pageSeed(kind: PageSeed["kind"], doc: SeedDoc): PageSeed {
  const body = doc.body as { th: unknown[]; en: unknown[] };
  return {
    kind,
    slug: (doc.slug as { current: string }).current,
    title: bi(doc.title),
    summary: bi(doc.summary),
    bodyTh: body.th,
    bodyEn: body.en,
    category: doc.category as Category,
    relatedLinks: externalLinks(doc.relatedLinks),
    order: doc.order as number | undefined,
  };
}

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

  for (const doc of WELFARE_PAGE_DOCS) await upsertContentPage(db, pageSeed("welfare", doc));
  for (const doc of GUIDE_PAGE_DOCS) await upsertContentPage(db, pageSeed("guide", doc));

  for (const doc of PLACE_DOCS) {
    const building = doc.building ? bi(doc.building) : null;
    const description = doc.description ? bi(doc.description) : null;
    const hours: OpeningHoursJson[] = ((doc.openingHours as Array<Record<string, unknown>> | undefined) ?? []).map(
      (h) => ({
        daysOfWeek: h.daysOfWeek as number[],
        opens: h.opens as string,
        closes: h.closes as string,
        ...(h.note ? { note: bi(h.note) } : {}),
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
