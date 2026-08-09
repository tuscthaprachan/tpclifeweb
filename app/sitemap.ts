/**
 * Static routes in both locales. Content-backed routes (individual forms,
 * news posts, events, policies, directory entries, places) are not here yet:
 *
 * TODO(sanity-integration): once lib/sanity/client.ts exists, extend this
 * with a query for every published slug of each document type in
 * lib/sanity/types.ts, mapped through `localePath` the same way the static
 * routes below are.
 */

import type { MetadataRoute } from "next";
import { LOCALES, localePath } from "@/lib/i18n/config";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return LOCALES.flatMap((locale) =>
    STATIC_ROUTES.map((route) => ({
      url: `${SITE_URL}${localePath(locale, route)}`,
      lastModified,
    })),
  );
}
