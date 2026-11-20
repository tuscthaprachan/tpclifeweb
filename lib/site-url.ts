const PRODUCTION_SITE_URL = "https://trytpc.tuso.tu.ac.th";

export const IS_PRODUCTION_SITE = process.env.VERCEL_ENV === "production" || process.env.SITE_ENV === "production";

export const SITE_URL = IS_PRODUCTION_SITE
  ? PRODUCTION_SITE_URL
  : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
