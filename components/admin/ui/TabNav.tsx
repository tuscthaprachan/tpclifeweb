import Link from "next/link";

export interface TabNavItem {
  id: string;
  label: string;
  href: string;
}

export interface TabNavProps {
  /** Names the group for assistive technology, e.g. "Loans sections". */
  label: string;
  items: TabNavItem[];
  /** The `id` of the chosen tab. */
  current: string;
  className?: string;
}

/** Tabs that are plain links, so they work without JavaScript. The chosen one carries aria-current="page". The row scrolls sideways on a narrow screen instead of wrapping. */
export function TabNav({ label, items, current, className = "" }: TabNavProps) {
  return (
    <nav aria-label={label} className={className}>
      <ul className="m-0 flex list-none gap-[var(--space-1)] overflow-x-auto p-0">
        {items.map((item) => {
          const selected = item.id === current;
          return (
            <li key={item.id} className="shrink-0">
              <Link
                href={item.href}
                aria-current={selected ? "page" : undefined}
                className={`inline-flex min-h-[var(--target-min)] items-center whitespace-nowrap border-b-[3px] px-[var(--space-3)] text-ink-900 no-underline hover:bg-surface-alt ${selected ? "border-ink-900 font-semibold" : "border-transparent"}`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
