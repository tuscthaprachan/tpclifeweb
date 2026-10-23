import "server-only";

import { getDb } from "@/lib/db";
import type { ResolvedRefs, FormSummary, ImageInfo } from "@/components/domain/rich-text/types";
import { collectRichTextRefs } from "@/lib/rich-text/schema";
import type { RichTextDoc } from "@/lib/rich-text/types";
import { CACHE_TAGS, REVALIDATE, cachedRead } from "./cache";
import { readFormsByIds } from "./forms";
import { loadImages } from "./images";
import { safeFetch } from "./safe-fetch";

/**
 * Looks up everything the given rich text documents refer to, in two queries
 * however many documents and however many references there are: one for the
 * forms behind `formCallout` blocks, one for the images behind `image`
 * blocks. Pass every document a page renders (both bodies, every FAQ answer)
 * and hand the result to `RichText` as `resolved`.
 *
 * Only published forms resolve. A reference to a draft, retired or missing
 * row is left out, and `RichText` renders nothing for it. If the lookup fails
 * the page still renders, minus the form cards and pictures.
 */
export async function resolveRichTextRefs(docs: ReadonlyArray<RichTextDoc | null | undefined>): Promise<ResolvedRefs> {
  const formIds = new Set<string>();
  const imageIds = new Set<string>();
  for (const doc of docs) {
    const refs = collectRichTextRefs(doc);
    for (const id of refs.formIds) formIds.add(id);
    for (const id of refs.imageIds) imageIds.add(id);
  }
  const [forms, images] = await Promise.all([
    formIds.size > 0 ? safeFetch("resolveRichTextRefs.forms", () => cachedForms([...formIds].sort()), {}) : {},
    imageIds.size > 0 ? safeFetch("resolveRichTextRefs.images", () => cachedImages([...imageIds].sort()), {}) : {},
  ]);
  return {
    forms: new Map(Object.entries(forms)),
    images: new Map(Object.entries(images)),
  };
}

export async function readFormSummaries(ids: readonly string[]): Promise<Record<string, FormSummary>> {
  const found = await readFormsByIds(getDb(), ids);
  return Object.fromEntries(
    [...found].map(([id, form]) => [
      id,
      {
        id,
        slug: form.slug.current,
        title: form.title,
        purpose: form.purpose,
        requiresSignIn: form.requiresSignIn,
        signInType: form.signInType,
        isActive: form.isActive,
      },
    ]),
  );
}

export async function readImageInfos(ids: readonly string[]): Promise<Record<string, ImageInfo>> {
  const found = await loadImages(getDb(), ids);
  return Object.fromEntries([...found].map(([id, image]) => [id, { url: image.url }]));
}

// Plain objects, not Maps: the data cache stores JSON. Ids are sorted so the same set always hits the same entry.
const cachedForms = cachedRead(["rich-text-forms"], [CACHE_TAGS.form], REVALIDATE.content, readFormSummaries);
const cachedImages = cachedRead(["rich-text-images"], [CACHE_TAGS.image], REVALIDATE.content, readImageInfos);
