import { IconText, Link, TARGET_LINE_PADDING, cx } from "@/components/ui";
import type { OrganisationContact } from "@/lib/content/types";
import type { Locale } from "@/lib/i18n/config";
import { CopyContactButton } from "./CopyContactButton";
import { contactHref, contactLabel } from "./contactHref";
import { contactIcon } from "./contactIcon";

export function ContactList({ contacts, locale }: { contacts: OrganisationContact[]; locale: Locale }) {
  if (contacts.length === 0) return null;
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-[var(--space-4)] gap-y-[var(--space-1)] p-0 text-sm">
      {contacts.map((contact) => {
        const href = contactHref(contact);
        const label = contactLabel(contact, locale);
        return (
          <li key={contact._key}>
            <IconText icon={contactIcon(contact.channel)} size={14} target>
              {href ? (
                <Link href={href} locale={locale} className={cx("inline-block min-h-[var(--target-min)] font-medium text-action", TARGET_LINE_PADDING)}>
                  {label}
                </Link>
              ) : (
                <span className={cx("inline-block text-ink-600", TARGET_LINE_PADDING)}>{label}</span>
              )}
            </IconText>
            {contact.channel === "line" ? (
              <span className="ml-[var(--space-2)] inline-flex items-center gap-[var(--space-2)] align-top">
                <CopyContactButton value={contact.value} locale={locale} />
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
