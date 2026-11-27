"use client";

import { createContext, useContext } from "react";
import type { Locale } from "@/lib/i18n/config";

interface DocumentLanguage {
  language: Locale;
  setLanguage: (language: Locale) => void;
}

const DocumentLanguageContext = createContext<DocumentLanguage | null>(null);

export const DocumentLanguageProvider = DocumentLanguageContext.Provider;

export function useDocumentLanguage() {
  return useContext(DocumentLanguageContext);
}
