import type { ReactNode } from "react";

export interface KeyValueItem {
  label: ReactNode;
  value: ReactNode;
}

/** A compact label and value list (a `dl`). Side by side from 40rem, stacked below. */
export function KeyValue({ items, className = "" }: { items: KeyValueItem[]; className?: string }) {
  return (
    <dl className={`console-kv ${className}`}>
      {items.map((item, i) => (
        <div key={i} className="console-kv-row">
          <dt className="text-ink-600">{item.label}</dt>
          <dd className="m-0 min-w-0 break-words text-ink-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
