import NextLink from "next/link";

import { ArrowRightIcon } from "@/components/ui";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { HomeTask } from "@/lib/content/types";
import { SectionBar } from "./SectionBar";

const HEADING_ID = "home-popular-heading";

interface PopularTasksProps {
  locale: Locale;
  tasks: readonly HomeTask[];
}

export function PopularTasks({ locale, tasks }: PopularTasksProps) {
  return (
    <section aria-labelledby={HEADING_ID}>
      <SectionBar id={HEADING_ID} tone="action">
        {UI.homePopular[locale]}
      </SectionBar>

      <ul className="m-0 mt-[var(--space-3)] grid list-none gap-[var(--space-2)] p-0">
        {tasks.map((task) => (
          <li key={task.path}>
            <NextLink
              href={localePath(locale, task.path)}
              className="press group grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-[var(--space-3)] rounded-[var(--radius-block)] bg-surface-alt py-[var(--space-2)] pl-[var(--space-4)] pr-[var(--space-2)] no-underline"
            >
              <span>
                <span className="block font-bold text-action group-hover:underline">{pick(task.label, locale)}</span>
                <span className="block text-[length:var(--text-sm)] leading-snug text-ink-600">{pick(task.description, locale)}</span>
              </span>
              <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-action text-action-ink">
                <ArrowRightIcon />
              </span>
            </NextLink>
          </li>
        ))}
      </ul>

      <NextLink
        href={localePath(locale, "/services")}
        className="inline-flex min-h-[var(--target-min)] items-center font-semibold"
      >
        {UI.homeAllServices[locale]}
      </NextLink>
    </section>
  );
}
