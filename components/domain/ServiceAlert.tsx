import { pick, type Locale, type LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { AlertSeverity, ServiceAlert as ServiceAlertDoc } from "@/lib/content/types";
import { Heading, Link, NotificationBanner, Tag, Timestamp } from "@/components/ui";

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
  className?: string;
}

/**
 * Renders one `ServiceAlert` document as a GOV.UK notification banner: the
 * severity word sits in the solid title bar, so it is never colour alone
 * (1.4.1). `info` and `warning` are the plain "important" banner (a labelled
 * region, not announced). `critical` is the same banner announced
 * assertively (4.1.3) unless `announce` is false, something the reader must
 * act on now such as a shuttle route that has just been suspended. The alert
 * title is a heading one level below the banner's own. No tinted box anywhere.
 *
 * Alerts that affect the shuttle carry a separate `transport` category
 * `Tag` (a label, not a box), so "this is about the shuttle" stays
 * independent of "how serious is this".
 */
export function ServiceAlert({ locale, alert, announce = true, className }: ServiceAlertProps) {
  const affectsShuttle = alert.affects?.includes("shuttle") ?? false;
  const critical = alert.severity === "critical";
  const title = pick(alert.title, locale);
  const body = pick(alert.body, locale);

  return (
    <NotificationBanner
      variant={critical && announce ? "warning" : "info"}
      title={pick(SEVERITY_LABEL[alert.severity], locale)}
      className={className}
    >
      {affectsShuttle ? (
        <p className="m-0 mb-[var(--space-2)]">
          <Tag tone="transport">{UI.categoryTransport[locale]}</Tag>
        </p>
      ) : null}
      <Heading level={3} className="m-0 text-base font-bold">
        {title}
      </Heading>
      <p className="m-0 mt-[var(--space-1)]">{body}</p>
      <p className="m-0 mt-[var(--space-2)] text-sm text-ink-600">
        <Timestamp value={alert.startsAt} locale={locale} format="datetime" />
        {alert.endsAt ? (
          <>
            {" - "}
            <Timestamp value={alert.endsAt} locale={locale} format="datetime" />
          </>
        ) : null}
      </p>
      {alert.moreInfoUrl ? (
        <p className="m-0 mt-[var(--space-2)]">
          <Link href={alert.moreInfoUrl} locale={locale} className="text-action underline decoration-1 underline-offset-[0.2em]">
            {UI.alertMoreInfo[locale]}
          </Link>
        </p>
      ) : null}
    </NotificationBanner>
  );
}
