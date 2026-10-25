/**
 * Root layout, deliberately living inside the `[locale]` segment rather than
 * at `app/layout.tsx`. Next 16 allows the root layout to sit in a dynamic
 * segment, and doing so here is what lets `<html lang>` be set correctly per
 * locale (3.1.1) instead of stamping one language on every response and
 * fixing it up client-side.
 *
 * The corollary is `app/not-found.tsx`: because there is no root layout
 * outside this segment, that file has to supply its own `<html>`/`<body>`
 * for the cases that never reach a valid locale (an unmatched top-level
 * route, or `notFound()` below firing for a `locale` segment that fails
 * `isLocale`, which bubbles above this layout since it has no parent).
 */

import { cookies } from "next/headers";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import "@/styles/globals.css";
import { fontVariables } from "@/components/layout/fonts";
import { PhaseBanner } from "@/components/layout/PhaseBanner";
import { getSiteSettings } from "@/components/layout/site-settings";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { HTML_LANG, LOCALES, DEFAULT_LOCALE, OTHER_LOCALE, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/site-url";
import { isStoredTheme, LEGACY_THEME_COOKIE, THEME_COOKIE, type ThemeChoice } from "@/lib/theme/config";

// Every request path outside these two locales 404s instead of silently
// rendering. Paired with the explicit isLocale check below, which TypeScript
// needs anyway since `params.locale` is a plain string.
export const dynamicParams = false;

const LIGHT_THEME_COLOR = "#ffffff";
const DARK_THEME_COLOR = "#1a1220";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const settings = await getSiteSettings();
  const name = pick(settings.serviceName, locale);
  const description = pick(settings.tagline, locale);

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: name, template: `%s | ${name}` },
    description,
    /*
     * Deliberately NO `alternates` here. A layout cannot know which route is
     * rendering, so anything set at this level claims every page is the home
     * page. Each page calls `alternatesFor(locale, route)` from
     * `lib/i18n/metadata.ts` instead, and the structure test enforces it.
     */
    /*
     * No title, description or url here: a layout value would be every
     * page's og:title. Left unset, Next fills them from each page's own
     * metadata. Images come from the `opengraph-image.tsx` files.
     */
    openGraph: {
      siteName: name,
      locale: HTML_LANG[locale].replace("-", "_"),
      alternateLocale: HTML_LANG[OTHER_LOCALE[locale]].replace("-", "_"),
      type: "website",
    },
    twitter: { card: "summary_large_image" },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const cookieStore = await cookies();
  const stored = (cookieStore.get(THEME_COOKIE) ?? cookieStore.get(LEGACY_THEME_COOKIE))?.value;
  if (stored === "light") return { themeColor: LIGHT_THEME_COLOR, colorScheme: "light" };
  if (stored === "dark") return { themeColor: DARK_THEME_COLOR, colorScheme: "dark" };
  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: LIGHT_THEME_COLOR },
      { media: "(prefers-color-scheme: dark)", color: DARK_THEME_COLOR },
    ],
    colorScheme: "light dark",
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const settings = await getSiteSettings();

  /*
   * Reading the theme cookie here, server-side, is what makes the theme
   * toggle flash-free: `data-theme` is stamped on `<html>` in the SSR
   * response itself, so the very first paint already carries the reader's
   * forced theme rather than starting on `prefers-color-scheme` and
   * snapping over once a client script runs. No inline script is needed at
   * all, which is strictly better than the usual "blocking script in
   * <head>" workaround for this problem.
   *
   * A cookie value that fails `isStoredTheme` (missing, malformed, or an
   * old "system" value from a version of this code that used to write one)
   * is treated as "system": no attribute is stamped, and tokens.css's
   * `prefers-color-scheme` media query decides, exactly as it did before
   * this toggle existed.
   */
  const cookieStore = await cookies();
  const storedTheme = (cookieStore.get(THEME_COOKIE) ?? cookieStore.get(LEGACY_THEME_COOKIE))?.value;
  const theme: ThemeChoice = isStoredTheme(storedTheme) ? storedTheme : "system";

  return (
    <html
      lang={HTML_LANG[locale]}
      className={fontVariables}
      data-theme={theme === "system" ? undefined : theme}
    >
      <body>
        {/* First focusable element in the document (2.4.1). */}
        <SkipLink locale={locale} />

        <PhaseBanner locale={locale} phase={settings.phase} />

        <SiteHeader locale={locale} serviceName={settings.serviceName} navItems={settings.primaryNav} theme={theme} />

        {/*
          tabIndex={-1} is required, not decorative. Without it the browser
          cannot move DOM focus to <main> when the skip link is activated: the
          URL fragment changes, the page scrolls, but focus stays on <body>, so
          the next Tab press returns the reader to the top of the navigation
          they just skipped. That is a 2.4.1 Bypass Blocks failure and it is
          invisible unless you actually test it with a keyboard.
        */}
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>

        <SiteFooter
          locale={locale}
          serviceName={settings.serviceName}
          footerNav={settings.footerNav}
          helpContacts={settings.helpContacts}
        />
      </body>
    </html>
  );
}
