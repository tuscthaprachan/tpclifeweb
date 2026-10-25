import { StatusTag } from "@/components/ui/StatusTag";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import type { Policy, PolicyStatus } from "@/lib/content/types";
import { STATUS_LABEL_KEY, STATUS_ORDER, STATUS_TONE } from "./statusLabels";

interface PolicyStatusSummaryProps {
  policies: Policy[];
  locale: Locale;
  className?: string;
}

/**
 * Counts by status, as plain text: a status tag and its count for each
 * status. There is no coloured bar or tinted panel, so the summary reads the
 * same in any theme and with no graphic to keep in sync with the numbers.
 */
export function PolicyStatusSummary({ policies, locale, className }: PolicyStatusSummaryProps) {
  const counts = STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = policies.filter((policy) => policy.status === status).length;
      return acc;
    },
    {} as Record<PolicyStatus, number>,
  );

  return (
    <div className={className}>
      <ul className="m-0 flex list-none flex-wrap gap-x-[var(--space-6)] gap-y-[var(--space-2)] p-0">
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
