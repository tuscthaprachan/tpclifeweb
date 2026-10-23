/**
 * 3.2.6 Consistent Help. Rendered by `SiteFooter`, which every page includes
 * through the root layout, so it is always in the same place. Content comes
 * from `SiteSettings.helpContacts`; nothing here is page-specific, which is
 * the point.
 */

import { externalLinkProps, externalLinkSuffix, isExternalUrl } from "@/lib/a11y";
import { pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { HelpContact } from "@/lib/content/types";

function contactHref(contact: HelpContact): string | null {
  switch (contact.channel) {
    case "email":
      return `mailto:${contact.value}`;
    case "phone":
      return `tel:${contact.value.replace(/[\s-]/g, "")}`;
    case "line":
    case "url":
      return contact.value;
    case "inPerson":
      return null;
  }
}

export function HelpBlock({ locale, contacts }: { locale: Locale; contacts: HelpContact[] }) {
  if (contacts.length === 0) return null;

  return (
    <section aria-labelledby="need-help-heading" className="border-t border-line py-6">
      <h2 id="need-help-heading" className="text-lg">
        {UI.needHelp[locale]}
      </h2>
      <p className="mt-2 text-ink-600">{UI.helpIntro[locale]}</p>
      <ul className="mt-4 flex flex-col gap-2">
        {contacts.map((contact) => {
          const href = contactHref(contact);
          const label = pick(contact.label, locale);
          const hours = contact.hours ? pick(contact.hours, locale) : null;
          const external = href ? isExternalUrl(href) : false;

          return (
            // Channel plus value is unique in practice and stable across
            // re-renders, since contacts never come from a paginated list.
            <li key={`${contact.channel}-${contact.value}`}>
              {href ? (
                /*
                 * inline-flex plus min-height, because 2.5.8 Target Size
                 * applies here. These are standalone contact targets in a
                 * list, not links inside a running sentence, so the
                 * criterion's inline exception does not cover them. Left as
                 * plain inline text they render 22px tall and fail.
                 *
                 * --target-min is 24px, and 44px under `pointer: coarse`, so
                 * a phone gets a comfortable tap target for free.
                 */
                <a
                  href={href}
                  className="inline-flex min-h-[var(--target-min)] items-center"
                  {...externalLinkProps(external)}
                >
                  {label}
                  {external ? externalLinkSuffix(locale, true) : ""}
                </a>
              ) : (
                <span>{label}</span>
              )}
              {hours ? <span className="text-ink-600"> · {hours}</span> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
