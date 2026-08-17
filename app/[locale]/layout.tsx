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

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import "@/styles/globals.css";
import { fontVariables } from "@/components/layout/fonts";
import { PhaseBanner } from "@/components/layout/PhaseBanner";
import { getSiteSettings } from "@/components/layout/site-settings";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { HTML_LANG, LOCALES, DEFAULT_LOCALE, OTHER_LOCALE, isLocale, localePath, pick, type Locale } from "@/lib/i18n/config";

// Every request path outside these two locales 404s instead of silently
// rendering. Paired with the explicit isLocale check below, which TypeScript
// needs anyway since `params.locale` is a plain string.
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

// Read directly from process.env rather than lib/sanity/env.ts: that module
// throws at import time if the Sanity project id or dataset env vars are
// unset (by design, so a misconfigured deploy fails loudly), which would
// take the whole site down over a value this layout does not need.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
    openGraph: {
      title: name,
      description,
      url: localePath(locale, "/"),
      siteName: name,
      locale: HTML_LANG[locale].replace("-", "_"),
      alternateLocale: HTML_LANG[OTHER_LOCALE[locale]].replace("-", "_"),
      type: "website",
    },
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

  return (
    <html lang={HTML_LANG[locale]} className={fontVariables}>
      <body>
        {/* First focusable element in the document (2.4.1). */}
        <SkipLink locale={locale} />

        <PhaseBanner locale={locale} phase={settings.phase} phaseNote={settings.phaseNote} />

        <SiteHeader locale={locale} serviceName={settings.serviceName} navItems={settings.primaryNav} />

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
