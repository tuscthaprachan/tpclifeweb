import type { ReactNode } from "react";
import { AdminLanguageSwitch } from "@/components/admin/AdminLanguageSwitch";
import { SiteLogo } from "@/components/layout/SiteLogo";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { ThemeChoice } from "@/lib/theme/config";
import { ThemeMenu } from "./ThemeMenu";

/**
 * The frame for every page without a console session (sign-in, invite,
 * recovery, signed out, no access, not configured): a slim header and one
 * centred column. The language switch is the first form in the header and
 * works without JavaScript.
 */
export function AuthShell({ locale, theme, children }: { locale: Locale; theme: ThemeChoice; children: ReactNode }) {
  return (
    <div className="console-auth">
      <header className="console-auth-header">
        <a href="/admin" className="console-brand">
          <SiteLogo size={28} priority />
          <span className="console-brand-text">
            <span className="block font-semibold leading-tight">{UI.serviceName[locale]}</span>
            <span className="block text-sm leading-tight text-ink-600">{a("consoleName", locale)}</span>
          </span>
        </a>
        <div className="console-topbar-tools">
          <AdminLanguageSwitch locale={locale} />
          <ThemeMenu
            current={theme}
            labels={{
              display: a("csSettingsMenu", locale),
              theme: UI.theme[locale],
              themeLight: UI.themeLight[locale],
              themeDark: UI.themeDark[locale],
              themeSystem: UI.themeSystem[locale],
            }}
          />
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="console-auth-main">
        {children}
      </main>
      <footer className="console-auth-footer">{a("notIndexedNote", locale)}</footer>
    </div>
  );
}
