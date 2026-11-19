import type { ConsoleIconName } from "@/components/admin/icons";
import type { AdminKey } from "@/lib/i18n/admin";
import type { SiteSection, validateSiteSettingsSection } from "./validate";

export interface SiteSectionDef {
  id: SiteSection;
  titleKey: AdminKey;
  hintKey: AdminKey;
  icon: ConsoleIconName;
}

export const SITE_SECTION_DEFS: readonly SiteSectionDef[] = [
  { id: "general", titleKey: "fmSiteSecGeneral", hintKey: "fmSiteSecGeneralHint", icon: "siteSettings" },
  { id: "navigation", titleKey: "fmSiteSecNavigation", hintKey: "fmSiteSecNavigationHint", icon: "menu" },
  { id: "footer", titleKey: "fmSiteSecFooter", hintKey: "fmSiteSecFooterHint", icon: "menu" },
  { id: "home-tasks", titleKey: "fmSiteSecHomeTasks", hintKey: "fmSiteSecHomeTasksHint", icon: "dashboard" },
  { id: "help", titleKey: "fmSiteSecHelp", hintKey: "fmSiteSecHelpHint", icon: "info" },
];

export type SiteSectionData = Extract<ReturnType<typeof validateSiteSettingsSection>, { ok: true }>["data"];

/** The table columns one section owns, and nothing else. */
export function sectionValues(section: SiteSection, data: SiteSectionData): Record<string, unknown> {
  switch (section) {
    case "general":
      return {
        serviceNameTh: data.serviceName?.th,
        serviceNameEn: data.serviceName?.en,
        taglineTh: data.tagline?.th,
        taglineEn: data.tagline?.en,
        phase: data.phase,
        phaseNoteTh: data.phaseNote?.th || null,
        phaseNoteEn: data.phaseNote?.en || null,
      };
    case "navigation":
      return { primaryNav: data.primaryNav };
    case "footer":
      return { footerNav: data.footerNav, organisationLinks: data.organisationLinks };
    case "home-tasks":
      return { homeTasks: data.homeTasks };
    case "help":
      return { helpContacts: data.helpContacts };
  }
}
