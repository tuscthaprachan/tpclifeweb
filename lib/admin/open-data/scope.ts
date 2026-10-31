import type { ActiveRole } from "@/lib/auth/roles";
import { OPEN_DATA_OWNERS, type OpenDataOwner } from "@/lib/db/schema/content/open-data";

export const isOpenDataOwner = (value: string): value is OpenDataOwner => (OPEN_DATA_OWNERS as readonly string[]).includes(value);

/**
 * The bodies whose open data this person may edit. Administrators may edit
 * both. An editor may edit the body of each organisation (`tusc`, `tusu`) they
 * hold the editor role for; editor grants on any other organisation give
 * nothing here.
 */
export function editableOwners(roles: readonly ActiveRole[], organisations: readonly { id: number; slug: string }[]): OpenDataOwner[] {
  if (roles.some((grant) => grant.role === "admin")) return [...OPEN_DATA_OWNERS];
  const slugs = new Map(organisations.map((o) => [o.id, o.slug]));
  const owners = new Set<OpenDataOwner>();
  for (const grant of roles) {
    const slug = grant.role === "editor" ? slugs.get(grant.organisationId) : undefined;
    if (slug && isOpenDataOwner(slug)) owners.add(slug);
  }
  return OPEN_DATA_OWNERS.filter((owner) => owners.has(owner));
}

export const canEditOwner = (owners: readonly OpenDataOwner[], owner: string): owner is OpenDataOwner =>
  isOpenDataOwner(owner) && owners.includes(owner);
