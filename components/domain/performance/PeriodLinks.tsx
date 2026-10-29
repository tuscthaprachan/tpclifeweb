/**
 * The period selector: three plain links, so it works without JavaScript and
 * can be bookmarked. The current one is marked with `aria-current` and is not
 * a link. `basePath` is the page's own path without the query.
 */

import Link from "next/link";
import { PERIODS, type Period } from "@/lib/performance/period";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

const LABEL = { "30d": "perfPeriod30d", "12m": "perfPeriod12m", all: "perfPeriodAll" } as const;

export function PeriodLinks({ locale, current, basePath }: { locale: Locale; current: Period; basePath: string }) {
  return (
    <nav aria-label={UI.perfPeriodLabel[locale]}>
      <p className="m-0 mb-[var(--space-2)] font-medium text-ink-900">{UI.perfPeriodLabel[locale]}</p>
      <ul className="m-0 flex list-none flex-wrap gap-x-[var(--space-6)] gap-y-[var(--space-2)] p-0">
        {PERIODS.map((period) => (
          <li key={period}>
            {period === current ? (
              <span aria-current="page" className="inline-flex min-h-[var(--target-min)] items-center border-b-2 border-ink-900 font-semibold text-ink-900">
                {UI[LABEL[period]][locale]}
              </span>
            ) : (
              <Link href={`${basePath}?period=${period}`} className="inline-flex min-h-[var(--target-min)] items-center text-action underline">
                {UI[LABEL[period]][locale]}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
