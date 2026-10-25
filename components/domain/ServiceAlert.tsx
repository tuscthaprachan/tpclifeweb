import { pick, type Locale, type LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { AlertSeverity, ServiceAlert as ServiceAlertDoc } from "@/lib/content/types";
import { Link, NotificationBanner, Tag, Timestamp, WarningText } from "@/components/ui";

/*
 * TODO: add to UI strings. lib/i18n/strings.ts has UI.warning ("Warning" /
 * "คำเตือน") but nothing for the other two ServiceAlert severities: no
 * "Notice" word for `info`, no "Critical" word for `critical`. Using local
 * literals until strings.ts gets them; reported in the shuttle agent's final
 * report.
 */
const SEVERITY_LABEL: Record<AlertSeverity, LocaleString> = {
  info: { th: "แจ้งให้ทราบ", en: "Notice" },
  warning: UI.warning,
  critical: { th: "วิกฤต", en: "Critical" },
};

/*
 * TODO: add to UI strings. No shared "more information" link label exists
 * (UI.viewTimetable is shuttle-specific wording, not generic).
 */
const MORE_INFO_LABEL: LocaleString = { th: "ข้อมูลเพิ่มเติม", en: "More information" };

interface ServiceAlertProps {
  locale: Locale;
  alert: ServiceAlertDoc;
  className?: string;
}

/**
 * Renders one `ServiceAlert` document as a GOV.UK notification banner: the
 * severity word sits in the solid title bar, so it is never colour alone
 * (1.4.1). `info` and `warning` are the plain "important" banner (a labelled
 * region, announced politely). `critical` is the same banner announced
 * assertively (4.1.3), something the reader must act on now such as a shuttle
 * route that has just been suspended, with the alert itself set as GOV.UK
 * warning text inside. No tinted box anywhere.
 *
 * Alerts that affect the shuttle carry a separate `transport` category
 * `Tag` (a label, not a box), so "this is about the shuttle" stays
 * independent of "how serious is this".
 */
export function ServiceAlert({ locale, alert, className }: ServiceAlertProps) {
  const affectsShuttle = alert.affects?.includes("shuttle") ?? false;
  const critical = alert.severity === "critical";
  const title = pick(alert.title, locale);
  const body = pick(alert.body, locale);

  return (
    <NotificationBanner
      variant={critical ? "warning" : "info"}
      title={pick(SEVERITY_LABEL[alert.severity], locale)}
      className={className}
    >
      {affectsShuttle ? (
        <p className="m-0 mb-[var(--space-2)]">
          <Tag tone="transport">{UI.categoryTransport[locale]}</Tag>
        </p>
      ) : null}
      {critical ? (
        <WarningText>
          <span className="visually-hidden">{UI.warning[locale]}: </span>
          {title}
        </WarningText>
      ) : (
        <p className="m-0 font-bold">{title}</p>
      )}
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
            {pick(MORE_INFO_LABEL, locale)}
          </Link>
        </p>
      ) : null}
    </NotificationBanner>
  );
}
