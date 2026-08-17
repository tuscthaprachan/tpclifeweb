import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { parseBody } from "next-sanity/webhook";

import { CACHE_TAGS, revalidateSecret, type CacheTag } from "@/lib/sanity/env";

/**
 * Sanity webhook: invalidates exactly the surfaces a changed document affects.
 *
 * WHY THIS MATTERS MORE THAN IT LOOKS
 * Every query in `lib/sanity/queries.ts` is tagged, and every page is cached.
 * Without this route those tags are never invalidated, so an editor could
 * publish a service alert saying the shuttle is not running and students would
 * keep seeing the old page until somebody redeployed. For a site whose whole
 * purpose is live information, that is not a caching nicety, it is the
 * difference between the service working and not.
 *
 * SETUP
 * In sanity.io/manage, add a webhook:
 *   URL      https://<your-domain>/api/revalidate
 *   Dataset  production
 *   Trigger  create, update, delete
 *   Filter   (leave empty, to receive every type)
 *   Payload  {"_type": _type, "slug": slug.current}
 *   Secret   the same value as SANITY_REVALIDATE_SECRET
 *
 * The secret is verified as a signature over the raw body, not compared as a
 * bearer token, so a leaked URL alone cannot be used to force revalidation.
 */

/** Which cache tags each document type invalidates when it changes. */
const TAGS_BY_TYPE: Record<string, readonly CacheTag[]> = {
  siteSettings: [CACHE_TAGS.siteSettings],
  serviceAlert: [CACHE_TAGS.serviceAlert],
  shuttleRoute: [CACHE_TAGS.shuttle, CACHE_TAGS.searchIndex],
  form: [CACHE_TAGS.form, CACHE_TAGS.searchIndex],
  newsPost: [CACHE_TAGS.news, CACHE_TAGS.searchIndex],
  event: [CACHE_TAGS.event, CACHE_TAGS.searchIndex],
  policy: [CACHE_TAGS.policy, CACHE_TAGS.searchIndex],
  welfarePage: [CACHE_TAGS.content, CACHE_TAGS.searchIndex],
  guidePage: [CACHE_TAGS.content, CACHE_TAGS.searchIndex],
  faq: [CACHE_TAGS.faq, CACHE_TAGS.searchIndex],
  organisation: [CACHE_TAGS.directory, CACHE_TAGS.searchIndex],
  place: [CACHE_TAGS.place, CACHE_TAGS.searchIndex],
  lostFoundItem: [CACHE_TAGS.lostFound, CACHE_TAGS.searchIndex],
};

export async function POST(request: NextRequest) {
  if (!revalidateSecret) {
    // Refuse rather than accept unsigned requests. An unsecured revalidation
    // endpoint is a free way for anyone to evict the cache repeatedly.
    return NextResponse.json(
      { message: "SANITY_REVALIDATE_SECRET is not set, so revalidation is disabled." },
      { status: 500 },
    );
  }

  let body: { _type?: string; slug?: string } | null = null;
  let isValidSignature = false;

  try {
    const parsed = await parseBody<{ _type?: string; slug?: string }>(request, revalidateSecret);
    body = parsed.body;
    isValidSignature = parsed.isValidSignature === true;
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not read the webhook body." },
      { status: 400 },
    );
  }

  if (!isValidSignature) {
    return NextResponse.json({ message: "Invalid signature." }, { status: 401 });
  }

  const type = body?._type;
  if (!type) {
    return NextResponse.json({ message: "Payload is missing _type." }, { status: 400 });
  }

  const tags = TAGS_BY_TYPE[type];
  if (!tags) {
    // Not an error: a type we do not render simply has nothing to invalidate.
    return NextResponse.json({ revalidated: false, type, reason: "No cached surface uses this type." });
  }

  /*
   * Next 16 requires a cache-life profile as the second argument. "max" expires
   * the entry as aggressively as the profile set allows, which is what a
   * publish should do: an editor pressing publish expects students to see the
   * change, not to wait out a residual window.
   *
   * `updateTag` would be stricter still, but it is only callable from a Server
   * Action, and this is a webhook.
   */
  for (const tag of tags) {
    revalidateTag(tag, "max");
  }

  return NextResponse.json({ revalidated: true, type, tags, now: Date.now() });
}
