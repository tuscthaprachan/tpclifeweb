/**
 * Maps each `Category` / `Owner` value onto the shared `UI.*` label it must
 * render as. Centralised here so FormCard, FormList, FormFilters and the two
 * form pages all say the same word for "welfare" or "tusu", per
 * CONTRIBUTING.md ("Reuse a string... rather than inventing a synonym").
 */

import type { UiKey } from "@/lib/i18n/strings";
import type { Category, Owner } from "@/lib/sanity/types";

export const CATEGORY_LABEL_KEY = {
  transport: "categoryTransport",
  welfare: "categoryWelfare",
  activity: "categoryActivity",
  governance: "categoryGovernance",
} as const satisfies Record<Category, UiKey>;

export const OWNER_LABEL_KEY = {
  tusu: "ownerTusu",
  tusc: "ownerTusc",
  university: "ownerUniversity",
  joint: "ownerJoint",
} as const satisfies Record<Owner, UiKey>;
