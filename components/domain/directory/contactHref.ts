import { pick, type Locale } from "@/lib/i18n/config";
import type { OrganisationContact } from "@/lib/sanity/types";

/**
 * Channel to href. Instagram and Facebook values are stored as bare handles
 * per the schema's own field description ("just the handle without the @ or
 * full URL"), so both become real profile URLs. LINE has no such convention
 * here (values seen so far are personal or unofficial IDs with no reliable
 * add-friend URL pattern), so it deliberately renders as plain text rather
 * than a fabricated link that might not resolve.
 */
export function contactHref(contact: OrganisationContact): string | null {
  switch (contact.channel) {
    case "instagram":
      return `https://www.instagram.com/${contact.value}`;
    case "facebook":
      return `https://www.facebook.com/${contact.value}`;
    case "website":
      return /^https?:\/\//i.test(contact.value) ? contact.value : `https://${contact.value}`;
    case "email":
      return `mailto:${contact.value}`;
    case "phone":
      return `tel:${contact.value.replace(/[\s-]/g, "")}`;
    case "line":
      return null;
  }
}

export function contactLabel(contact: OrganisationContact, locale: Locale): string {
  if (contact.label) return pick(contact.label, locale);

  switch (contact.channel) {
    case "instagram":
      return `Instagram @${contact.value}`;
    case "facebook":
      return "Facebook";
    case "website":
      return contact.value;
    case "email":
      return contact.value;
    case "phone":
      return contact.value;
    case "line":
      return `LINE: ${contact.value}`;
  }
}
