import { defineQuery } from "next-sanity";

import { client } from "@/lib/sanity/client";
import { CACHE_TAGS } from "@/lib/sanity/env";
import type { NewsPost } from "@/lib/sanity/types";

const DOC_META = /* groq */ `_id, _type, _createdAt, _updatedAt,`;

/**
 * `lib/sanity/queries.ts` is a fixed contract and only exposes a paged list
 * for news (`getNewsPage`), no single-post lookup. This mirrors that query's
 * own item projection so the detail page can resolve one post by slug
 * without editing the shared file.
 */
export const NEWS_POST_BY_SLUG_QUERY = defineQuery(`
  *[_type == "newsPost" && slug.current == $slug][0]{
    ${DOC_META}
    ...
  }
`);

export async function getNewsPostBySlug(slug: string): Promise<NewsPost | null> {
  return client.fetch<NewsPost | null>(
    NEWS_POST_BY_SLUG_QUERY,
    { slug },
    { next: { tags: [CACHE_TAGS.news] } },
  );
}
