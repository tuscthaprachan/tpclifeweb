import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "./env";

/**
 * The general-purpose Sanity client, used for published content everywhere
 * that does not need Sanity Live (see `lib/sanity/live.ts` for that).
 *
 * This client never carries a read token, so it is safe to reference from
 * anywhere, including by accident from a client component: it can only ever
 * see published documents, never drafts.
 *
 * The CDN serves cached, slightly-stale responses, which is the right
 * trade-off in production. In development a change should show up on the
 * next request without waiting for the CDN to catch up.
 */
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: process.env.NODE_ENV === "production",
  perspective: "published",
});
