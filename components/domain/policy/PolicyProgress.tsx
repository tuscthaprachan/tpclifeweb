import { Timestamp } from "@/components/ui/Timestamp";
import { cx } from "@/components/ui/cx";
import { pick, type Locale, type LocaleString } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import type { Policy } from "@/lib/content/types";
import { getLatestUpdate } from "./updates";

/**
 * No shared label exists for "progress" as a standalone word: UI.policyTracker
 * names the whole dashboard ("Policy progress"), not one policy's own bar.
 */
// TODO: add to UI strings.
const PROGRESS_LABEL: LocaleString = { th: "ความคืบหน้า", en: "Progress" };

interface PolicyProgressProps {
  policy: Policy;
  locale: Locale;
  className?: string;
}

/**
 * Honesty rule 1 (CONTRIBUTING.md, and the doc comment on
 * `Policy.progressPercent` in lib/content/types.ts): a percentage renders
 * ONLY when an editor set one by hand, never inferred from status, dates or
 * the number of updates.
 *
 * How this makes a fabricated bar structurally impossible: this component's
 * only input is the whole `policy` record, not a bare `percent` number. There
 * is no prop through which a caller could hand it a made-up figure. The one
 * and only expression that ever produces a percentage here is
 * `policy.progressPercent` itself, read directly off the CMS record a few
 * lines below. When that field is `undefined` this function has exactly one
 * other branch, and that branch does not draw a bar under any circumstance:
 * it renders the latest recorded update instead. There is no third path, and
 * no arithmetic anywhere in this file derives a number from a status, a date
 * or an update count.
 */
export function PolicyProgress({ policy, locale, className }: PolicyProgressProps) {
  if (typeof policy.progressPercent === "number") {
    const percent = Math.min(100, Math.max(0, Math.round(policy.progressPercent)));
    const labelId = `policy-progress-label-${policy._id}`;

    return (
      <div className={className}>
        <div className="flex items-baseline justify-between gap-[var(--space-2)]">
          <span id={labelId} className="text-sm font-medium text-ink-900">
            {PROGRESS_LABEL[locale]}
          </span>
          <span className="text-sm font-semibold text-ink-900">{formatNumber(percent, locale)}%</span>
        </div>
        <div
          role="progressbar"
          aria-labelledby={labelId}
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-[var(--space-1)] h-[var(--space-3)] w-full overflow-hidden rounded-pill border border-line-strong bg-surface-sunk"
        >
          <div className="h-full rounded-pill bg-governance" style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  }

  const latest = getLatestUpdate(policy.updates);
  if (!latest) {
    return <p className={cx("m-0 text-sm text-ink-600", className)}>{UI.noUpdatesYet[locale]}</p>;
  }

  return (
    <div className={cx("text-sm", className)}>
      <p className="m-0 text-ink-600">
        {UI.lastUpdated[locale]}: <Timestamp value={latest.date} locale={locale} />
      </p>
      <p className="m-0 text-ink-900">{pick(latest.note, locale)}</p>
    </div>
  );
}
