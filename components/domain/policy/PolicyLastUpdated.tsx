import { WarningIcon } from "@/components/ui/icons";
import { Timestamp } from "@/components/ui/Timestamp";
import { cx } from "@/components/ui/cx";
import type { Locale, LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { Policy } from "@/lib/content/types";
import { getLatestUpdate } from "./updates";

const STALE_AFTER_DAYS = 365;

/**
 * No shared string exists for "this has not moved in over a year": UI.lastUpdated
 * names the fact ("Last updated"), not the judgement that a year of silence is
 * itself worth flagging. Hardcoded per house style and reported as a gap.
 */
// TODO: add to UI strings.
const NO_MOVEMENT_LABEL: LocaleString = {
  th: "ไม่มีความเคลื่อนไหวมานานกว่าหนึ่งปี",
  en: "No movement in over a year",
};

interface PolicyLastUpdatedProps {
  policy: Policy;
  locale: Locale;
  /** Injectable for tests; defaults to the real current time. */
  now?: Date;
  className?: string;
}

/**
 * Honesty rule 2 (CONTRIBUTING.md, "Make staleness visible"): every policy
 * shows how long since its last update, prominently, using `formatRelative`
 * (via `Timestamp format="relative"`). This is rendered unconditionally, on
 * both the dashboard list item and the detail page, independent of whatever
 * `PolicyProgress` decides to show, so a percentage bar can never crowd this
 * fact off the page.
 *
 * A policy untouched for over a year, or one with no updates recorded at
 * all, gets the same visual treatment as a warning status: an icon, the
 * word, and the colour together (1.4.1), not a quietly identical grey line.
 */
export function PolicyLastUpdated({ policy, locale, now, className }: PolicyLastUpdatedProps) {
  const referenceNow = now ?? new Date();
  const latest = getLatestUpdate(policy.updates);

  if (!latest) {
    return (
      <p className={cx("m-0 flex items-center gap-[var(--space-1)] text-sm font-medium text-warning", className)}>
        <WarningIcon />
        <span>{UI.noUpdatesYet[locale]}</span>
      </p>
    );
  }

  const days = (referenceNow.getTime() - new Date(latest.date).getTime()) / (1000 * 60 * 60 * 24);
  const isStale = days > STALE_AFTER_DAYS;

  return (
    <p
      className={cx(
        "m-0 flex flex-wrap items-center gap-[var(--space-1)] text-sm",
        isStale ? "font-medium text-warning" : "text-ink-600",
        className,
      )}
    >
      {isStale ? <WarningIcon /> : null}
      <span>
        {UI.lastUpdated[locale]}: <Timestamp value={latest.date} locale={locale} format="relative" now={referenceNow} />
      </span>
      {isStale ? <span>({NO_MOVEMENT_LABEL[locale]})</span> : null}
    </p>
  );
}
