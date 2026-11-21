/**
 * Imports every editable dictionary in the domain area, so the console lists
 * them (lib/i18n/site-text-registry.ts). Add one import per module that
 * calls editableStrings.
 */

import "@/components/domain/strings";
import "@/components/domain/directory/strings";
import "@/components/domain/search/strings";
import "@/components/domain/borrowing/strings";
import "@/components/domain/open-data/strings";
import "@/lib/cases/strings";
import "@/lib/complaints/strings";
import "@/lib/lost-found/strings";
import "@/lib/search/strings";
import "@/lib/og/strings";
import "@/lib/email/strings";

export {};
