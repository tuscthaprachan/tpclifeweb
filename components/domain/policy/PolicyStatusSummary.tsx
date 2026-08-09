import { StatusTag } from "@/components/ui/StatusTag";
import { cx } from "@/components/ui/cx";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import type { Policy, PolicyStatus } from "@/lib/sanity/types";
import { STATUS_LABEL_KEY, STATUS_ORDER, STATUS_TONE } from "./statusLabels";

const BAR_SEGMENT_CLASS = {
  notStarted: "bg-neutral",
  inProgress: "bg-info",
  delivered: "bg-success",
  blocked: "bg-error",
  dropped: "bg-warning",
} as const satisfies Record<PolicyStatus, string>;

interface PolicyStatusSummaryProps {
  policies: Policy[];
  locale: Locale;
  className?: string;
}

/**
 * Counts by status, as text, with a decorative supporting bar. The bar is
 * `aria-hidden` and adds nothing a screen reader needs: every count and
 * every status word it represents is already in the list beneath it, so the
 * whole summary is "fully readable without the graphic" by construction, not
 * by a separate text alternative that has to be kept in sync by hand.
 */
export function PolicyStatusSummary({ policies, locale, className }: PolicyStatusSummaryProps) {
  const total = policies.length;
  const counts = STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = policies.filter((policy) => policy.status === status).length;
      return acc;
    },
    {} as Record<PolicyStatus, number>,
  );

  return (
    <div className={className}>
      {total > 0 ? (
        <div aria-hidden="true" className="flex h-[var(--space-2)] w-full overflow-hidden rounded-pill bg-neutral-soft">
          {STATUS_ORDER.filter((status) => counts[status] > 0).map((status) => (
            <span
              key={status}
              className={BAR_SEGMENT_CLASS[status]}
              style={{ width: `${(counts[status] / total) * 100}%` }}
            />
          ))}
        </div>
      ) : null}

      <ul className={cx("m-0 list-none p-0", total > 0 ? "mt-[var(--space-3)]" : "", "flex flex-wrap gap-x-[var(--space-6)] gap-y-[var(--space-2)]")}>
        {STATUS_ORDER.map((status) => (
          <li key={status} className="flex items-center gap-[var(--space-2)]">
            <StatusTag tone={STATUS_TONE[status]} label={UI[STATUS_LABEL_KEY[status]][locale]} />
            <span className="text-sm font-semibold text-ink-900">{formatNumber(counts[status], locale)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
