export interface SectionJump {
  id: string;
  label: string;
}

/** Links to the sections of a long form, pinned under the top bar. Following one opens a folded section. */
export function SectionJumpNav({ label, items }: { label: string; items: SectionJump[] }) {
  return (
    <nav aria-label={label} className="sticky top-[var(--console-topbar-h)] z-10 -mx-[var(--space-1)] border-b border-line bg-surface px-[var(--space-1)] py-[var(--space-2)]">
      <ul className="m-0 flex list-none flex-wrap gap-x-[var(--space-4)] p-0">
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className="inline-flex min-h-[var(--target-min)] items-center">
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
