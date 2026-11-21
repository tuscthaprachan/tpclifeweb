import { MapPin } from "lucide-react";
import { IconText } from "@/components/ui";
import { pick, type Locale } from "@/lib/i18n/config";
import type { Organisation } from "@/lib/content/types";
import { ContactList } from "./ContactList";

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
      <div className="mt-[var(--space-1)]">
        <ContactList contacts={org.contacts} locale={locale} />
      </div>
    </li>
  );
}
