/**
 * The canteen dataset as JSON, for the /eat pages to load once per browser session
 * (components/domain/canteen/data-client.ts) instead of carrying it in every page's payload.
 * Prerendered and revalidated on the same hour as the content cache (`REVALIDATE.content`).
 */

import { getCanteenData } from "@/lib/content";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const data = await getCanteenData();
  const body = JSON.stringify(data, (key, value: unknown) => (key === "_createdAt" || key === "_updatedAt" ? undefined : value));
  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
