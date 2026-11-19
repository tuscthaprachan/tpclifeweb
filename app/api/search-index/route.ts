import { getSearchIndex } from "@/lib/content";
import { encodeSearchIndex } from "@/lib/search/wire";

export const dynamic = "force-static";
export const revalidate = 300;

export async function GET() {
  return new Response(JSON.stringify(encodeSearchIndex(await getSearchIndex())), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
