/**
 * Typed GROQ queries for every surface the site reads from Sanity.
 *
 * Each exported function fetches through the plain `client` (see
 * `lib/sanity/client.ts`) and tags its request with the right entry from
 * `CACHE_TAGS`, so the revalidation webhook can invalidate exactly the
 * surfaces a changed document actually affects. Service alerts and the
 * shuttle panel are the exception: pages that want those live should use
 * `sanityFetch` from `lib/sanity/live.ts` instead of the functions here.
 *
 * GROQ projections use `...` to take a document's own fields as stored
 * (safe for every field here, since none of them are references) and add
 * explicit `->` projections only for the reference fields that are worth
 * resolving up front, so a page does not have to make a second request just
 * to show a related form's title or a policy's oversight target.
 */
import { defineQuery } from "next-sanity";

import { client } from "./client";
import { CACHE_TAGS } from "./env";
import { safeFetch } from "./safe-fetch";
import { demoCanteenData, isCanteenDemo } from "@/lib/canteen/demo";
import { emptyCanteenData, normaliseCanteenData } from "@/lib/canteen/derive";
import { canteenSearchRecords } from "@/lib/search/canteen";
import type {
  CampusEvent,
  CanteenData,
  CampusPlace,
  Faq,
  FormRecord,
  LostFoundCategory,
  LostFoundItem,
  LostFoundKind,
  LostFoundStatus,
  NewsPost,
  Organisation,
  Policy,
  SearchIndex,
  SearchRecord,
  ServiceAlert,
  ShuttleRoute,
  SiteSettings,
  ContentPage,
} from "./types";

const DOC_META = /* groq */ `_id, _type, _createdAt, _updatedAt,`;

/* ------------------------------------------------------------------ *
 * Site settings
 * ------------------------------------------------------------------ */

export const SITE_SETTINGS_QUERY = defineQuery(`
  *[_type == "siteSettings"][0]{
    ${DOC_META}
    ...
  }
`);

export async function getSiteSettings(): Promise<SiteSettings | null> {
  return safeFetch<SiteSettings | null>(
    "getSiteSettings",
    () => client.fetch<SiteSettings | null>(
      SITE_SETTINGS_QUERY,
      {},
      { next: { tags: [CACHE_TAGS.siteSettings] } },
    ),
    null,
  );
}

/* ------------------------------------------------------------------ *
 * Service alerts
 * ------------------------------------------------------------------ */

/**
 * Alerts that are live right now: started, and either never ends or ends in
 * the future. Prefer `sanityFetch` from `lib/sanity/live.ts` on pages that
 * want these to update without a full reload; this plain version is for
 * anywhere that only needs a normal cached fetch (for example the sitemap
 * or a server action).
 */
export const ACTIVE_SERVICE_ALERTS_QUERY = defineQuery(`
  *[_type == "serviceAlert" && startsAt <= $now && (!defined(endsAt) || endsAt >= $now)]
    | order(severity desc, startsAt desc){
    ${DOC_META}
    ...
  }
`);

export async function getActiveServiceAlerts(now: string = new Date().toISOString()): Promise<ServiceAlert[]> {
  return safeFetch<ServiceAlert[]>(
    "getActiveServiceAlerts",
    () => client.fetch<ServiceAlert[]>(
      ACTIVE_SERVICE_ALERTS_QUERY,
      { now },
      { next: { tags: [CACHE_TAGS.serviceAlert] } },
    ),
    [],
  );
}

/* ------------------------------------------------------------------ *
 * Shuttle
 * ------------------------------------------------------------------ */

export const ACTIVE_SHUTTLE_ROUTES_QUERY = defineQuery(`
  *[_type == "shuttleRoute" && isActive == true] | order(name.en asc){
    ${DOC_META}
    ...
  }
`);

export async function getActiveShuttleRoutes(): Promise<ShuttleRoute[]> {
  return safeFetch<ShuttleRoute[]>(
    "getActiveShuttleRoutes",
    () => client.fetch<ShuttleRoute[]>(
      ACTIVE_SHUTTLE_ROUTES_QUERY,
      {},
      { next: { tags: [CACHE_TAGS.shuttle] } },
    ),
    [],
  );
}

/* ------------------------------------------------------------------ *
 * Forms
 * ------------------------------------------------------------------ */

export const FORMS_QUERY = defineQuery(`
  *[_type == "form" && isActive == true] | order(isPriority desc, title.en asc){
    ${DOC_META}
    ...
  }
`);

export async function getForms(): Promise<FormRecord[]> {
  return safeFetch<FormRecord[]>(
    "getForms",
    () => client.fetch<FormRecord[]>(FORMS_QUERY, {}, { next: { tags: [CACHE_TAGS.form] } }),
    [],
  );
}

export const PRIORITY_FORMS_QUERY = defineQuery(`
  *[_type == "form" && isActive == true && isPriority == true] | order(title.en asc){
    ${DOC_META}
    ...
  }
`);

export async function getPriorityForms(): Promise<FormRecord[]> {
  return safeFetch<FormRecord[]>(
    "getPriorityForms",
    () => client.fetch<FormRecord[]>(PRIORITY_FORMS_QUERY, {}, { next: { tags: [CACHE_TAGS.form] } }),
    [],
  );
}

export const FORM_BY_SLUG_QUERY = defineQuery(`
  *[_type == "form" && slug.current == $slug][0]{
    ${DOC_META}
    ...
  }
`);

export async function getFormBySlug(slug: string): Promise<FormRecord | null> {
  return safeFetch<FormRecord | null>(
    "getFormBySlug",
    () => client.fetch<FormRecord | null>(
      FORM_BY_SLUG_QUERY,
      { slug },
      { next: { tags: [CACHE_TAGS.form] } },
    ),
    null,
  );
}

/* ------------------------------------------------------------------ *
 * News
 * ------------------------------------------------------------------ */

export interface PagedNews {
  items: NewsPost[];
  total: number;
}

export const NEWS_PAGE_QUERY = defineQuery(`
  {
    "items": *[_type == "newsPost"] | order(publishedAt desc) [$start...$end]{
      ${DOC_META}
      ...
    },
    "total": count(*[_type == "newsPost"])
  }
`);

/** `page` is 1-based. */
export async function getNewsPage(page = 1, pageSize = 10): Promise<PagedNews> {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return safeFetch<PagedNews>(
    "getNewsPage",
    () => client.fetch<PagedNews>(
      NEWS_PAGE_QUERY,
      { start, end },
      { next: { tags: [CACHE_TAGS.news] } },
    ),
    // An unreadable news list is an empty news list, not a broken page. The
    // listing renders its "nothing here yet" state and keeps the navigation,
    // search and help contacts that the reader may actually have come for.
    { items: [], total: 0 },
  );
}

/* ------------------------------------------------------------------ *
 * Events
 * ------------------------------------------------------------------ */

const EVENT_PROJECTION = /* groq */ `
  ${DOC_META}
  ...,
  place->{ ${DOC_META} ... },
  relatedForm->{ ${DOC_META} ... }
`;

export const UPCOMING_EVENTS_QUERY = defineQuery(`
  *[_type == "event" && (!defined(endsAt) && startsAt >= $now || endsAt >= $now)]
    | order(startsAt asc){
    ${EVENT_PROJECTION}
  }
`);

export async function getUpcomingEvents(now: string = new Date().toISOString()): Promise<CampusEvent[]> {
  return safeFetch<CampusEvent[]>(
    "getUpcomingEvents",
    () => client.fetch<CampusEvent[]>(
      UPCOMING_EVENTS_QUERY,
      { now },
      { next: { tags: [CACHE_TAGS.event] } },
    ),
    [],
  );
}

export const EVENT_BY_SLUG_QUERY = defineQuery(`
  *[_type == "event" && slug.current == $slug][0]{
    ${EVENT_PROJECTION}
  }
`);

export async function getEventBySlug(slug: string): Promise<CampusEvent | null> {
  return safeFetch<CampusEvent | null>(
    "getEventBySlug",
    () => client.fetch<CampusEvent | null>(
      EVENT_BY_SLUG_QUERY,
      { slug },
      { next: { tags: [CACHE_TAGS.event] } },
    ),
    null,
  );
}

/* ------------------------------------------------------------------ *
 * Policies
 * ------------------------------------------------------------------ */

const POLICY_OVERSIGHT_PROJECTION = /* groq */ `
  ${DOC_META}
  title, slug, summary, owner, policyArea, status, progressPercent,
  startedAt, targetDate, completedAt
`;

const POLICY_PROJECTION = /* groq */ `
  ${DOC_META}
  ...,
  oversightOf->{ ${POLICY_OVERSIGHT_PROJECTION} }
`;

export const POLICIES_QUERY = defineQuery(`
  *[_type == "policy"] | order(owner asc, title.en asc){
    ${POLICY_PROJECTION}
  }
`);

export async function getPolicies(): Promise<Policy[]> {
  return safeFetch<Policy[]>(
    "getPolicies",
    () => client.fetch<Policy[]>(POLICIES_QUERY, {}, { next: { tags: [CACHE_TAGS.policy] } }),
    [],
  );
}

export const POLICY_BY_SLUG_QUERY = defineQuery(`
  *[_type == "policy" && slug.current == $slug][0]{
    ${POLICY_PROJECTION}
  }
`);

export async function getPolicyBySlug(slug: string): Promise<Policy | null> {
  return safeFetch<Policy | null>(
    "getPolicyBySlug",
    () => client.fetch<Policy | null>(
      POLICY_BY_SLUG_QUERY,
      { slug },
      { next: { tags: [CACHE_TAGS.policy] } },
    ),
    null,
  );
}

/* ------------------------------------------------------------------ *
 * Content pages (welfare and guide)
 * ------------------------------------------------------------------ */

const CONTENT_PAGE_PROJECTION = /* groq */ `
  ${DOC_META}
  ...,
  relatedForms[]->{ ${DOC_META} ... },
  relatedPages[]->{ ${DOC_META} ... }
`;

export const CONTENT_PAGE_BY_SLUG_QUERY = defineQuery(`
  *[_type == $type && slug.current == $slug][0]{
    ${CONTENT_PAGE_PROJECTION}
  }
`);

export async function getContentPageBySlug(
  type: "welfarePage" | "guidePage",
  slug: string,
): Promise<ContentPage | null> {
  return safeFetch<ContentPage | null>(
    "getContentPageBySlug",
    () => client.fetch<ContentPage | null>(
      CONTENT_PAGE_BY_SLUG_QUERY,
      { type, slug },
      { next: { tags: [CACHE_TAGS.content] } },
    ),
    null,
  );
}

export const CONTENT_PAGES_QUERY = defineQuery(`
  *[_type == $type] | order(order asc, title.en asc){
    ${CONTENT_PAGE_PROJECTION}
  }
`);

export async function getContentPages(type: "welfarePage" | "guidePage"): Promise<ContentPage[]> {
  return safeFetch<ContentPage[]>(
    "getContentPages",
    () => client.fetch<ContentPage[]>(
      CONTENT_PAGES_QUERY,
      { type },
      { next: { tags: [CACHE_TAGS.content] } },
    ),
    [],
  );
}

/* ------------------------------------------------------------------ *
 * FAQs
 * ------------------------------------------------------------------ */

export const FAQS_QUERY = defineQuery(`
  *[_type == "faq"] | order(order asc){
    ${DOC_META}
    ...,
    relatedForms[]->{ ${DOC_META} ... }
  }
`);

export async function getFaqs(): Promise<Faq[]> {
  return safeFetch<Faq[]>(
    "getFaqs",
    () => client.fetch<Faq[]>(FAQS_QUERY, {}, { next: { tags: [CACHE_TAGS.faq] } }),
    [],
  );
}

/* ------------------------------------------------------------------ *
 * Directory: organisations and places
 * ------------------------------------------------------------------ */

export const ORGANISATIONS_QUERY = defineQuery(`
  *[_type == "organisation" && isActive == true] | order(name.en asc){
    ${DOC_META}
    ...
  }
`);

export async function getOrganisations(): Promise<Organisation[]> {
  return safeFetch<Organisation[]>(
    "getOrganisations",
    () => client.fetch<Organisation[]>(
      ORGANISATIONS_QUERY,
      {},
      { next: { tags: [CACHE_TAGS.directory] } },
    ),
    [],
  );
}

export const KEY_PLACES_QUERY = defineQuery(`
  *[_type == "place" && isKeyLocation == true] | order(name.en asc){
    ${DOC_META}
    ...
  }
`);

export async function getKeyPlaces(): Promise<CampusPlace[]> {
  return safeFetch<CampusPlace[]>(
    "getKeyPlaces",
    () => client.fetch<CampusPlace[]>(KEY_PLACES_QUERY, {}, { next: { tags: [CACHE_TAGS.place] } }),
    [],
  );
}

export const PLACES_QUERY = defineQuery(`
  *[_type == "place"] | order(name.en asc){
    ${DOC_META}
    ...
  }
`);

export async function getPlaces(): Promise<CampusPlace[]> {
  return safeFetch<CampusPlace[]>(
    "getPlaces",
    () => client.fetch<CampusPlace[]>(PLACES_QUERY, {}, { next: { tags: [CACHE_TAGS.place] } }),
    [],
  );
}

/* ------------------------------------------------------------------ *
 * Lost and found
 *
 * `client` fetches with `perspective: "published"`, which is what makes the
 * public report form safe: a submission is written as a draft and simply is
 * not in any of these results until an editor publishes it. There is no
 * "pending" flag to get wrong.
 *
 * Filtering happens in GROQ rather than in the page, so the list works with
 * JavaScript off: the filter form submits query parameters, the server reads
 * them, and these queries do the work. Passing `null` for a filter means "do
 * not filter on this", which is why every predicate below is guarded with
 * `!defined($param)`.
 * ------------------------------------------------------------------ */

const LOST_FOUND_PROJECTION = /* groq */ `
  ${DOC_META}
  ...,
  place->{ ${DOC_META} ... }
`;

export interface LostFoundFilters {
  kind?: LostFoundKind | null;
  category?: LostFoundCategory | null;
  /** Omit to show only entries still open, which is what a searcher wants. */
  status?: LostFoundStatus | null;
}

export interface PagedLostFound {
  items: LostFoundItem[];
  total: number;
}

export const LOST_FOUND_PAGE_QUERY = defineQuery(`
  {
    "items": *[
      _type == "lostFoundItem"
      && (!defined($kind) || kind == $kind)
      && (!defined($category) || category == $category)
      && (!defined($status) || status == $status)
    ] | order(occurredOn desc, publishedAt desc) [$start...$end]{
      ${LOST_FOUND_PROJECTION}
    },
    "total": count(*[
      _type == "lostFoundItem"
      && (!defined($kind) || kind == $kind)
      && (!defined($category) || category == $category)
      && (!defined($status) || status == $status)
    ])
  }
`);

/** `page` is 1-based. */
export async function getLostFoundPage(
  filters: LostFoundFilters = {},
  page = 1,
  pageSize = 24,
): Promise<PagedLostFound> {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return safeFetch<PagedLostFound>(
    "getLostFoundPage",
    () => client.fetch<PagedLostFound>(
      LOST_FOUND_PAGE_QUERY,
      {
        start,
        end,
        kind: filters.kind ?? null,
        category: filters.category ?? null,
        status: filters.status ?? null,
      },
      { next: { tags: [CACHE_TAGS.lostFound] } },
    ),
    // An unreadable register is an empty register, not a broken page. The
    // reader still gets the report form and the contact details, which are
    // the two things they can act on when the list itself is unavailable.
    { items: [], total: 0 },
  );
}

export const LOST_FOUND_ITEM_BY_SLUG_QUERY = defineQuery(`
  *[_type == "lostFoundItem" && slug.current == $slug][0]{
    ${LOST_FOUND_PROJECTION}
  }
`);

export async function getLostFoundItemBySlug(slug: string): Promise<LostFoundItem | null> {
  return safeFetch<LostFoundItem | null>(
    "getLostFoundItemBySlug",
    () => client.fetch<LostFoundItem | null>(
      LOST_FOUND_ITEM_BY_SLUG_QUERY,
      { slug },
      { next: { tags: [CACHE_TAGS.lostFound] } },
    ),
    null,
  );
}

/**
 * Looks an entry up by the reference code a student was given, so someone
 * holding "LF-2026-0184" on a slip of paper can find it without describing
 * the item again. Matched case-insensitively, because the code gets written
 * down by hand.
 */
export const LOST_FOUND_ITEM_BY_REFERENCE_QUERY = defineQuery(`
  *[_type == "lostFoundItem" && lower(reference) == lower($reference)][0]{
    ${LOST_FOUND_PROJECTION}
  }
`);

export async function getLostFoundItemByReference(reference: string): Promise<LostFoundItem | null> {
  return safeFetch<LostFoundItem | null>(
    "getLostFoundItemByReference",
    () => client.fetch<LostFoundItem | null>(
      LOST_FOUND_ITEM_BY_REFERENCE_QUERY,
      { reference },
      { next: { tags: [CACHE_TAGS.lostFound] } },
    ),
    null,
  );
}

/**
 * The highest reference number issued so far, used to allocate the next one.
 * Returns 0 when the register is empty or unreadable, and the caller must
 * treat a collision as possible rather than assuming this is authoritative:
 * two submissions in the same second can read the same number. The report
 * action retries on conflict for exactly that reason.
 */
export const LOST_FOUND_LAST_REFERENCE_QUERY = defineQuery(`
  *[_type == "lostFoundItem" && defined(reference)] | order(reference desc)[0].reference
`);

/* ------------------------------------------------------------------ *
 * Search index
 *
 * One row per indexable document, both languages in the same record so a
 * Thai query finds an English-only match and back. `path` here follows the
 * site's locale-prefixed route convention (see `lib/i18n/config.ts`'s
 * `localePath`).
 *
 * Every path below has been checked against the routes that actually exist
 * under `app/[locale]`. Five of them were originally wrong and would have
 * produced search results linking to a 404: policies were built as
 * `/policies/` when the route is `/policy/`, shuttle routes and FAQs pointed
 * at pages that did not exist, and organisations and places assumed per-item
 * routes under `/directory` that are not there.
 *
 * Types without a page of their own now deep-link to the page that lists
 * them, using an anchor: shuttle routes to `/getting-around#route-{slug}`,
 * organisations and places to `/directory#org-{slug}` and `#place-{slug}`.
 * Those anchor ids must exist on the rendered items or the link lands at the
 * top of the page, which is degraded but not broken.
 *
 * EVERY OPERAND OF A `haystack` MUST BE WRAPPED IN `coalesce(..., "")`.
 * GROQ string concatenation is null-propagating: if any one operand is null
 * the whole expression becomes null, not a shorter string. `haystack` then
 * reaches `tokenise()` as null and the search page dies with
 * `Cannot read properties of null (reading 'normalize')`, for every reader
 * and not just for the one document at fault. A single optional field empty
 * by an editor, such as a form with no description, is enough to do it.
 * Coalescing a field that is currently required costs nothing and survives
 * the field later being made optional.
 *
 * If you add a document type here, add its route first.
 * ------------------------------------------------------------------ */

const SEARCH_INDEX_QUERY = defineQuery(`
  {
    "forms": *[_type == "form" && isActive == true]{
      "id": _id, "type": "form", "path": {"th": "/th/forms/" + slug.current, "en": "/en/forms/" + slug.current},
      title, "summary": purpose, category, owner,
      "haystack": coalesce(pt::text(description.th), "") + " " + coalesce(pt::text(description.en), "") + " " + coalesce(title.th, "") + " " + coalesce(title.en, "") + " " + coalesce(purpose.th, "") + " " + coalesce(purpose.en, ""),
      "weight": 100
    },
    "shuttleRoutes": *[_type == "shuttleRoute" && isActive == true]{
      "id": _id, "type": "shuttleRoute", "path": {"th": "/th/getting-around#route-" + slug.current, "en": "/en/getting-around#route-" + slug.current},
      // Projects name AS title. A shuttleRoute has no title field, it has a
      // name (see lib/sanity/types.ts), so naming title bare yielded null and
      // search() died reading .th off it, for every reader and not only for
      // this record. It stayed hidden for as long as the dataset held no
      // shuttleRoute, which was until the timetables were seeded.
      // No backticks in this comment: it lives inside a JS template literal.
      "title": name, "summary": {"th": coalesce(description.th, ""), "en": coalesce(description.en, "")},
      "haystack": coalesce(name.th, "") + " " + coalesce(name.en, "") + " " + coalesce(description.th, "") + " " + coalesce(description.en, ""),
      "weight": 100,
      "category": "transport"
    },
    "welfarePages": *[_type == "welfarePage"]{
      "id": _id, "type": "welfarePage", "path": {"th": "/th/welfare/" + slug.current, "en": "/en/welfare/" + slug.current},
      title, summary, category,
      "haystack": coalesce(title.th, "") + " " + coalesce(title.en, "") + " " + coalesce(summary.th, "") + " " + coalesce(summary.en, "") + " " + coalesce(pt::text(body.th), "") + " " + coalesce(pt::text(body.en), ""),
      "weight": 60
    },
    "guidePages": *[_type == "guidePage"]{
      "id": _id, "type": "guidePage", "path": {"th": "/th/guide/" + slug.current, "en": "/en/guide/" + slug.current},
      title, summary, category,
      "haystack": coalesce(title.th, "") + " " + coalesce(title.en, "") + " " + coalesce(summary.th, "") + " " + coalesce(summary.en, "") + " " + coalesce(pt::text(body.th), "") + " " + coalesce(pt::text(body.en), ""),
      "weight": 60
    },
    "faqs": *[_type == "faq"]{
      "id": _id, "type": "faq", "path": {"th": "/th/faq#" + _id, "en": "/en/faq#" + _id},
      "title": question, "summary": question, category,
      "haystack": coalesce(question.th, "") + " " + coalesce(question.en, "") + " " + coalesce(pt::text(answer.th), "") + " " + coalesce(pt::text(answer.en), ""),
      "weight": 50
    },
    "events": *[_type == "event" && isCancelled != true]{
      "id": _id, "type": "event", "path": {"th": "/th/events/" + slug.current, "en": "/en/events/" + slug.current},
      title, summary, category, owner,
      "haystack": coalesce(title.th, "") + " " + coalesce(title.en, "") + " " + coalesce(summary.th, "") + " " + coalesce(summary.en, ""),
      "weight": 40
    },
    "newsPosts": *[_type == "newsPost"]{
      "id": _id, "type": "newsPost", "path": {"th": "/th/news/" + slug.current, "en": "/en/news/" + slug.current},
      title, summary, category, owner,
      "haystack": coalesce(title.th, "") + " " + coalesce(title.en, "") + " " + coalesce(summary.th, "") + " " + coalesce(summary.en, ""),
      "weight": 20
    },
    "policies": *[_type == "policy"]{
      "id": _id, "type": "policy", "path": {"th": "/th/policy/" + slug.current, "en": "/en/policy/" + slug.current},
      title, summary, owner,
      "haystack": coalesce(title.th, "") + " " + coalesce(title.en, "") + " " + coalesce(summary.th, "") + " " + coalesce(summary.en, "") + " " + coalesce(policyArea.th, "") + " " + coalesce(policyArea.en, ""),
      "weight": 30
    },
    "organisations": *[_type == "organisation" && isActive == true]{
      "id": _id, "type": "organisation", "path": {"th": "/th/directory#org-" + slug.current, "en": "/en/directory#org-" + slug.current},
      "title": name, "summary": {"th": coalesce(faculty.th, ""), "en": coalesce(faculty.en, "")},
      "haystack": coalesce(name.th, "") + " " + coalesce(name.en, "") + " " + coalesce(faculty.th, "") + " " + coalesce(faculty.en, ""),
      "weight": 20
    },
    "places": *[_type == "place"]{
      "id": _id, "type": "place", "path": {"th": "/th/directory#place-" + slug.current, "en": "/en/directory#place-" + slug.current},
      "title": name, "summary": {"th": coalesce(building.th, ""), "en": coalesce(building.en, "")},
      "haystack": coalesce(name.th, "") + " " + coalesce(name.en, "") + " " + coalesce(building.th, "") + " " + coalesce(building.en, ""),
      "weight": 20,
      category
    },
    // Only entries still open are indexed. A returned umbrella is a true
    // fact about the past and stays on its own page, but putting it in
    // search means someone hunting for their umbrella today wades through
    // other people's closed entries first. The reference code is in the
    // haystack so pasting "LF-2026-0184" into the site search finds it.
    //
    // These are line comments, not a /* */ block. GROQ has no block comment
    // syntax: one here fails the whole query to parse, and safeFetch turns
    // that into a silently empty search index for EVERY type, not just this
    // one. It is a quiet failure, so it is worth stating plainly.
    "lostFoundItems": *[_type == "lostFoundItem" && status == "open"]{
      "id": _id, "type": "lostFoundItem", "path": {"th": "/th/lost-and-found/" + slug.current, "en": "/en/lost-and-found/" + slug.current},
      title, "summary": description, owner,
      "haystack": coalesce(title.th, "") + " " + coalesce(title.en, "") + " " + coalesce(description.th, "") + " " + coalesce(description.en, "") + " " + coalesce(reference, "") + " " + coalesce(locationNote.th, "") + " " + coalesce(locationNote.en, "") + " " + coalesce(place->name.th, "") + " " + coalesce(place->name.en, ""),
      "weight": 70
    }
  }
`);

interface SearchIndexRaw {
  forms: SearchRecord[];
  shuttleRoutes: SearchRecord[];
  welfarePages: SearchRecord[];
  guidePages: SearchRecord[];
  faqs: SearchRecord[];
  events: SearchRecord[];
  newsPosts: SearchRecord[];
  policies: SearchRecord[];
  organisations: SearchRecord[];
  places: SearchRecord[];
  lostFoundItems: SearchRecord[];
}

/** Every bucket empty. Used as the fallback when the index read fails. */
const EMPTY_SEARCH_INDEX_RAW: SearchIndexRaw = {
  forms: [],
  shuttleRoutes: [],
  welfarePages: [],
  guidePages: [],
  faqs: [],
  events: [],
  newsPosts: [],
  policies: [],
  organisations: [],
  places: [],
  lostFoundItems: [],
};

/** The canteen's search records, or none if anything about them goes wrong: a canteen problem must never take down site search. */
async function canteenSearchRecordsSafe(): Promise<SearchRecord[]> {
  try {
    return canteenSearchRecords(await getCanteenData());
  } catch {
    return [];
  }
}

/**
 * Fetches every indexable document and assembles the flat `SearchRecord[]`
 * described in `lib/sanity/types.ts`. Intended to run at build time, or on
 * a schedule, to produce the prebuilt index; it is one query per type
 * rather than one combined GROQ array so a single malformed document cannot
 * fail the whole index.
 */
export async function getSearchIndex(): Promise<SearchIndex> {
  const raw = await safeFetch<SearchIndexRaw>(
    "getSearchIndex",
    () => client.fetch<SearchIndexRaw>(
      SEARCH_INDEX_QUERY,
      {},
      { next: { tags: [CACHE_TAGS.searchIndex] } },
    ),
    // A failed read yields an empty index rather than a failed build. Search
    // then finds nothing and says so, which is recoverable; a build that dies
    // because the CMS blinked is not.
    EMPTY_SEARCH_INDEX_RAW,
  );

  const records: SearchRecord[] = [
    ...raw.forms,
    ...raw.shuttleRoutes,
    ...raw.welfarePages,
    ...raw.guidePages,
    ...raw.faqs,
    ...raw.events,
    ...raw.newsPosts,
    ...raw.policies,
    ...raw.organisations,
    ...raw.places,
    ...raw.lostFoundItems,
    // Canteen dishes and explainers are built in code from the one cached
    // canteen dataset, with canonical aliases folded into the haystack.
    ...(await canteenSearchRecordsSafe()),
  ];

  return { generatedAt: new Date().toISOString(), records };
}

/* ------------------------------------------------------------------ *
 * Canteen ("What to eat")
 * ------------------------------------------------------------------ */

/**
 * The whole canteen dataset in one request: around 300 dishes, roughly 40 KB
 * as JSON. One cached query feeds every page and is shipped once to the
 * client, so filtering is instant and the server and client run the same
 * code on the same data.
 *
 * REFERENCES. `dish.stall` and `dish.canonical` come back as references
 * (`{ _ref, _type }`), not expanded documents. That is deliberate: expanding
 * them would copy each stall into every one of its dishes and bloat the
 * payload that is sent to the browser. `lib/canteen/derive.ts` joins them
 * once with `indexCanteen(data)`. The one reference that IS expanded is the
 * settings' `canteen` place, because the opening hours live on it and only
 * one copy exists.
 *
 * Reads with the plain `client`, so the published perspective applies and
 * drafts never reach readers.
 */
export const CANTEEN_DATA_QUERY = defineQuery(`
  {
    "settings": *[_type == "canteenSettings"][0]{
      ${DOC_META}
      ...,
      canteen->{ ${DOC_META} name, slug, openingHours, closureNote }
    },
    "stalls": *[_type == "canteenStall"] | order(number asc){
      ${DOC_META}
      ...
    },
    "dishes": *[_type == "canteenDish"] | order(name.en asc){
      ${DOC_META}
      ...
    },
    "canonicals": *[_type == "canonicalDish"] | order(name.en asc){
      ${DOC_META}
      ...
    }
  }
`);

/**
 * Fetches the canteen dataset. Returns an empty but valid `CanteenData` when
 * nothing exists yet or when the CMS cannot be reached, so every canteen page
 * can render its empty state. The result is normalised: missing arrays become
 * empty arrays and dishes that point at a missing stall are dropped.
 */
export async function getCanteenData(): Promise<CanteenData> {
  // Preview only: a clearly labelled fictional dataset, never fetched from Sanity.
  if (isCanteenDemo()) return normaliseCanteenData(demoCanteenData());
  if (process.env.NODE_ENV !== "production" && process.env.CANTEEN_FIXTURE === "1") {
    const { makeData } = await import("@/tests/unit/canteen/fixture");
    return makeData();
  }
  const raw = await safeFetch<Partial<CanteenData> | null>(
    "getCanteenData",
    () => client.fetch<Partial<CanteenData> | null>(
      CANTEEN_DATA_QUERY,
      {},
      { next: { tags: [CACHE_TAGS.canteen] } },
    ),
    null,
  );
  return raw ? normaliseCanteenData(raw) : emptyCanteenData();
}
