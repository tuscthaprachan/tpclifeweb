import { StatusTag } from "@/components/ui/StatusTag";
import { Timestamp } from "@/components/ui/Timestamp";
import { externalLinkProps, externalLinkSuffix, isExternalUrl } from "@/lib/a11y";
import { pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { PolicyUpdate } from "@/lib/content/types";
import { STATUS_LABEL_KEY, STATUS_TONE } from "./statusLabels";
import { sortUpdatesDesc } from "./updates";

interface PolicyUpdateListProps {
  updates: PolicyUpdate[];
  locale: Locale;
  className?: string;
}

/**
 * The full update history, reverse chronological. Each entry carries its own
 * date, note and status as at that update (`PolicyUpdate.status`), so the
 * history reads correctly on its own even if a reader jumps straight to one
 * entry: it does not depend on the policy's current status to make sense.
 */
export function PolicyUpdateList({ updates, locale, className }: PolicyUpdateListProps) {
  if (updates.length === 0) {
    return <p className={className ? className : "m-0 text-ink-600"}>{UI.noUpdatesYet[locale]}</p>;
  }

  const sorted = sortUpdatesDesc(updates);

  return (
    <ol className={className ? className : "m-0 flex list-none flex-col gap-[var(--space-4)] p-0"}>
      {sorted.map((update) => {
        const evidenceExternal = update.evidenceUrl ? isExternalUrl(update.evidenceUrl) : false;
        return (
          <li key={update._key} className="flex flex-col gap-[var(--space-2)] border-b border-line pb-[var(--space-4)] last:border-b-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-[var(--space-3)]">
              <Timestamp value={update.date} locale={locale} className="text-sm font-medium text-ink-900" />
              <StatusTag tone={STATUS_TONE[update.status]} label={UI[STATUS_LABEL_KEY[update.status]][locale]} />
            </div>
            <p className="m-0 text-ink-900">{pick(update.note, locale)}</p>
            {update.author ? <p className="m-0 text-sm text-ink-600">{pick(update.author, locale)}</p> : null}
            {update.evidenceUrl ? (
              <a href={update.evidenceUrl} {...externalLinkProps(evidenceExternal)} className="text-sm font-medium text-action underline">
                {UI.evidence[locale]}
                {evidenceExternal ? <span className="visually-hidden">{externalLinkSuffix(locale, true)}</span> : null}
              </a>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
