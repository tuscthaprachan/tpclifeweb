import { Link } from "@/components/ui";
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
    <div className="my-[var(--space-4)] flex flex-col gap-[var(--space-1)] rounded-panel border border-line-strong px-[var(--space-4)] py-[var(--space-3)]">
      {attrs.requiresSignIn ? <p className="m-0 text-sm font-medium text-ink-600">{UI.requiresSignIn[locale]}</p> : null}
      <Link href={attrs.url} locale={locale} className="font-semibold text-action">
        {label}
      </Link>
      {description ? <p className="m-0 text-sm text-ink-600">{description}</p> : null}
    </div>
  );
}
