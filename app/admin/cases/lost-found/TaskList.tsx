import type { ReactNode } from "react";
import { StatusTag } from "@/components/ui";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

export type TaskState = "completed" | "in_progress" | "not_started" | "optional" | "cannot_start";

export interface TaskItem {
  id: string;
  title: ReactNode;
  hint?: ReactNode;
  /** Null when the task cannot be opened yet. */
  href: string | null;
  state: TaskState;
}

const TONE = { completed: "success", in_progress: "warning", not_started: "info", optional: "neutral", cannot_start: "neutral" } as const;
const LABEL = {
  completed: "lfcTaskCompleted",
  in_progress: "lfcTaskInProgress",
  not_started: "lfcTaskNotStarted",
  optional: "lfcTaskOptional",
  cannot_start: "lfcTaskCannotStart",
} as const;

/**
 * The GOV.UK task list pattern: each task is a link with its own status, so a
 * longer job (logging a found item) can be done in any order and left half
 * done. A task that depends on others reads "Cannot start yet" and is not a link.
 */
export function TaskList({ items, locale }: { items: TaskItem[]; locale: Locale }) {
  const done = items.filter((i) => i.state === "completed").length;
  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      <p className="m-0 font-medium" role="status">
        {a("lfcTasksDone", locale, { done, total: items.length })}
      </p>
      <ol className="m-0 flex list-none flex-col p-0">
        {items.map((item, index) => (
          <li key={item.id} className="flex flex-wrap items-start justify-between gap-x-[var(--space-4)] gap-y-[var(--space-1)] border-b border-line py-[var(--space-3)] first:border-t">
            <div className="min-w-0 flex-1">
              <p className="m-0 text-lg">
                <span className="text-ink-600">{index + 1}. </span>
                {item.href ? (
                  <a href={item.href} className="font-medium" aria-describedby={`task-${item.id}-status`}>
                    {item.title}
                  </a>
                ) : (
                  <span className="font-medium" aria-describedby={`task-${item.id}-status`}>
                    {item.title}
                  </span>
                )}
              </p>
              {item.hint ? <p className="m-0 mt-[var(--space-1)] text-sm text-ink-600">{item.hint}</p> : null}
            </div>
            <span id={`task-${item.id}-status`}>
              <StatusTag tone={TONE[item.state]} label={a(LABEL[item.state], locale)} />
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
