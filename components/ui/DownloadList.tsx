import { cx } from "./cx";

export interface DownloadItem {
  label: string;
  href: string;
  /** File type as people say it, such as "CSV" or "PDF". */
  format: string;
  /** Already formatted, such as "24 KB". */
  size: string;
}

interface DownloadListProps {
  items: DownloadItem[];
  className?: string;
}

/** A bare list of files. Each link says what it is, its type and its size, so nobody opens a file blind. */
export function DownloadList({ items, className }: DownloadListProps) {
  if (items.length === 0) return null;
  return (
    <ul className={cx("m-0 flex list-none flex-col p-0", className)}>
      {items.map((item) => (
        <li key={item.href}>
          <a href={item.href} download className="inline-flex min-h-[var(--target-min)] items-center text-action underline hover:text-action-hover">
            {item.label} ({item.format}, {item.size})
          </a>
        </li>
      ))}
    </ul>
  );
}
