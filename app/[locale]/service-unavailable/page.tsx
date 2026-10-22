/**
 * A plain, linkable page explaining that the service is temporarily
 * unavailable. Unlike `error.tsx` (a React error boundary that replaces
 * whatever page just failed) this is an ordinary route: something else that
 * already knows the whole service is down (a maintenance window, a status
 * page, a manually shared link) can point here.
 *
 * A `page.tsx` Server Component cannot itself set the HTTP response status
 * to 503 the way a Route Handler could; that would need a proxy or
 * route-handler change, which is outside this agent's scope
 * (CONTRIBUTING.md: "write only inside the directories you were given").
 * This route only supplies the destination content, which is what was
 * asked for.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button, Container, Heading, Stack } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale, type LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { alternatesFor } from "@/lib/i18n/metadata";

// TODO: add to UI strings. UI.serviceUnavailableTitle exists but there is no
// shared body copy for it; UI.errorBody is written for a page-level error,
// not "the whole service is down", so it is not reused here.
const SERVICE_UNAVAILABLE_BODY: LocaleString = {
  th: "ระบบ #ท้ายท่าพระจันทร์ ไม่พร้อมให้บริการชั่วคราว อาจเกิดจากการปรับปรุงระบบหรือปัญหาทางเทคนิค โปรดลองใหม่อีกครั้งในอีกสักครู่",
  en: "#trytpc is temporarily unavailable, most likely due to maintenance or a technical problem. Please try again shortly.",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/service-unavailable"),
    title: UI.serviceUnavailableTitle[locale],
  };
}

export default async function ServiceUnavailablePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  return (
    <Container width="narrow">
      <Breadcrumbs
        locale={locale}
        items={[{ label: UI.home[locale], path: "/" }, { label: UI.serviceUnavailableTitle[locale] }]}
      />
      <Stack space={6} className="py-12">
        <Heading level={1}>{UI.serviceUnavailableTitle[locale]}</Heading>
        <p className="m-0 text-ink-600">{SERVICE_UNAVAILABLE_BODY[locale]}</p>

        <div className="flex flex-wrap items-center gap-[var(--space-3)]">
          <Button href={localePath(locale, "/")} variant="secondary">
            {UI.home[locale]}
          </Button>
          <Button href={localePath(locale, "/search")} variant="quiet">
            {UI.search[locale]}
          </Button>
        </div>
      </Stack>
    </Container>
  );
}
