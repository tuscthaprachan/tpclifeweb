import { CATEGORIES, OWNERS } from "@/lib/db/schema/content/enums";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

/** Pick-list options, labelled with the public site's own wording so staff see what readers see. */

const OWNER_LABEL = { tusu: UI.ownerTusu, tusc: UI.ownerTusc, university: UI.ownerUniversity, joint: UI.ownerJoint } as const;
const CATEGORY_LABEL = {
  transport: UI.categoryTransport,
  welfare: UI.categoryWelfare,
  activity: UI.categoryActivity,
  governance: UI.categoryGovernance,
} as const;

export const ownerOptions = (locale: Locale) => OWNERS.map((value) => ({ value, label: OWNER_LABEL[value][locale] }));
export const categoryOptions = (locale: Locale) => CATEGORIES.map((value) => ({ value, label: CATEGORY_LABEL[value][locale] }));
