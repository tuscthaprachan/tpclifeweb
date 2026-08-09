/**
 * Type guard for `Policy.oversightOf`, which GROQ resolves to a partial
 * `Policy` (see `POLICY_OVERSIGHT_PROJECTION` in lib/sanity/queries.ts) when
 * the reference is live, or leaves as a plain `SanityRef` when it could not
 * be resolved (a dangling reference, or a document type oddity). Mirrors the
 * `isResolvedForm` guard in app/[locale]/welfare/[slug]/page.tsx.
 */

import type { Policy, SanityRef } from "@/lib/sanity/types";

export function isResolvedPolicy(value: Policy | SanityRef | undefined): value is Policy {
  return value !== undefined && (value as { _type?: string })._type === "policy";
}
