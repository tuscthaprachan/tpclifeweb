import type { ReactNode } from "react";
import { Container, Heading, NotificationBanner, Stack } from "@/components/ui";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

/** Shown when the database or the personal data encryption key is not available. Nothing is collected. */
export function Unavailable({ locale, title, breadcrumbs }: { locale: Locale; title: string; breadcrumbs?: ReactNode }) {
  return (
    <Container width="narrow">
      {breadcrumbs}
      <Stack space={4} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Heading level={1}>{title}</Heading>
        <NotificationBanner variant="warning" title={UI.serviceUnavailableTitle[locale]}>
          {UI.lfpUnavailable[locale]}
        </NotificationBanner>
      </Stack>
    </Container>
  );
}
