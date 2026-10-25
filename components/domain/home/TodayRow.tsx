import type { ReactNode } from "react";

interface TodayRowProps {
  title: ReactNode;
  status?: ReactNode;
  children: ReactNode;
}

export function TodayRow({ title, status, children }: TodayRowProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-[var(--space-3)] gap-y-[var(--space-1)] border-b border-line px-[var(--space-1)] py-[var(--space-3)]">
      <dt className="m-0 font-bold">{title}</dt>
      {status ? <dd className="col-start-2 row-start-1 m-0">{status}</dd> : null}
      <dd className="col-span-2 m-0 flex flex-wrap items-baseline gap-x-[var(--space-2)] gap-y-[var(--space-1)] text-ink-600">{children}</dd>
    </div>
  );
}

export const TODAY_LINK_CLASS = "text-ink-900 no-underline hover:underline";
