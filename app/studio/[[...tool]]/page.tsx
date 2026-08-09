/**
 * The embedded Sanity Studio, mounted at every path under `/studio`. The
 * catch-all segment lets the Studio's own router (structure tool, document
 * panes, Vision) manage its URL without Next routing getting in the way.
 *
 * The Studio itself lives in `./Studio.tsx` behind a client boundary. See the
 * comment in that file: importing `sanity.config.ts` from a Server Component
 * breaks the build.
 */
import Studio from "./Studio";

export const dynamic = "force-static";

export default function StudioPage() {
  return <Studio />;
}
