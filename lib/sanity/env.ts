/**
 * Sanity environment. Fails loudly at import time rather than producing a
 * confusing 401 halfway through a request.
 *
 * This file is a shared contract. Treat it as fixed.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const projectId = required(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  "NEXT_PUBLIC_SANITY_PROJECT_ID",
);

export const dataset = required(
  process.env.NEXT_PUBLIC_SANITY_DATASET,
  "NEXT_PUBLIC_SANITY_DATASET",
);

export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2025-02-19";

/**
 * Server only. Never import this into a client component: a read token in the
 * browser bundle exposes unpublished drafts to everyone.
 */
export const readToken = process.env.SANITY_API_READ_TOKEN ?? "";

/**
 * Server only, and used by exactly one code path: the lost and found report
 * form, which creates an unpublished draft for an editor to approve. Nothing
 * a reader can reach writes to Sanity except through that one action.
 *
 * Empty when unset. The submission action checks it and tells the student the
 * form is unavailable rather than accepting a report it cannot store. Do not
 * import this into a client component and do not reuse it for reads:
 * `readToken` exists for that and cannot mutate anything.
 */
export const writeToken = process.env.SANITY_API_WRITE_TOKEN ?? "";

export const revalidateSecret = process.env.SANITY_REVALIDATE_SECRET ?? "";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const studioUrl = "/studio";

/**
 * Cache tags used by the revalidation webhook. A change to one document type
 * invalidates only the surfaces that render it, so publishing a news post does
 * not blow away the shuttle timetable cache.
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
  place: "place",
  faq: "faq",
  lostFound: "lostFound",
  searchIndex: "searchIndex",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
