/**
 * The Studio and the API routes are the only things not meant for a crawler.
 * Everything else is public by design: the entire point of this site is to
 * be more findable than the Linktrees and PDFs it replaces.
 */

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/studio", "/api"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
