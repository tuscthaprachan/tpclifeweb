/**
 * Localised label and `StatusTag` tone for a `PolicyStatus`, so the activity
 * feed's policy-update rows say the same word for "in progress" that the
 * policy dashboard does (CONTRIBUTING.md: reuse a shared string rather than
 * inventing a synonym). Every `PolicyStatus` value already has a `UI.*`
 * entry (`UI.statusNotStarted` through `UI.statusDropped`); this just maps
 * the union to the right key and tone in one place.
 */

import type { StatusTone } from "@/components/ui";
import type { UiKey } from "@/lib/i18n/strings";
import type { PolicyStatus } from "@/lib/content/types";

export const POLICY_STATUS_LABEL_KEY: Record<PolicyStatus, UiKey> = {
  notStarted: "statusNotStarted",
  inProgress: "statusInProgress",
  delivered: "statusDelivered",
  blocked: "statusBlocked",
  dropped: "statusDropped",
};

/** `blocked` is the one status that demands attention; `dropped` is a settled end state, not an alarm, so it stays neutral rather than reusing `error`. */
export const POLICY_STATUS_TONE: Record<PolicyStatus, StatusTone> = {
  notStarted: "neutral",
  inProgress: "info",
  delivered: "success",
  blocked: "error",
  dropped: "neutral",
};
