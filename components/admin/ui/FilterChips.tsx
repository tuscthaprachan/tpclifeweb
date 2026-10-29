import { ConsoleIcon } from "@/components/admin/icons";
import { Badge } from "./Badge";

export interface FilterChip {
  id: string;
  label: string;
  href: string;
  /** Shown as a count pill after the label. */
  count?: number;
}

export interface FilterChipsProps {
  /** Names the group for assistive technology, e.g. "Filter by status". */
  label: string;
  options: FilterChip[];
  /** The `id` of the chosen option. */
  current: string;
  className?: string;
}

/** Pill filters that are plain links, so they work without JavaScript. The chosen one carries aria-current and a tick. */
export function FilterChips({ label, options, current, className = "" }: FilterChipsProps) {
  return (
    <nav aria-label={label} className={className}>
      <ul className="m-0 flex list-none flex-wrap gap-[var(--space-2)] p-0">
        {options.map((option) => {
          const selected = option.id === current;
          return (
            <li key={option.id}>
              <a href={option.href} aria-current={selected ? "true" : undefined} className="console-chip">
                {selected ? <ConsoleIcon name="check" size={14} /> : null}
                <span>{option.label}</span>
                {option.count !== undefined ? <Badge>{option.count}</Badge> : null}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
