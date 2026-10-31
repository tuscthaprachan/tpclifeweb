import "server-only";

import { redirect } from "next/navigation";
import { requireEditor, type ContentActor } from "@/lib/admin/content/access";
import { auditContextFor, type AccessContext } from "@/lib/auth/session";
import type { OpenDataOwner } from "@/lib/db/schema/content/open-data";
import { editableOwners } from "./scope";

export interface OpenDataAccess {
  staff: AccessContext;
  owners: OpenDataOwner[];
}

/** Gate for every open data page and action: an administrator, or an editor of `tusc` or `tusu`. */
export async function requireOpenDataEditor(): Promise<OpenDataAccess> {
  const staff = await requireEditor();
  const owners = editableOwners(staff.roles, staff.organisations);
  if (owners.length === 0) redirect("/admin/no-access");
  return { staff, owners };
}

/** The actor for a write to `owner`'s data, attributed to that body's organisation when the person belongs to it. */
export async function openDataActor(staff: AccessContext, owner: OpenDataOwner): Promise<ContentActor> {
  const organisation = staff.organisations.find((o) => o.slug === owner);
  return { userId: staff.user.id, context: await auditContextFor(staff, organisation?.id) };
}
