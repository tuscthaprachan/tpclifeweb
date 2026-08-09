import { Link } from "@/components/ui";
import { pick, type Locale } from "@/lib/i18n/config";
import type { Organisation } from "@/lib/sanity/types";
import { contactHref, contactLabel } from "./contactHref";

/**
 * One organisation's entry in the directory: name, and its real contact
 * channels as links.
 *
 * The `id` is the anchor the search index links to. Organisations have no page
 * of their own, so a search result for one deep-links to its row here as
 * `/directory#org-{slug}`. `scroll-mt` keeps the row clear of the sticky
 * header when the browser jumps to it (2.4.11).
 */
export function OrganisationListItem({ org, locale }: { org: Organisation; locale: Locale }) {
  return (
    <li
      id={`org-${org.slug.current}`}
      className="scroll-mt-[calc(var(--header-height,4rem)+var(--space-4))] py-[var(--space-3)]"
    >
      <p className="m-0 font-semibold text-ink-900">{pick(org.name, locale)}</p>
      {org.location ? <p className="m-0 text-sm text-ink-600">{pick(org.location, locale)}</p> : null}
      <ul className="m-0 mt-[var(--space-1)] flex list-none flex-wrap gap-x-[var(--space-4)] gap-y-[var(--space-1)] p-0 text-sm">
        {org.contacts.map((contact) => {
          const href = contactHref(contact);
          const label = contactLabel(contact, locale);
          return (
            <li key={contact._key}>
              {href ? (
                <Link href={href} locale={locale} className="font-medium text-action">
                  {label}
                </Link>
              ) : (
                <span className="text-ink-600">{label}</span>
              )}
            </li>
          );
        })}
      </ul>
    </li>
  );
}
