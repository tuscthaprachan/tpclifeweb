import { pick, type Locale, type LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { liveRegionProps, type Announcement } from "@/lib/a11y";
import type { AlertSeverity, ServiceAlert as ServiceAlertDoc } from "@/lib/sanity/types";
import { cx, Cluster, Link, StatusTag, Tag, Timestamp, type StatusTone } from "@/components/ui";

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

/** `critical` reuses the `error` status tone: there is no dedicated "critical" tone in StatusTag, and error red is the most severe colour the status palette has. */
const TONE: Record<AlertSeverity, StatusTone> = { info: "info", warning: "warning", critical: "error" };

const BORDER_BG: Record<AlertSeverity, string> = {
  info: "border-info bg-info-soft",
  warning: "border-warning bg-warning-soft",
  critical: "border-error bg-error-soft",
};

/**
 * A critical alert interrupts (4.1.3 assertive): something the reader must
 * act on now, for example a shuttle route that has just been suspended.
 * Info and warning wait for a pause, matching NotificationBanner's own
 * politeness rule.
 */
const POLITENESS: Record<AlertSeverity, Announcement> = { info: "polite", warning: "polite", critical: "assertive" };

interface ServiceAlertProps {
  locale: Locale;
  alert: ServiceAlertDoc;
  className?: string;
}

/**
 * Renders one `ServiceAlert` document. Severity always drives an icon, a
 * word and a colour together (1.4.1 Use of Colour): the word comes from
 * `StatusTag`, which is the one place in the design system a status colour
 * is allowed to carry meaning, and it is never colour alone.
 *
 * Alerts that affect the shuttle carry a separate `transport` category
 * `Tag`, using the fixed `--fill-transport` fill (CONTRIBUTING.md), so the
 * "this is about the shuttle" signal is independent of the "how serious is
 * this" signal instead of trying to overload one colour with both meanings.
 */
export function ServiceAlert({ locale, alert, className }: ServiceAlertProps) {
  const affectsShuttle = alert.affects?.includes("shuttle") ?? false;

  return (
    <div
      {...liveRegionProps(POLITENESS[alert.severity])}
      className={cx("rounded-panel border-l-[length:var(--border-width-thick)] px-[var(--space-4)] py-[var(--space-4)] text-ink-900", BORDER_BG[alert.severity], className)}
    >
      <Cluster space={2}>
        <StatusTag tone={TONE[alert.severity]} label={pick(SEVERITY_LABEL[alert.severity], locale)} />
        {affectsShuttle ? <Tag tone="transport">{UI.categoryTransport[locale]}</Tag> : null}
      </Cluster>
      <p className="m-0 mt-[var(--space-2)] font-semibold">{pick(alert.title, locale)}</p>
      <p className="m-0 mt-[var(--space-1)]">{pick(alert.body, locale)}</p>
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
    </div>
  );
}
