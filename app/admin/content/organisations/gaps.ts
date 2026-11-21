import type { OrganisationContactJson } from "@/lib/db/schema/content/directory";

export type OrganisationGap = "contacts" | "location" | "description";

interface OrganisationGapInput {
  contacts: readonly Pick<OrganisationContactJson, "channel" | "value">[];
  locationTh?: string | null;
  locationEn?: string | null;
  descriptionTh?: string | null;
  descriptionEn?: string | null;
}

const blank = (value: string | null | undefined) => !value || value.trim() === "";

/** What a directory entry still lacks: a contact beyond Instagram, a location, a description. Advisory only. */
export function organisationGaps(org: OrganisationGapInput): OrganisationGap[] {
  const gaps: OrganisationGap[] = [];
  if (!org.contacts.some((contact) => contact.channel !== "instagram" && !blank(contact.value))) gaps.push("contacts");
  if (blank(org.locationTh) && blank(org.locationEn)) gaps.push("location");
  if (blank(org.descriptionTh) && blank(org.descriptionEn)) gaps.push("description");
  return gaps;
}
