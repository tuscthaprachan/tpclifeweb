import type { ActiveRole } from "@/lib/auth/roles";
import { OPEN_DATA_OWNERS, type OpenDataOwner } from "@/lib/db/schema/content/open-data";

export const isOpenDataOwner = (value: string): value is OpenDataOwner => (OPEN_DATA_OWNERS as readonly string[]).includes(value);

/** The bodies whose open data this person may edit: both, for an administrator or an editor; none for anyone else. */
export function editableOwners(roles: readonly ActiveRole[]): OpenDataOwner[] {
  return roles.some((grant) => grant.role === "admin" || grant.role === "editor") ? [...OPEN_DATA_OWNERS] : [];
}

export const canEditOwner = (owners: readonly OpenDataOwner[], owner: string): owner is OpenDataOwner =>
  isOpenDataOwner(owner) && owners.includes(owner);
