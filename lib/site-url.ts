const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || (production ? `https://${production}` : "http://localhost:3000")
).replace(/\/+$/, "");
