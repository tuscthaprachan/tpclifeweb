import { pick, type Locale, type LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { AlertSeverity, ServiceAlert as ServiceAlertDoc } from "@/lib/content/types";
import { Heading, Link, NotificationBanner } from "@/components/ui";
import { isoDateTime } from "@/lib/i18n/format";
import { alertTimePhrase } from "./serviceAlertTime";
import { localiseAppHref } from "@/components/ui/app-href";

const SEVERITY_LABEL: Record<AlertSeverity, LocaleString> = {
  info: UI.alertSeverityInfo,
  warning: UI.alertSeverityWarning,
  critical: UI.alertSeverityCritical,
};

interface ServiceAlertProps {
  locale: Locale;
  alert: ServiceAlertDoc;
  /** False where the alert is on screen from the first paint, so a critical one is not also announced as a live alert. */
  announce?: boolean;
  /** Title bar, heading, time and link only, for the home page. */
  compact?: boolean;
  /** Pinned in tests; defaults to the current time. */
  now?: Date;
  className?: string;
}

/**
 * Renders one `ServiceAlert` document as a GOV.UK notification banner in the
 * dedicated alert colour, so no section bar or tile shares it. The title bar
 * names the category ("Transport alert") and falls back to the severity word,
 * so it is never colour alone (1.4.1). `critical` is announced assertively
 * (4.1.3) unless `announce` is false; `info` and `warning` are a labelled
 * region. The alert title is a heading one level below the banner's own.
 * The window is said in words in Bangkok time, with the full instants kept in
 * the `<time>` elements. No tinted box anywhere.
 */
export function ServiceAlert({ locale, alert, announce = true, compact = false, now, className }: ServiceAlertProps) {
  const affectsShuttle = alert.affects?.includes("shuttle") ?? false;
  const critical = alert.severity === "critical";
  const title = pick(alert.title, locale);
  const body = pick(alert.body, locale);
  const barTitle = affectsShuttle ? UI.sabTitle[locale].replace("{category}", UI.categoryTransport[locale]) : pick(SEVERITY_LABEL[alert.severity], locale);
  const phrase = alertTimePhrase(alert.startsAt, alert.endsAt, locale, now);
  const link = alert.moreInfoUrl ? (
    <Link href={localiseAppHref(alert.moreInfoUrl, locale)} locale={locale} className="text-action underline decoration-1 underline-offset-[0.2em]">
      {UI.alertMoreInfo[locale]}
    </Link>
  ) : null;
  const time = (
    <time dateTime={isoDateTime(alert.endsAt ?? alert.startsAt)}>
      {phrase}
    </time>
  );

  return (
    <NotificationBanner variant={critical && announce ? "warning" : "info"} tone="alert" title={barTitle} className={className}>
      <Heading level={3} className="m-0 text-base font-bold">
        {title}
      </Heading>
      {compact ? null : <p className="m-0 mt-[var(--space-1)]">{body}</p>}
      <p className="m-0 mt-[var(--space-2)] flex flex-wrap items-baseline gap-x-[var(--space-4)] gap-y-[var(--space-1)] text-sm text-ink-600">
        {time}
        {compact ? link : null}
      </p>
      {!compact && link ? <p className="m-0 mt-[var(--space-2)]">{link}</p> : null}
    </NotificationBanner>
  );
}
