import "server-only";

import { getDb } from "@/lib/db";
import { getLostFoundItemBySlug } from "@/lib/content";
import { ClaimUnavailableError, findClaimTarget } from "./submit";

export type ClaimState =
  | { state: "ok"; reference: string }
  | { state: "legacy" }
  | { state: "closed" }
  | { state: "missing" };

/** Whether the published found listing behind `slug` can be claimed online, from a public page. */
export async function claimStateFor(slug: string): Promise<ClaimState> {
  const item = await getLostFoundItemBySlug(slug);
  if (!item || item.kind !== "found") return { state: "missing" };
  try {
    const target = await findClaimTarget(getDb(), slug);
    return { state: "ok", reference: target.reference };
  } catch (error) {
    if (error instanceof ClaimUnavailableError) return error.reason === "no_case" ? { state: "legacy" } : error.reason === "closed" ? { state: "closed" } : { state: "missing" };
    throw error;
  }
}
