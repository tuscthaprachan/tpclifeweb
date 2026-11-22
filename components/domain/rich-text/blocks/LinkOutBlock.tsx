import { ExternalLink } from "lucide-react";
import { ArrowRightIcon, IconTile, Link } from "@/components/ui";
import { pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { LinkOutAttrs } from "@/lib/rich-text/schema";

/**
 * A single labelled outbound link, set apart from surrounding paragraphs.
 * Renders through the shared ui `Link` so external destinations get
 * `rel="noopener noreferrer"` and the visually-hidden "opens in a new tab"
 * suffix automatically. When `requiresSignIn` is on, that is stated in
 * visible text before the link itself, not just implied by an icon (3.3.8,
 * and the same honesty rule the emergency report form relies on).
 */
export function LinkOutBlock({ attrs, locale }: { attrs: LinkOutAttrs; locale: Locale }) {
  if (!attrs?.url) return null;

  const label = pick(attrs.label, locale);
  const description = attrs.description ? pick(attrs.description, locale) : "";

  return (
    <Link
      href={attrs.url}
      locale={locale}
      className="press group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[var(--space-3)] rounded-[var(--radius-block)] bg-surface-alt p-[var(--space-3)] no-underline"
    >
      <IconTile icon={ExternalLink} tone="soft" />
      <span className="min-w-0">
        {attrs.requiresSignIn ? <span className="block text-sm font-medium text-ink-600">{UI.requiresSignIn[locale]}</span> : null}
        <span className="block font-semibold leading-snug text-action group-hover:underline">{label}</span>
        {description ? <span className="block text-sm text-ink-600">{description}</span> : null}
      </span>
      <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-action text-action-ink">
        <ArrowRightIcon />
      </span>
    </Link>
  );
}
