/**
 * Static routes in both locales, plus the lost and found entries and the
 * canteen pages, which are read from the database. Other content-backed
 * routes (individual forms, news posts, events, policies, welfare and guide
 * pages) are not here yet; they follow the same shape, each from its
 * `lib/content` list function mapped through `localePath`.
 *
 * Both reads fail safe (an empty list rather than a throw) if the database is
 * briefly unreachable at build time, so a fetch problem degrades the sitemap
 * rather than breaking the build.
 */

import type { MetadataRoute } from "next";
import { LOCALES, localePath } from "@/lib/i18n/config";
import { getCanteenData, getLostFoundPage } from "@/lib/content";
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
  "/lost-and-found/found",
  "/lost-and-found/track",
  "/lost-and-found/privacy",
  "/complaints",
  "/complaints/track",
  "/complaints/privacy",
  "/eat",
  "/eat/dishes",
  "/eat/stalls",
  "/eat/map",
  "/eat/plan",
  "/eat/what-is",
];

// A large page size rather than a dedicated "every slug" query, the same
// trade-off app/[locale]/lost-and-found/[slug]/page.tsx makes for
// generateStaticParams.
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

  // What to eat: one page per dish, stall and canonical dish.
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
