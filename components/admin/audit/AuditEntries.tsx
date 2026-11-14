import Link from "next/link";
import { ConsoleIcon } from "@/components/admin/icons";
import { Timestamp } from "@/components/ui";
import { describeAction, entityHref } from "@/lib/admin/audit/describe";
import { diffRecords } from "@/lib/admin/audit/diff";
import type { AuditEntry } from "@/lib/admin/audit/query";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

export function actorLabel(entry: Pick<AuditEntry, "actorUserId" | "actorName" | "actorEmail">, locale: Locale): string {
  if (!entry.actorUserId) return a("opActorSystem", locale);
  return entry.actorName?.trim() || entry.actorEmail || a("opActorUnknown", locale);
}

const KIND_KEY = { added: "opChangeAdded", changed: "opChangeChanged", removed: "opChangeRemoved" } as const;

function Changes({ entry, locale }: { entry: AuditEntry; locale: Locale }) {
  const rows = diffRecords(entry.before, entry.after);
  if (rows.length === 0) return <p className="m-0 text-sm text-ink-600">{a("opNoChanges", locale)}</p>;
  return (
    <div>
      <p className="m-0 mb-[var(--space-2)] text-sm font-semibold">{a("opChangesHeading", locale)}</p>
      <ul className="m-0 grid list-none gap-[var(--space-2)] p-0">
        {rows.map((row) => (
          <li key={row.path} className="min-w-0 border-l-2 border-line-strong ps-[var(--space-3)]">
            <p className="m-0 break-words font-mono text-sm font-semibold">
              {row.path} <span className="font-sans font-normal text-ink-600">({a(KIND_KEY[row.kind], locale)})</span>
            </p>
            {row.before !== null ? (
              <p className="m-0 break-words text-sm">
                <span className="text-ink-600">{a("opChangeBefore", locale)}: </span>
                <span className="whitespace-pre-wrap">{row.before}</span>
              </p>
            ) : null}
            {row.after !== null ? (
              <p className="m-0 break-words text-sm">
                <span className="text-ink-600">{a("opChangeAfter", locale)}: </span>
                <span className="whitespace-pre-wrap">{row.after}</span>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Audit entries as a list. Each is a native `details`, so it opens without
 * JavaScript. The before and after values are shown only when `showChanges`
 * is set, which is for administrators; everyone else sees who did what and when.
 */
export function AuditEntries({ entries, locale, showChanges, showEntity = true }: { entries: readonly AuditEntry[]; locale: Locale; showChanges: boolean; showEntity?: boolean }) {
  return (
    <ul className="m-0 list-none p-0">
      {entries.map((entry) => {
        const actor = actorLabel(entry, locale);
        const described = describeAction(entry, locale, { actor, entity: entry.entityId });
        const href = entityHref(entry.entityType, entry.entityId);
        return (
          <li key={entry.id} className="border-t border-line first:border-t-0">
            <details className="group">
              <summary className="flex min-h-[var(--target-min)] cursor-pointer list-none flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)] px-[var(--space-4)] py-[var(--space-2)] [&::-webkit-details-marker]:hidden">
                <ConsoleIcon name={described.icon} className="text-ink-600" />
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-medium">{described.text}</span>
                  <span className="block text-sm text-ink-600">
                    <Timestamp value={entry.occurredAt} locale={locale} format="datetime" />
                    {" · "}
                    <span className="font-mono">{entry.action}</span>
                  </span>
                </span>
                <ConsoleIcon name="chevronDown" size={16} className="text-ink-600 transition-transform group-open:rotate-180" />
              </summary>
              <div className="grid gap-[var(--space-3)] px-[var(--space-4)] pb-[var(--space-4)] ps-[calc(var(--space-4)+var(--space-6))]">
                <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-[var(--space-4)] gap-y-[var(--space-1)] text-sm">
                  <dt className="text-ink-600">{a("opColActor", locale)}</dt>
                  <dd className="m-0 break-words">{actor}</dd>
                  {showEntity ? (
                    <>
                      <dt className="text-ink-600">{a("opColEntity", locale)}</dt>
                      <dd className="m-0 break-all">
                        {entry.entityType} / {href ? <Link href={href}>{entry.entityId}</Link> : entry.entityId}
                      </dd>
                    </>
                  ) : null}
                  {entry.ip ? (
                    <>
                      <dt className="text-ink-600">{a("opColIp", locale)}</dt>
                      <dd className="m-0 break-all">{entry.ip}</dd>
                    </>
                  ) : null}
                  {entry.requestId ? (
                    <>
                      <dt className="text-ink-600">{a("opColRequest", locale)}</dt>
                      <dd className="m-0 break-all font-mono">{entry.requestId}</dd>
                    </>
                  ) : null}
                </dl>
                {showChanges ? <Changes entry={entry} locale={locale} /> : null}
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
