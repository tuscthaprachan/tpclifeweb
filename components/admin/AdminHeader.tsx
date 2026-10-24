/**
 * The console header: service name, the places to go, language switch and
 * sign out. Plain links and forms.
 */

import { AdminLanguageSwitch } from "@/components/admin/AdminLanguageSwitch";
import { SiteLogo } from "@/components/layout/SiteLogo";
import { ShellContainer } from "@/components/layout/ShellContainer";
import { Button } from "@/components/ui";
import { signOutAction } from "@/app/admin/actions";
import { A } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

interface AdminHeaderProps {
  locale: Locale;
  /** Any live session: shows "Sign out". */
  hasSession: boolean;
  /** Signed in with a passkey: shows the console links. */
  verified: boolean;
  isAdmin: boolean;
  /** An `editor` or `admin`: shows the Content link. */
  isEditor: boolean;
}

export function AdminHeader({ locale, hasSession, verified, isAdmin, isEditor }: AdminHeaderProps) {
  return (
    <header className="border-b border-line bg-surface">
      <ShellContainer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3">
        <a href="/admin" className="flex items-center gap-3 text-ink-900 no-underline">
          <SiteLogo size={32} priority />
          <span className="font-semibold">
            {UI.serviceName[locale]} <span className="font-normal text-ink-600">{A.consoleName[locale]}</span>
          </span>
        </a>
        <div className="flex flex-wrap items-center gap-3">
          {verified ? (
            <nav aria-label={A.consoleNav[locale]}>
              <ul className="m-0 flex list-none flex-wrap gap-4 p-0">
                <li>
                  <a href="/admin" className="text-ink-900">
                    {A.homeLink[locale]}
                  </a>
                </li>
                {isEditor ? (
                  <li>
                    <a href="/admin/content" className="text-ink-900">
                      {A.contentLink[locale]}
                    </a>
                  </li>
                ) : null}
                {isAdmin ? (
                  <li>
                    <a href="/admin/staff" className="text-ink-900">
                      {A.staffLink[locale]}
                    </a>
                  </li>
                ) : null}
                <li>
                  <a href="/admin/security" className="text-ink-900">
                    {A.securityLink[locale]}
                  </a>
                </li>
              </ul>
            </nav>
          ) : null}
          <AdminLanguageSwitch locale={locale} />
          {hasSession ? (
            <form action={signOutAction}>
              <Button type="submit" variant="secondary" size="sm">
                {A.signOut[locale]}
              </Button>
            </form>
          ) : null}
        </div>
      </ShellContainer>
    </header>
  );
}
