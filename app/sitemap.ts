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
import { DEFAULT_LOCALE, LOCALES, localePath, type Locale } from "@/lib/i18n/config";
import { getCanteenData, getLostFoundPage } from "@/lib/content";
import { SITE_URL } from "@/lib/site-url";

const STATIC_ROUTES = [
  "/",
  "/search",
  "/services",
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
  "/performance",
  "/lost-and-found",
  "/lost-and-found/report",
  "/lost-and-found/found",
  "/lost-and-found/track",
  "/lost-and-found/privacy",
  "/complaints",
  "/complaints/track",
  "/complaints/privacy",
  "/borrow",
  "/borrow/availability",
  "/borrow/track",
  "/borrow/privacy",
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

function entry(locale: Locale, route: string, lastModified: Date): MetadataRoute.Sitemap[number] {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = `${SITE_URL}${localePath(l, route)}`;
  languages["x-default"] = `${SITE_URL}${localePath(DEFAULT_LOCALE, route)}`;
  return { url: `${SITE_URL}${localePath(locale, route)}`, lastModified, alternates: { languages } };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticEntries = LOCALES.flatMap((locale) =>
    STATIC_ROUTES.map((route) => entry(locale, route, lastModified)),
  );

  const { items } = await getLostFoundPage({}, 1, MAX_SITEMAP_ITEMS);
  const lostFoundEntries = LOCALES.flatMap((locale) =>
    items.map((item) => entry(locale, `/lost-and-found/${item.slug.current}`, new Date(item._updatedAt))),
  );

  // What to eat: one page per dish, stall and canonical dish.
  const canteen = await getCanteenData();
  const canteenEntries = LOCALES.flatMap((locale) => [
    ...canteen.dishes.map((dish) => entry(locale, `/eat/dishes/${dish.slug.current}`, new Date(dish._updatedAt))),
    ...canteen.stalls.map((stall) => entry(locale, `/eat/stalls/${stall.slug.current}`, new Date(stall._updatedAt))),
    ...canteen.canonicals.map((canonical) => entry(locale, `/eat/what-is/${canonical.slug.current}`, new Date(canonical._updatedAt))),
  ]);

  return [...staticEntries, ...lostFoundEntries, ...canteenEntries];
}
