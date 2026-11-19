import NextLink from "next/link";
import { StatusTag, type StatusTone } from "@/components/ui";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI, type UiKey } from "@/lib/i18n/strings";
import type { AlertSeverity, ServiceAlert } from "@/lib/content/types";

export const SEVERITY_TONE: Record<AlertSeverity, StatusTone> = { info: "info", warning: "warning", critical: "error" };
export const SEVERITY_LABEL: Record<AlertSeverity, UiKey> = {
  info: "alertSeverityInfo",
  warning: "alertSeverityWarning",
  critical: "alertSeverityCritical",
};
export const AFFECTS_LABEL: Record<NonNullable<ServiceAlert["affects"]>[number], UiKey> = {
  shuttle: "tdAffectsShuttle",
  campus: "tdAffectsCampus",
  forms: "tdAffectsForms",
  sitewide: "tdAffectsSitewide",
};

export function alertPath(alert: ServiceAlert): string {
  return `/alerts/${alert._id}`;
}

export function alertsAffecting(alerts: ServiceAlert[], surface: "shuttle" | "campus"): ServiceAlert[] {
  return alerts.filter((alert) => !alert.affects || alert.affects.length === 0 || alert.affects.includes(surface) || alert.affects.includes("sitewide"));
}

/** A short list of alerts, each a link to its own page, with the severity as icon, word and colour. */
export function AlertLinks({ locale, alerts }: { locale: Locale; alerts: ServiceAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <ul className="m-0 flex flex-col p-0" style={{ listStyle: "none" }}>
      {alerts.map((alert) => (
        <li key={alert._id} className="flex flex-wrap items-baseline justify-between gap-x-[var(--space-3)] gap-y-[var(--space-1)] border-b border-line py-[var(--space-3)]">
          <NextLink href={localePath(locale, alertPath(alert))} className="font-bold">
            {pick(alert.title, locale)}
          </NextLink>
          <StatusTag tone={SEVERITY_TONE[alert.severity]} label={UI[SEVERITY_LABEL[alert.severity]][locale]} />
        </li>
      ))}
    </ul>
  );
}
