import { Link } from "@/components/ui";
import { pick, type Locale } from "@/lib/i18n/config";
import type { HelpContact } from "@/lib/content/types";

/** Channel to href. The same mapping as components/domain/rich-text/blocks/ContactBlock.tsx and components/layout/HelpBlock.tsx. */
function contactHref(contact: HelpContact): string | null {
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

/** How to start a claim, when `claimContact` is set on a found item. */
export function LostFoundClaimContact({ contact, locale }: { contact: HelpContact; locale: Locale }) {
  const label = pick(contact.label, locale);
  const hours = contact.hours ? pick(contact.hours, locale) : "";
  const href = contactHref(contact);
  const showsValueAsText = !href && contact.channel !== "inPerson";

  return (
    <div className="rounded-panel border border-line-strong px-[var(--space-4)] py-[var(--space-3)]">
      {href ? (
        <Link href={href} locale={locale} className="font-semibold text-action">
          {label}
        </Link>
      ) : (
        <p className="m-0 font-semibold text-ink-900">{label}</p>
      )}
      {contact.channel === "inPerson" ? <p className="m-0 mt-[var(--space-1)] text-ink-600">{contact.value}</p> : null}
      {showsValueAsText ? (
        <p className="m-0 mt-[var(--space-1)] text-ink-600">
          {contact.channel.toUpperCase()}: {contact.value}
        </p>
      ) : null}
      {hours ? <p className="m-0 mt-[var(--space-1)] text-sm text-ink-600">{hours}</p> : null}
    </div>
  );
}
