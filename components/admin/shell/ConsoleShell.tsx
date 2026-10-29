import type { ReactNode } from "react";
import { buildConsoleNav, resolveNav } from "@/lib/admin/nav";
import type { AccessContext } from "@/lib/auth/session";
import { a, ROLE_LABEL } from "@/lib/i18n/admin";
import { pick, type Locale } from "@/lib/i18n/config";
import type { ThemeChoice } from "@/lib/theme/config";
import { shellLabels } from "./labels";
import { ShellFrame } from "./ShellContext";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export interface ConsoleShellProps {
  locale: Locale;
  session: AccessContext;
  theme: ThemeChoice;
  /** URL of an endpoint returning `{ results: [...] }` for the command palette. Optional. */
  searchEndpoint?: string;
  children: ReactNode;
}

/**
 * The signed-in console frame: sidebar, top bar and the main landmark. Used by
 * app/admin/layout.tsx once the person has a verified session and a staff role.
 */
export function ConsoleShell({ locale, session, theme, searchEndpoint, children }: ConsoleShellProps) {
  const nav = resolveNav(buildConsoleNav(session.roles), locale);
  const labels = shellLabels(locale);
  const orgName = new Map(session.organisations.map((o) => [o.id, pick({ th: o.nameTh, en: o.nameEn }, locale)]));
  const roles = session.roles.map((r) => a("roleAtOrganisation", locale, { role: a(ROLE_LABEL[r.role], locale), organisation: orgName.get(r.organisationId) ?? "" }));

  return (
    <ShellFrame nav={nav} labels={labels}>
      <Sidebar />
      <Topbar locale={locale} theme={theme} user={{ name: session.user.name, email: session.user.email, roles }} searchEndpoint={searchEndpoint} />
      <main id="main-content" tabIndex={-1} className="console-main">
        {children}
      </main>
    </ShellFrame>
  );
}
