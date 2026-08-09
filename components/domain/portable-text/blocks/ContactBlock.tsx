import { Link } from "@/components/ui";
import { pick, type Locale } from "@/lib/i18n/config";
import type { HelpContact } from "@/lib/sanity/types";

export type ContactBlockValue = HelpContact & { _type: "contactBlock"; _key: string };

/**
 * Channel to href. Mirrors `components/layout/HelpBlock.tsx`'s mapping
 * (duplicated rather than imported: that component lives outside this
 * agent's owned directories, and importing across an in-progress parallel
 * workstream is how a build breaks on someone else's half-finished file).
 *
 * `HelpContact["channel"]` also allows `"line"`, which this switch has no
 * href for: TPC LINE IDs seen so far are personal or unofficial, with no
 * reliable add-friend URL pattern, so a fabricated link could easily point
 * nowhere. Falling through to `null` would silently render nothing at all,
 * which is worse than showing the LINE ID as plain text, so that channel is
 * handled explicitly below rather than left to fall through.
 */
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

/**
 * A contact card embedded directly in body text, for pointing at a specific
 * person or channel partway through a page, distinct from the sitewide help
 * block (3.2.6), which always lives in the same place in the footer.
 */
export function ContactBlockRenderer({ value, locale }: { value: ContactBlockValue; locale: Locale }) {
  if (!value?.value) return null;

  const label = pick(value.label, locale);
  const hours = value.hours ? pick(value.hours, locale) : "";
  const href = contactHref(value);
  /**
   * "In person" already reads naturally as a place, so its value is shown on
   * its own line. Every other href-less channel (currently just "line", but
   * this also covers any future channel `contactHref` does not yet know
   * about) still needs its raw value shown somewhere: a label with a dead,
   * unclickable link and no visible value is a card that tells the reader
   * nothing they can act on.
   */
  const showsValueAsText = !href && value.channel !== "inPerson";

  return (
    <div className="my-[var(--space-4)] rounded-panel border border-line-strong px-[var(--space-4)] py-[var(--space-3)]">
      {href ? (
        <Link href={href} locale={locale} className="font-semibold text-action">
          {label}
        </Link>
      ) : (
        <p className="m-0 font-semibold text-ink-900">{label}</p>
      )}
      {value.channel === "inPerson" ? <p className="m-0 mt-[var(--space-1)] text-ink-600">{value.value}</p> : null}
      {showsValueAsText ? (
        <p className="m-0 mt-[var(--space-1)] text-ink-600">
          {value.channel.toUpperCase()}: {value.value}
        </p>
      ) : null}
      {hours ? <p className="m-0 mt-[var(--space-1)] text-sm text-ink-600">{hours}</p> : null}
    </div>
  );
}
