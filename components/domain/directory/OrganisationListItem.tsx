import { MapPin } from "lucide-react";
import { IconText, Link } from "@/components/ui";
import { pick, type Locale } from "@/lib/i18n/config";
import type { Organisation } from "@/lib/content/types";
import { CopyContactButton } from "./CopyContactButton";
import { contactHref, contactLabel } from "./contactHref";
import { contactIcon } from "./contactIcon";

/**
 * One organisation's entry in the directory: name, and its real contact
 * channels as links.
 *
 * The `id` is the anchor the search index links to. Organisations have no page
 * of their own, so a search result for one deep-links to its row here as
 * `/directory#org-{slug}`. `scroll-mt` keeps the row clear of the sticky
 * header when the browser jumps to it (2.4.11), and `target:` marks the row
 * the link landed on.
 */
export function OrganisationListItem({ org, locale }: { org: Organisation; locale: Locale }) {
  return (
    <li
      id={`org-${org.slug.current}`}
      className="scroll-mt-[calc(var(--header-height,4rem)+var(--space-4))] py-[var(--space-3)] target:bg-surface-alt"
    >
      <p className="m-0 font-semibold text-ink-900">{pick(org.name, locale)}</p>
      {org.scope === "programme" && org.programmeName ? (
        <p className="m-0 text-sm text-ink-600">{pick(org.programmeName, locale)}</p>
      ) : null}
      {org.description ? <p className="m-0 mt-[var(--space-1)] text-sm text-ink-600">{pick(org.description, locale)}</p> : null}
      {org.location ? (
        <p className="m-0 text-sm text-ink-600">
          <IconText icon={MapPin} size={14}>{pick(org.location, locale)}</IconText>
        </p>
      ) : null}
      <ul className="m-0 mt-[var(--space-1)] flex list-none flex-wrap gap-x-[var(--space-4)] gap-y-[var(--space-1)] p-0 text-sm">
        {org.contacts.map((contact) => {
          const href = contactHref(contact);
          const label = contactLabel(contact, locale);
          return (
            <li key={contact._key}>
              <IconText icon={contactIcon(contact.channel)} size={14} className="items-center">
                {href ? (
                  // IconText wraps the link in spans, so the global
                  // `li > a:only-child` 2.5.8 rule no longer reaches it: give
                  // it the target size here.
                  <Link
                    href={href}
                    locale={locale}
                    className="inline-flex min-h-[var(--target-min)] items-center font-medium text-action"
                  >
                    {label}
                  </Link>
                ) : (
                  <span className="text-ink-600">{label}</span>
                )}
              </IconText>
              {contact.channel === "line" ? (
                <span className="ml-[var(--space-2)] inline-flex items-center gap-[var(--space-2)]">
                  <CopyContactButton value={contact.value} locale={locale} />
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </li>
  );
}
