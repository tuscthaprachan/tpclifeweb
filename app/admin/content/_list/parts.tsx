import type { ReactNode } from "react";
import { ConsoleIcon, type ConsoleIconName } from "@/components/admin/icons";
import { StatusTag } from "@/components/ui";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

/** `?a=1&b=2` from the defined, non-empty values; empty when there are none. */
export function queryString(params: Record<string, string | number | undefined | null | false>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === false || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

/** Reads a positive `?page=`. */
export function parsePage(value: string | undefined): number {
  return Math.max(1, Number.parseInt(value ?? "1", 10) || 1);
}

/** Published or draft, as an icon-led tag. */
export function PublishState({ published, locale }: { published: boolean; locale: Locale }) {
  return <StatusTag tone={published ? "success" : "neutral"} label={a(published ? "statusPublished" : "statusDraft", locale)} />;
}

/** A row action: an icon and text, with the row's name read out after the text. */
export function RowAction({ href, icon, children, name, external }: { href: string; icon: ConsoleIconName; children: ReactNode; name?: string; external?: boolean }) {
  return (
    <a href={href} className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-1)] whitespace-nowrap" {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
      <ConsoleIcon name={icon} size={16} />
      <span>
        {children}
        {name ? <span className="visually-hidden"> {name}</span> : null}
      </span>
    </a>
  );
}

/** The count line under a toolbar, announced politely when a filter changes it. */
export function ResultCount({ text }: { text: string }) {
  return (
    <p role="status" className="m-0 text-sm text-ink-600">
      {text}
    </p>
  );
}
