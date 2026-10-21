/**
 * Static routes in both locales. Content-backed routes (individual forms,
 * news posts, events, policies, directory entries, places) are not here yet:
 *
 * TODO(sanity-integration): once lib/sanity/client.ts exists, extend this
 * with a query for every published slug of each document type in
 * lib/sanity/types.ts, mapped through `localePath` the same way the static
 * routes below are.
 *
 * Lost and found is the exception: lib/sanity/client.ts and
 * lib/sanity/queries.ts already exist (they are fixed contracts this agent
 * reads but does not edit), so its two static routes plus every published
 * entry are wired in below. `getLostFoundPage` already fails safe (returns
 * an empty list rather than throwing) if Sanity is briefly unreachable at
 * build time, so a fetch problem here degrades the sitemap rather than
 * breaking the build. News and events should follow this same shape once
 * whoever owns them is ready; nothing about this pattern is lost-and-found
 * specific.
 */

import type { MetadataRoute } from "next";
import { LOCALES, localePath } from "@/lib/i18n/config";
import { getCanteenData, getLostFoundPage } from "@/lib/sanity/queries";
import { SITE_URL } from "@/lib/site-url";

const STATIC_ROUTES = [
  "/",
  "/search",
  "/forms",
  "/getting-around",
  "/welfare",
  "/news",
  "/events",
  "/policy",
  "/directory",
  "/faq",
  "/about",
  "/accessibility",
  "/cookies",
  "/lost-and-found",
  "/lost-and-found/report",
  "/eat",
  "/eat/dishes",
  "/eat/stalls",
  "/eat/map",
  "/eat/meal",
  "/eat/week",
  "/eat/group",
  "/eat/what-is",
];

// A large page size rather than a dedicated "every slug" query, the same
// trade-off app/[locale]/lost-and-found/[slug]/page.tsx makes for
// generateStaticParams, and for the same reason: lib/sanity/queries.ts is a
// fixed contract and only exposes a paged list.
const MAX_SITEMAP_ITEMS = 1000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticEntries = LOCALES.flatMap((locale) =>
    STATIC_ROUTES.map((route) => ({
      url: `${SITE_URL}${localePath(locale, route)}`,
      lastModified,
    })),
  );

  const { items } = await getLostFoundPage({}, 1, MAX_SITEMAP_ITEMS);
  const lostFoundEntries = LOCALES.flatMap((locale) =>
    items.map((item) => ({
      url: `${SITE_URL}${localePath(locale, `/lost-and-found/${item.slug.current}`)}`,
      lastModified: new Date(item._updatedAt),
    })),
  );

  // What to eat: one page per dish and per stall, from Sanity or, until the survey is imported, the surveyed dataset.
  const canteen = await getCanteenData();
  const canteenEntries = LOCALES.flatMap((locale) => [
    ...canteen.dishes.map((dish) => ({
      url: `${SITE_URL}${localePath(locale, `/eat/dishes/${dish.slug.current}`)}`,
      lastModified: new Date(dish._updatedAt),
    })),
    ...canteen.stalls.map((stall) => ({
      url: `${SITE_URL}${localePath(locale, `/eat/stalls/${stall.slug.current}`)}`,
      lastModified: new Date(stall._updatedAt),
    })),
    ...canteen.canonicals.map((canonical) => ({
      url: `${SITE_URL}${localePath(locale, `/eat/what-is/${canonical.slug.current}`)}`,
      lastModified: new Date(canonical._updatedAt),
    })),
  ]);

  return [...staticEntries, ...lostFoundEntries, ...canteenEntries];
}
