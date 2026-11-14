import "server-only";

import { draftMode } from "next/headers";
import { canEditContent } from "@/lib/admin/content/access";
import { getAdminSession } from "@/lib/auth/session";

/**
 * True when this request may see unpublished content: Draft Mode is on and the
 * visitor is still a signed-in editor or administrator. The cookie alone is
 * never enough, so a leaked or left-behind cookie shows readers nothing. Only
 * looks at the session when Draft Mode is on, so ordinary page views stay
 * static.
 */
export async function isPreview(): Promise<boolean> {
  const { isEnabled } = await draftMode();
  if (!isEnabled) return false;
  const staff = await getAdminSession();
  return Boolean(staff && canEditContent(staff.roles));
}

/** Metadata for a page being previewed: not indexed, not followed, not cached by anyone. */
export const PREVIEW_METADATA = { robots: { index: false, follow: false, nocache: true } } as const;
