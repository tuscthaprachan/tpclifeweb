/**
 * Segment error boundary for everything under `[locale]`. Next.js renders
 * this in place of the failing page while the root layout above it (header,
 * footer, `<html lang>`, the skip link, the consistent help block) keeps
 * rendering normally, so a reader who hits a broken page still has real
 * navigation, search and the help contacts rather than a blank screen.
 *
 * Next.js does not pass route params to an error boundary, only `error` and
 * `reset`, so the locale is read the same way `[locale]/not-found.tsx` reads
 * it: from the router's own segment context via `useParams`.
 */

"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { Button, Container, Heading, Stack } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams<{ locale: string }>();
  const locale: Locale = isLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
  const headingWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Server-side visibility only; nothing here reaches the reader.
    console.error("[app/[locale]/error]", error);
    // Moves focus to the message itself, since this boundary can replace
    // whatever the reader was previously looking at without a navigation.
    headingWrapRef.current?.focus();
  }, [error]);

  return (
    <Container width="narrow">
      <Stack space={6} className="py-12">
        <div ref={headingWrapRef} tabIndex={-1} className="outline-none">
          <Heading level={1}>{UI.errorTitle[locale]}</Heading>
        </div>
        <p className="m-0 text-ink-600">{UI.errorBody[locale]}</p>

        <div className="flex flex-wrap items-center gap-[var(--space-3)]">
          <Button onClick={reset}>{UI.tryAgain[locale]}</Button>
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
