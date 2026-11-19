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
  paletteError: string;
  paletteCount: string;
  paletteKeys: string;
  paletteClose: string;
  breadcrumbs: string;
  accountMenu: string;
  signedInAs: string;
  roles: string;
  accountDetails: string;
  accountSecurity: string;
  accountNotifications: string;
  signOut: string;
  display: string;
  theme: string;
  themeLight: string;
  themeDark: string;
  themeSystem: string;
  paletteActions: string;
  paletteMyCases: string;
  paletteToggleTheme: string;
  paletteSwitchLanguage: string;
  paletteSignOut: string;
  paletteShortcuts: string;
  shortcutsTitle: string;
  shortcutsIntro: string;
  shortcutsGeneral: string;
  shortcutsGoTo: string;
  shortcutsThen: string;
  shortcutsOpenPalette: string;
  shortcutsOpenHelp: string;
  shortcutsClose: string;
  shortcutsPending: string;
  shortcutsMenu: string;
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
    paletteError: a("csPaletteError", locale),
    paletteCount: a("csPaletteCount", locale),
    paletteKeys: a("csPaletteKeys", locale),
    paletteClose: a("csPaletteClose", locale),
    breadcrumbs: a("csBreadcrumbs", locale),
    accountMenu: a("csAccountMenu", locale),
    signedInAs: a("csSignedInAs", locale),
    roles: a("csRolesHeading", locale),
    accountDetails: a("chAccountTitle", locale),
    accountSecurity: a("csAccountSecurity", locale),
    accountNotifications: a("ntTitle", locale),
    signOut: a("signOut", locale),
    display: a("csSettingsMenu", locale),
    theme: UI.theme[locale],
    themeLight: UI.themeLight[locale],
    themeDark: UI.themeDark[locale],
    themeSystem: UI.themeSystem[locale],
    paletteActions: a("opPaletteActions", locale),
    paletteMyCases: a("opPaletteMyCases", locale),
    paletteToggleTheme: a("opPaletteToggleTheme", locale),
    paletteSwitchLanguage: a("opPaletteSwitchLanguage", locale),
    paletteSignOut: a("signOut", locale),
    paletteShortcuts: a("opPaletteShortcuts", locale),
    shortcutsTitle: a("opShortcutsTitle", locale),
    shortcutsIntro: a("opShortcutsIntro", locale),
    shortcutsGeneral: a("opShortcutsGeneral", locale),
    shortcutsGoTo: a("opShortcutsGoTo", locale),
    shortcutsThen: a("opShortcutsThen", locale),
    shortcutsOpenPalette: a("opShortcutsOpenPalette", locale),
    shortcutsOpenHelp: a("opShortcutsOpenHelp", locale),
    shortcutsClose: a("opShortcutsClose", locale),
    shortcutsPending: a("opShortcutsPending", locale),
    shortcutsMenu: a("opShortcutsMenu", locale),
  };
}
