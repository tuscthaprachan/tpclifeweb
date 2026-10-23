import { FAQ_DOCS, GUIDE_PAGE_DOCS, NEW_ORGANISATION_DOCS, PLACE_DOCS, WELFARE_PAGE_DOCS } from "@/lib/db/seed/data/handbook";
import { GUIDE_PAGES } from "@/lib/db/seed/pages";

/**
 * Every record the Postgres content seed builds from Portable Text blocks: the
 * handbook data (FAQs, welfare and guide pages, places, organisations) and the
 * hand-built guide pages in lib/db/seed/pages.ts. These are plain data, so
 * they are read directly.
 */
export async function loadSeedDocs(): Promise<Array<Record<string, unknown>>> {
  const guidePages = GUIDE_PAGES.map((page) => ({
    _id: `guide-${page.slug}`,
    bodyTh: page.bodyTh,
    bodyEn: page.bodyEn,
  }));
  return [
    ...FAQ_DOCS,
    ...WELFARE_PAGE_DOCS,
    ...GUIDE_PAGE_DOCS,
    ...PLACE_DOCS,
    ...NEW_ORGANISATION_DOCS,
    ...guidePages,
  ] as Array<Record<string, unknown>>;
}

type PtBlock = { _type: string; [key: string]: unknown };

/** Every array in a seed record that looks like Portable Text, with where it was found. */
export function findPortableText(docs: Array<Record<string, unknown>>): Array<{ where: string; blocks: PtBlock[] }> {
  const found: Array<{ where: string; blocks: PtBlock[] }> = [];
  const walk = (value: unknown, where: string) => {
    if (Array.isArray(value)) {
      if (value.length > 0 && value.every((v) => typeof v === "object" && v !== null && "_type" in v) && value.some((v) => (v as PtBlock)._type === "block")) {
        found.push({ where, blocks: value as PtBlock[] });
        return;
      }
      value.forEach((v, i) => walk(v, `${where}[${i}]`));
    } else if (typeof value === "object" && value !== null) {
      for (const [k, v] of Object.entries(value)) walk(v, `${where}.${k}`);
    }
  };
  docs.forEach((doc) => walk(doc, String(doc._id)));
  return found;
}
