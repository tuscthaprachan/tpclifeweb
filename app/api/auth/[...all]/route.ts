/**
 * Better Auth's HTTP surface. The staff console's own forms use Server Actions
 * and never need this; it exists for the browser-side WebAuthn calls
 * (registering and using a passkey), which are plain fetches from the page.
 * Hooks in lib/auth/create.ts guard what each call may do.
 */

import { getAuth, isAuthConfigured } from "@/lib/auth";
import { whenDatabaseReady } from "@/lib/db";

export const dynamic = "force-dynamic";

async function handle(request: Request): Promise<Response> {
  if (!isAuthConfigured()) {
    return Response.json({ message: "Sign-in is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  await whenDatabaseReady();
  return getAuth().handler(request);
}

export { handle as GET, handle as POST };
