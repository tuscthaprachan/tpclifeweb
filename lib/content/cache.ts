import "server-only";

import { unstable_cache } from "next/cache";

/**
 * Cache tags for the read layer. A change to one kind of content invalidates
 * only the surfaces that render it, so publishing a news post does not blow
 * away the shuttle timetable cache. `lib/content/revalidate.ts` maps each kind
 * of content to the tags it affects.
 */
export const CACHE_TAGS = {
  siteSettings: "siteSettings",
  serviceAlert: "serviceAlert",
  shuttle: "shuttle",
  form: "form",
  news: "news",
  event: "event",
  policy: "policy",
  content: "content",
  directory: "directory",
  faculty: "faculty",
  place: "place",
  faq: "faq",
  lostFound: "lostFound",
  canteen: "canteen",
  searchIndex: "searchIndex",
  image: "image",
  performance: "performance",
  openDataDocuments: "openDataDocuments",
  openDataPeople: "openDataPeople",
  openDataMeetings: "openDataMeetings",
  openDataBudget: "openDataBudget",
  openDataFunds: "openDataFunds",
  openDataReports: "openDataReports",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/**
 * Time-based revalidation, in seconds, as a safety net behind the tags. A
 * missed `revalidateFor` call (a failed request, a write made straight in the
 * database) heals itself within the window instead of staying wrong until the
 * next deploy.
 *
 * Alerts and the shuttle panel are the surfaces that most need to feel
 * current, and an alert expires by the clock rather than by an edit, so they
 * get a short window. Events are filtered by "has it ended yet", so they get a
 * medium one. Everything else only changes when someone edits it.
 */
export const REVALIDATE = {
  live: 60,
  events: 900,
  content: 3600,
} as const;

/**
 * Wraps a database read in the Next data cache.
 *
 * `unstable_cache` is the caching API for an app that has not turned on Cache
 * Components (this one has not: pages here use `searchParams`, route segment
 * config and `generateStaticParams`, which that mode reworks). It keys on the
 * function's arguments plus `keyParts`, so pass every input as an argument and
 * never read request data inside `fn`. Arguments and results must be JSON
 * serialisable: ISO strings, not `Date`s.
 *
 * A read that throws is not cached, so an outage heals on the next request.
 * Wrap the result in `safeFetch` to degrade to an empty page.
 */
export function cachedRead<Args extends unknown[], R>(
  keyParts: string[],
  tags: readonly CacheTag[],
  revalidate: number,
  fn: (...args: Args) => Promise<R>,
): (...args: Args) => Promise<R> {
  return unstable_cache(fn, keyParts, { tags: [...tags], revalidate });
}
