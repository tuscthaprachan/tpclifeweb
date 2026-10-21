const PRODUCTION_SITE_URL = "https://tpclife.vercel.app";

export const SITE_URL =
  process.env.VERCEL_ENV === "production"
    ? PRODUCTION_SITE_URL
    : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
