import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

/** Every string the client parts of the shell need, resolved on the server so the bundle carries only the active language. */
export interface ShellLabels {
  serviceName: string;
  consoleName: string;
  nav: string;
  notIndexed: string;
  openMenu: string;
  closeMenu: string;
  collapse: string;
  expand: string;
  search: string;
  searchHint: string;
  paletteTitle: string;
  palettePlaceholder: string;
  paletteGoTo: string;
  paletteCreate: string;
  paletteResults: string;
  paletteEmpty: string;
  paletteLoading: string;
  paletteCount: string;
  paletteKeys: string;
  paletteClose: string;
  breadcrumbs: string;
  accountMenu: string;
  signedInAs: string;
  roles: string;
  accountSecurity: string;
  signOut: string;
  display: string;
  theme: string;
  themeLight: string;
  themeDark: string;
  themeSystem: string;
}

export function shellLabels(locale: Locale): ShellLabels {
  return {
    serviceName: UI.serviceName[locale],
    consoleName: a("consoleName", locale),
    nav: a("consoleNav", locale),
    notIndexed: a("notIndexedNote", locale),
    openMenu: a("csOpenMenu", locale),
    closeMenu: a("csCloseMenu", locale),
    collapse: a("csCollapseSidebar", locale),
    expand: a("csExpandSidebar", locale),
    search: a("csSearchButton", locale),
    searchHint: a("csSearchButtonHint", locale),
    paletteTitle: a("csPaletteTitle", locale),
    palettePlaceholder: a("csPalettePlaceholder", locale),
    paletteGoTo: a("csPaletteGoTo", locale),
    paletteCreate: a("csPaletteCreate", locale),
    paletteResults: a("csPaletteResults", locale),
    paletteEmpty: a("csPaletteEmpty", locale),
    paletteLoading: a("csPaletteLoading", locale),
    paletteCount: a("csPaletteCount", locale),
    paletteKeys: a("csPaletteKeys", locale),
    paletteClose: a("csPaletteClose", locale),
    breadcrumbs: a("csBreadcrumbs", locale),
    accountMenu: a("csAccountMenu", locale),
    signedInAs: a("csSignedInAs", locale),
    roles: a("csRolesHeading", locale),
    accountSecurity: a("csAccountSecurity", locale),
    signOut: a("signOut", locale),
    display: a("csSettingsMenu", locale),
    theme: UI.theme[locale],
    themeLight: UI.themeLight[locale],
    themeDark: UI.themeDark[locale],
    themeSystem: UI.themeSystem[locale],
  };
}
