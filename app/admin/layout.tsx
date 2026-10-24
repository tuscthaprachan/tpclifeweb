/**
 * Root layout for the staff console. Like `app/[locale]/layout.tsx` it owns
 * `<html>`, because /admin is deliberately outside the locale segment (see
 * lib/admin/locale.ts for why and how it is still bilingual).
 *
 * Everything under /admin is noindex: here in metadata, in an X-Robots-Tag
 * header (next.config.ts), in robots.txt, and absent from the sitemap and the
 * search index. None of that is a security control; authorisation is in
 * `requireStaff` on every page and action.
 */

import { cookies } from "next/headers";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@/styles/globals.css";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { SessionTimeout } from "@/components/admin/SessionTimeout";
import { fontVariables } from "@/components/layout/fonts";
import { SkipLink } from "@/components/layout/SkipLink";
import { getAdminLocale } from "@/lib/admin/locale";
import { getAdminSession } from "@/lib/auth/session";
import { canEditContent } from "@/lib/admin/content/access";
import { hasRole } from "@/lib/auth/roles";
import { A } from "@/lib/i18n/admin";
import { HTML_LANG } from "@/lib/i18n/config";
import { isStoredTheme, LEGACY_THEME_COOKIE, THEME_COOKIE } from "@/lib/theme/config";

export const metadata: Metadata = {
  title: { default: "Staff console | #trytpc", template: "%s | #trytpc" },
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = { themeColor: "#ffffff", colorScheme: "light dark" };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const locale = await getAdminLocale();
  const store = await cookies();
  const stored = (store.get(THEME_COOKIE) ?? store.get(LEGACY_THEME_COOKIE))?.value;
  const session = await getAdminSession();

  return (
    <html lang={HTML_LANG[locale]} className={fontVariables} data-theme={isStoredTheme(stored) ? stored : undefined}>
      <body>
        <SkipLink locale={locale} />
        <AdminHeader
          locale={locale}
          hasSession={Boolean(session)}
          verified={Boolean(session?.secondFactorAt)}
          isAdmin={Boolean(session && hasRole(session.roles, "admin"))}
          isEditor={Boolean(session && canEditContent(session.roles))}
        />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        {session ? (
          <SessionTimeout endsAt={session.deadlines.endsAt.toISOString()} serverNow={new Date().toISOString()} locale={locale} />
        ) : null}
        <footer className="border-t border-line py-4 text-sm text-ink-600">
          <div className="mx-auto w-full max-w-[var(--width-content)] px-[var(--gutter)]">{A.notIndexedNote[locale]}</div>
        </footer>
      </body>
    </html>
  );
}
