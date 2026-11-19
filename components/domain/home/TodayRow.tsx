import NextLink from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRightIcon } from "@/components/ui";

interface TodayRowProps {
  title: ReactNode;
  /** The page with everything about this row. Every row has one, so the whole list reads and works the same way. */
  href?: string;
  status?: ReactNode;
  children: ReactNode;
  icon?: LucideIcon;
}

export function TodayRow({ title, href, status, children, icon: Icon }: TodayRowProps) {
  const label = Icon ? (
    <>
      <Icon className="me-[var(--space-2)] inline-block size-[1.15em] shrink-0 align-[-0.2em] text-ink-600" />
      {title}
    </>
  ) : (
    title
  );
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-[var(--space-3)] gap-y-[var(--space-1)] border-b border-line px-[var(--space-1)] py-[var(--space-3)]">
      <dt className="m-0 font-bold">
        {href ? (
          <NextLink href={href} className={TODAY_LINK_CLASS}>
            {label}
            <ArrowRightIcon className="ms-[var(--space-1)] text-action" />
          </NextLink>
        ) : (
          label
        )}
      </dt>
      {status ? <dd className="col-start-2 row-start-1 m-0">{status}</dd> : null}
      <dd className="col-span-2 m-0 flex flex-wrap items-baseline gap-x-[var(--space-2)] gap-y-[var(--space-1)] text-ink-600">{children}</dd>
    </div>
  );
}

export const TODAY_LINK_CLASS = "text-ink-900 no-underline hover:underline focus-visible:underline";
