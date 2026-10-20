/**
 * Shared frame for every /eat page. It does one thing: while `CANTEEN_DEMO=1`
 * is set it puts a banner above the page saying the data is made up, and
 * tells search engines to stay away. With demo off it renders children only.
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Container, NotificationBanner } from "@/components/ui";
import { DEMO_NOTICE, isCanteenDemo } from "@/lib/canteen/demo";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";

export function generateMetadata(): Metadata {
  return isCanteenDemo() ? { robots: { index: false, follow: false } } : {};
}

export default async function EatLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  if (!isCanteenDemo()) return <>{children}</>;

  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  return (
    <>
      <Container className="pt-[var(--space-4)]">
        <NotificationBanner variant="warning" title={DEMO_NOTICE.title[locale]}>
          <p className="m-0">{DEMO_NOTICE.body[locale]}</p>
        </NotificationBanner>
      </Container>
      {children}
    </>
  );
}
