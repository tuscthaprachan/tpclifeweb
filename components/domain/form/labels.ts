/**
 * Maps each `Category` / `Owner` value onto the shared `UI.*` label it must
 * render as. Centralised here so FormCard, FormList, FormFilters and the two
 * form pages all say the same word for "welfare" or "tusu", per
 * CONTRIBUTING.md ("Reuse a string... rather than inventing a synonym").
 */

import type { Locale, LocaleString } from "@/lib/i18n/config";
import type { UiKey } from "@/lib/i18n/strings";
import type { Category, FormRecord, Owner } from "@/lib/content/types";

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

export const SIGN_IN_ON_FORM: LocaleString = { th: "ต้องเข้าสู่ระบบ", en: "Sign in required" };

export const SIGN_IN_ON_FORM_TU: LocaleString = {
  th: "ต้องเข้าสู่ระบบด้วยบัญชี TU",
  en: "Sign in required (TU account)",
};

export const NO_SIGN_IN_ON_FORM: LocaleString = { th: "ไม่ต้องเข้าสู่ระบบ", en: "No sign in needed" };

export function signInBadgeLabel(signInType: FormRecord["signInType"], locale: Locale): string {
  return (signInType === "google" || signInType === "tuAccount" ? SIGN_IN_ON_FORM_TU : SIGN_IN_ON_FORM)[locale];
}
