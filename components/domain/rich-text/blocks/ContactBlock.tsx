import { IconTile, Link, helpChannelIcon } from "@/components/ui";
import { pick, type Locale } from "@/lib/i18n/config";
import type { ContactBlockAttrs } from "@/lib/rich-text/schema";

/**
 * Channel to href. Mirrors `components/layout/HelpBlock.tsx`'s mapping
 * (duplicated rather than imported to keep this directory self-contained).
 *
 * `"line"` has no href: TPC LINE IDs seen so far are personal or unofficial,
 * with no reliable add-friend URL pattern, so a fabricated link could easily
 * point nowhere. It is shown as plain text below instead of rendering
 * nothing.
 */
function contactHref(contact: ContactBlockAttrs): string | null {
  switch (contact.channel) {
    case "email":
      return `mailto:${contact.value}`;
    case "phone":
      return `tel:${contact.value.replace(/[\s-]/g, "")}`;
    case "url":
      return contact.value;
    case "inPerson":
    case "line":
      return null;
  }
}

/**
 * A contact card embedded directly in body text, for pointing at a specific
 * person or channel partway through a page, distinct from the sitewide help
 * block (3.2.6), which always lives in the same place in the footer.
 */
export function ContactBlockRenderer({ attrs, locale, preview }: { attrs: ContactBlockAttrs; locale: Locale; preview?: boolean }) {
  if (!attrs?.value) return null;

  const label = pick(attrs.label, locale);
  const hours = attrs.hours ? pick(attrs.hours, locale) : "";
  const href = contactHref(attrs);
  /**
   * "In person" already reads naturally as a place, so its value is shown on
   * its own line. Every other href-less channel still needs its raw value
   * shown somewhere: a label with a dead, unclickable link and no visible
   * value is a card that tells the reader nothing they can act on.
   */
  const showsValueAsText = !href && attrs.channel !== "inPerson";

  const value = attrs.channel === "url" ? "" : attrs.value;

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-[var(--space-3)] rounded-[var(--radius-block)] bg-surface-alt p-[var(--space-3)]">
      <IconTile icon={helpChannelIcon(attrs.channel)} tone="soft" />
      <div className="min-w-0">
        {href && preview ? (
          <p className="m-0 font-semibold text-action underline">{label}</p>
        ) : href ? (
          <Link href={href} locale={locale} className="font-semibold text-action">
            {label}
          </Link>
        ) : (
          <p className="m-0 font-semibold text-ink-900">{label}</p>
        )}
        {value ? (
          <p className="m-0 mt-[var(--space-1)] text-[length:var(--text-lg)] font-bold text-ink-900 [overflow-wrap:anywhere]">
            {showsValueAsText ? `${attrs.channel.toUpperCase()}: ${value}` : value}
          </p>
        ) : null}
        {hours ? <p className="m-0 mt-[var(--space-1)] text-sm text-ink-600">{hours}</p> : null}
      </div>
    </div>
  );
}
