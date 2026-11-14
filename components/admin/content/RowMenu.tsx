import Link from "next/link";
import { ConsoleIcon, type ConsoleIconName } from "@/components/admin/icons";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

export interface RowMenuItem {
  href: string;
  icon: ConsoleIconName;
  label: string;
  external?: boolean;
}

const ITEM = "flex min-h-[var(--target-min)] items-center gap-[var(--space-2)] whitespace-nowrap px-[var(--space-3)] py-[var(--space-1)] text-ink-900 no-underline hover:bg-surface-alt";

/**
 * A "More" menu built on `<details>`: it opens with Enter or Space on the
 * summary and its items are ordinary links, so it works without JavaScript
 * and with the keyboard alone.
 */
export function RowMenu({ locale, name, items }: { locale: Locale; name: string; items: RowMenuItem[] }) {
  return (
    <details className="relative inline-block">
      <summary className="inline-flex min-h-[var(--target-min)] min-w-[var(--target-min)] cursor-pointer list-none items-center justify-center gap-[var(--space-1)] rounded-control border border-line-strong bg-surface px-[var(--space-2)] text-ink-900 hover:bg-surface-alt [&::-webkit-details-marker]:hidden">
        <ConsoleIcon name="more" size={16} />
        <span className="visually-hidden">{a("clMoreFor", locale, { name })}</span>
      </summary>
      <ul className="absolute end-0 z-10 m-0 mt-[var(--space-1)] min-w-[12rem] list-none rounded-control border border-line-strong bg-surface p-0 shadow-[var(--shadow-elevation)]">
        {items.map((item) => (
          <li key={item.href + item.label}>
            <Link href={item.href} className={ITEM} {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}>
              <ConsoleIcon name={item.icon} size={16} />
              <span>
                {item.label}
                <span className="visually-hidden"> {name}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
