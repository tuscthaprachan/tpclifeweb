import type { Metadata } from "next";
import NextLink from "next/link";
import { notFound } from "next/navigation";

import { SEVERITY_LABEL, SEVERITY_TONE, alertPath } from "@/components/domain/today";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, EmptyState, Heading, Stack, StatusTag, Timestamp } from "@/components/ui";
import { getActiveServiceAlerts } from "@/lib/content";
import { DEFAULT_LOCALE, isLocale, localePath, pick, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";

export const revalidate = 60;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return { alternates: alternatesFor(locale, "/alerts"), title: UI.tdAlerts[locale], description: UI.tdAlertsIntro[locale] };
}

/** Every alert in force, most severe first, each with its own page. */
export default async function AlertsPage({ params }: Props) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const alerts = await getActiveServiceAlerts();

  return (
    <Container>
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.tdAlerts[locale] }]} />
      <Stack space={8} className="pb-[var(--space-12)]">
        <Stack space={3}>
          <Heading level={1} className="m-0">
            {UI.tdAlerts[locale]}
          </Heading>
          <p className="m-0 max-w-[var(--measure-en)] text-lg text-ink-900">{UI.tdAlertsIntro[locale]}</p>
        </Stack>
        {alerts.length === 0 ? (
          <EmptyState title={UI.nothingHere[locale]}>{UI.tdAlertsNone[locale]}</EmptyState>
        ) : (
          <ul className="m-0 flex flex-col p-0" style={{ listStyle: "none" }}>
            {alerts.map((alert) => (
              <li key={alert._id} className="flex flex-col gap-[var(--space-1)] border-b border-line py-[var(--space-4)]">
                <div className="flex flex-wrap items-baseline justify-between gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
                  <Heading level={2} className="m-0 text-lg">
                    <NextLink href={localePath(locale, alertPath(alert))}>{pick(alert.title, locale)}</NextLink>
                  </Heading>
                  <StatusTag tone={SEVERITY_TONE[alert.severity]} label={UI[SEVERITY_LABEL[alert.severity]][locale]} />
                </div>
                <p className="m-0 max-w-[var(--measure-en)] text-ink-900">{pick(alert.body, locale)}</p>
                <p className="m-0 text-sm text-ink-600">
                  {UI.tdAlertUntil[locale]}{" "}
                  {alert.endsAt ? <Timestamp value={alert.endsAt} locale={locale} format="datetime" /> : UI.tdAlertUntilFurther[locale]}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Stack>
    </Container>
  );
}
