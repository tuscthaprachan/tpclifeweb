/**
 * Maps each `PolicyStatus` value onto the shared `UI.*` label it must render
 * as, and the `StatusTag` tone that carries it. Centralised here so the
 * dashboard, the filters, the list item and the update history all say the
 * same word for "blocked", per CONTRIBUTING.md ("Reuse a string... rather
 * than inventing a synonym").
 *
 * Tone choices, since PolicyStatus has no built-in colour of its own:
 *   notStarted -> neutral (a plain dot, nothing has happened yet)
 *   inProgress -> info    (under way, not yet a verdict)
 *   delivered  -> success (done)
 *   blocked    -> error   (stuck on something outside the owner's control)
 *   dropped    -> warning (a deliberate decision to stop, not a failure, so
 *                          it reads distinctly from "blocked" rather than
 *                          sharing its red)
 */

import type { StatusTone } from "@/components/ui/StatusTag";
import type { UiKey } from "@/lib/i18n/strings";
import type { PolicyStatus } from "@/lib/sanity/types";

export const STATUS_LABEL_KEY = {
  notStarted: "statusNotStarted",
  inProgress: "statusInProgress",
  delivered: "statusDelivered",
  blocked: "statusBlocked",
  dropped: "statusDropped",
} as const satisfies Record<PolicyStatus, UiKey>;

export const STATUS_TONE = {
  notStarted: "neutral",
  inProgress: "info",
  delivered: "success",
  blocked: "error",
  dropped: "warning",
} as const satisfies Record<PolicyStatus, StatusTone>;

/** Stable display order used everywhere a set of statuses is listed: filters, the summary row, the design catalogue. */
export const STATUS_ORDER: readonly PolicyStatus[] = ["notStarted", "inProgress", "blocked", "delivered", "dropped"];
