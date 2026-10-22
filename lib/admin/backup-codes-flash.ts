import "server-only";

/**
 * Carries the freshly made backup codes across the redirect from "confirm your
 * authenticator app" to the page that shows them once. It has to survive a
 * redirect because, without JavaScript, the page after a form post is rendered
 * with the cookies the browser sent, which do not yet include the new session.
 *
 * Signed, HttpOnly, scoped to the setup pages and gone after ten minutes or
 * when the person presses Continue, whichever is first.
 */

import { cookies } from "next/headers";
import { sealJson, unsealJson } from "@/lib/auth/flow-token";

const NAME = "trytpc_admin_backup";
const PATH = "/admin/set-up-security";

function secret(): string {
  return process.env.BETTER_AUTH_SECRET as string;
}

export async function storeBackupCodes(codes: string[]): Promise<void> {
  (await cookies()).set(NAME, sealJson({ codes }, secret()), {
    path: PATH,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
  });
}

export async function readBackupCodes(): Promise<string[] | null> {
  const parsed = unsealJson((await cookies()).get(NAME)?.value, secret()) as { codes?: unknown } | null;
  return Array.isArray(parsed?.codes) && parsed.codes.every((c) => typeof c === "string") ? (parsed.codes as string[]) : null;
}

export async function clearBackupCodes(): Promise<void> {
  (await cookies()).delete({ name: NAME, path: PATH });
}
