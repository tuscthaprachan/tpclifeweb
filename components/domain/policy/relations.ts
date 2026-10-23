/**
 * Type guard for `Policy.oversightOf`, which the read layer resolves to a
 * partial `Policy` (title, summary, owner, status and dates, without its own
 * detail or history) when the target is published. It is absent when the
 * target is a draft or has been deleted.
 */

import type { Policy } from "@/lib/content/types";

export function isResolvedPolicy(value: Policy | undefined): value is Policy {
  return value !== undefined && value._type === "policy";
}
