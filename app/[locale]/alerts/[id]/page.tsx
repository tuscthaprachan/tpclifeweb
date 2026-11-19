import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AFFECTS_LABEL, SEVERITY_LABEL, SEVERITY_TONE } from "@/components/domain/today";
import { fillText } from "@/components/domain/open-data/fill";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Heading, InsetText, Link, Stack, StatusTag, SummaryList, Timestamp } from "@/components/ui";
import { isUuid } from "@/lib/admin/content/form-state";
import { getServiceAlertById } from "@/lib/content";
import { DEFAULT_LOCALE, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { formatDateTime } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; id: string }> };

async function load(id: string) {
  return isUuid(id) ? getServiceAlertById(id) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const alert = await load(id);
  if (!alert) return {};
  return { alternates: alternatesFor(locale, `/alerts/${id}`), title: pick(alert.title, locale), description: pick(alert.body, locale) };
}

/** One alert in full: how serious, what it says, what it affects and for how long. An ended alert says it has ended. */
export default async function AlertPage({ params }: Props) {
  const { locale: rawLocale, id } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const alert = await load(id);
  if (!alert) notFound();

  const ended = alert.endsAt ? new Date(alert.endsAt) <= new Date() : false;
  const surfaces = alert.affects && alert.affects.length > 0 ? alert.affects : (["sitewide"] as const);

  return (
    <Container>
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.tdAlerts[locale], path: "/alerts" }, { label: pick(alert.title, locale) }]} />
      <Stack space={6} className="pb-[var(--space-12)]">
        <Stack space={3}>
          <div>
            <StatusTag tone={ended ? "neutral" : SEVERITY_TONE[alert.severity]} label={UI[SEVERITY_LABEL[alert.severity]][locale]} />
          </div>
          <Heading level={1} className="m-0">
            {pick(alert.title, locale)}
          </Heading>
        </Stack>

        {ended && alert.endsAt ? <InsetText>{fillText(UI.tdAlertEnded[locale], { date: formatDateTime(alert.endsAt, locale) })}</InsetText> : null}

        <p className="m-0 max-w-[var(--measure-en)] whitespace-pre-line text-lg text-ink-900">{pick(alert.body, locale)}</p>

        <SummaryList
          rows={[
            { key: UI.tdAlertAffects[locale], value: surfaces.map((surface) => UI[AFFECTS_LABEL[surface]][locale]).join(", ") },
            { key: UI.tdAlertFrom[locale], value: <Timestamp value={alert.startsAt} locale={locale} format="datetime" /> },
            {
              key: UI.tdAlertUntil[locale],
              value: alert.endsAt ? <Timestamp value={alert.endsAt} locale={locale} format="datetime" /> : UI.tdAlertUntilFurther[locale],
            },
          ]}
        />

        {alert.moreInfoUrl ? (
          <p className="m-0">
            <Link href={alert.moreInfoUrl} locale={locale} className="font-semibold">
              {UI.tdMoreInfo[locale]}
            </Link>
          </p>
        ) : null}

        <p className="m-0">
          <Link href={`/${locale}/alerts`} locale={locale}>
            {UI.tdAllAlerts[locale]}
          </Link>
        </p>
      </Stack>
    </Container>
  );
}
