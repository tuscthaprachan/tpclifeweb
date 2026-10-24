"use client";

import { createContext, useContext } from "react";
import type { FieldErrors } from "@/lib/admin/content/form-state";
import type { Locale } from "@/lib/i18n/config";

/** What `ContentForm` shares with the fields inside it. Fields read their own error by name; no prop drilling. */
export interface ContentFormContextValue {
  locale: Locale;
  errors: FieldErrors;
  pending: boolean;
  /** Call when the staff member changes something outside a native input (the rich text editor), so leaving the page warns. */
  markDirty: () => void;
}

const ContentFormContext = createContext<ContentFormContextValue>({
  locale: "th",
  errors: {},
  pending: false,
  markDirty: () => {},
});

export const ContentFormProvider = ContentFormContext.Provider;

export function useContentForm(): ContentFormContextValue {
  return useContext(ContentFormContext);
}
