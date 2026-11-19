const PRODUCTION_SITE_URL = "https://trytpc.tuso.tu.ac.th";

export const SITE_URL =
  process.env.VERCEL_ENV === "production"
    ? PRODUCTION_SITE_URL
    : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
