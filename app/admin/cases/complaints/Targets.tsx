import { ConsoleIcon } from "@/components/admin/icons";
import { Timestamp } from "@/components/ui";
import type { ComplaintFacts } from "@/lib/complaints/details";
import { workingDaysUntil } from "@/lib/complaints/working-days";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

export const WORKING_STATUSES = new Set(["received", "acknowledged", "in_progress", "reopened"]);

/** The acknowledge and resolve targets of a complaint with the time left, as plain facts with no personal data. */
export function ComplaintTargets({ facts, status, locale, now }: { facts: ComplaintFacts; status: string; locale: Locale; now: Date }) {
  const open = WORKING_STATUSES.has(status);
  const target = (label: string, due: Date, done: Date | null) => {
    let state: React.ReactNode;
    if (done) {
      state = (
        <span className="inline-flex items-center gap-[var(--space-1)]">
          <ConsoleIcon name="check" size={16} />
          {a("cpcTargetMet", locale)}
        </span>
      );
    } else if (!open) {
      state = <span className="text-ink-600">{a("cpcTargetNa", locale)}</span>;
    } else {
      const left = workingDaysUntil(now, due);
      state =
        due.getTime() < now.getTime() ? (
          <span className="inline-flex items-center gap-[var(--space-1)] font-semibold">
            <ConsoleIcon name="overdue" size={16} />
            {a("cpcOverdue", locale)}
          </span>
        ) : (
          <span className="text-ink-600">{left <= 0 ? a("cpcDueToday", locale) : a(left === 1 ? "cpcWorkingDaysLeftOne" : "cpcWorkingDaysLeft", locale, { count: left })}</span>
        );
    }
    return (
      <div className="console-kv-row">
        <dt className="text-ink-600">{label}</dt>
        <dd className="m-0 flex min-w-0 flex-col gap-[var(--space-1)] text-ink-900">
          <Timestamp value={due} locale={locale} format="date" />
          {state}
        </dd>
      </div>
    );
  };
  return (
    <dl className="console-kv">
      {target(a("cpcRowAcknowledgeDue", locale), facts.acknowledgeDueAt, facts.acknowledgedAt)}
      {target(a("cpcRowResolveDue", locale), facts.resolveDueAt, facts.resolvedAt)}
    </dl>
  );
}
