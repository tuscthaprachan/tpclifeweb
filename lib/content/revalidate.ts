import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { LOCALES, localePath } from "@/lib/i18n/config";
import { CACHE_TAGS, type CacheTag } from "./cache";

/**
 * The kinds of content a write can change. Phase 3's admin Server Actions call
 * `revalidateFor(entityType, slug)` after committing a change, which expires
 * the cache tags for that kind of content.
 */
export type ContentEntityType =
  | "siteSettings"
  | "serviceAlert"
  | "shuttleRoute"
  | "form"
  | "newsPost"
  | "event"
  | "policy"
  | "welfarePage"
  | "guidePage"
  | "faq"
  | "organisation"
  | "place"
  | "lostFoundItem"
  | "canteenSettings"
  | "canteenStall"
  | "canteenDish"
  | "canonicalDish"
  | "image";

/** Which cache tags each kind of content invalidates when it changes. */
export const TAGS_BY_TYPE: Record<ContentEntityType, readonly CacheTag[]> = {
  siteSettings: [CACHE_TAGS.siteSettings],
  serviceAlert: [CACHE_TAGS.serviceAlert],
  shuttleRoute: [CACHE_TAGS.shuttle, CACHE_TAGS.searchIndex],
  // Forms are embedded in events, content pages, FAQs and rich text callouts.
  form: [CACHE_TAGS.form, CACHE_TAGS.searchIndex],
  newsPost: [CACHE_TAGS.news, CACHE_TAGS.searchIndex],
  event: [CACHE_TAGS.event, CACHE_TAGS.searchIndex],
  policy: [CACHE_TAGS.policy, CACHE_TAGS.searchIndex],
  welfarePage: [CACHE_TAGS.content, CACHE_TAGS.searchIndex],
  guidePage: [CACHE_TAGS.content, CACHE_TAGS.searchIndex],
  faq: [CACHE_TAGS.faq, CACHE_TAGS.searchIndex],
  organisation: [CACHE_TAGS.directory, CACHE_TAGS.searchIndex],
  // The canteen dataset, events and lost and found embed their place, so a place edit refreshes them too.
  place: [CACHE_TAGS.place, CACHE_TAGS.canteen, CACHE_TAGS.searchIndex],
  lostFoundItem: [CACHE_TAGS.lostFound, CACHE_TAGS.searchIndex],
  // The canteen is one cached dataset (settings, stalls, dishes, canonical
  // dishes), so a change to any of the four refreshes the whole thing. Dishes
  // and canonical dish aliases join the search index, so those types also
  // invalidate its tag.
  canteenSettings: [CACHE_TAGS.canteen],
  canteenStall: [CACHE_TAGS.canteen, CACHE_TAGS.searchIndex],
  canteenDish: [CACHE_TAGS.canteen, CACHE_TAGS.searchIndex],
  canonicalDish: [CACHE_TAGS.canteen, CACHE_TAGS.searchIndex],
  // Pictures appear in news, events, lost and found, the canteen and rich text.
  image: [CACHE_TAGS.image],
};

/** The route segment of the detail page for kinds that have one, so a changed slug's own page is refreshed. */
const DETAIL_ROUTE: Partial<Record<ContentEntityType, string>> = {
  form: "/forms",
  newsPost: "/news",
  event: "/events",
  policy: "/policy",
  welfarePage: "/welfare",
  guidePage: "/guide",
  lostFoundItem: "/lost-and-found",
};

/**
 * Marks everything that renders this kind of content as stale. The next visit
 * is served the old page while a fresh one is built (stale-while-revalidate),
 * so a reader never waits on an edit. Pass `slug` for kinds with a detail page
 * to refresh that page too. Server Actions and Route Handlers only.
 *
 * Returns the tags it invalidated.
 */
export function revalidateFor(entityType: ContentEntityType, slug?: string): readonly CacheTag[] {
  const tags = TAGS_BY_TYPE[entityType];
  for (const tag of tags) revalidateTag(tag, "max");
  const base = DETAIL_ROUTE[entityType];
  if (base && slug) {
    for (const locale of LOCALES) revalidatePath(localePath(locale, `${base}/${slug}`));
  }
  return tags;
}
