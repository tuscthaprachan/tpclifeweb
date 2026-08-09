import { createClient } from "next-sanity";
import { defineLive } from "next-sanity/live";

import { apiVersion, dataset, projectId, readToken } from "./env";

/**
 * Sanity Live, for the at-a-glance surfaces that most need to feel current:
 * service alerts and the shuttle panel. Server-only, imported only from
 * Server Components.
 *
 * `serverToken` is passed but `browserToken` is not: this only ever reads
 * published content, never drafts, so the read token never has to reach the
 * browser bundle. See the warning on `readToken` in `lib/sanity/env.ts`.
 */
const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: "published",
});

export const { sanityFetch, SanityLive } = defineLive({
  client,
  serverToken: readToken || false,
});
