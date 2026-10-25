/**
 * Restricted complaint categories. A complaint in a restricted category (for
 * example harassment or safety) is visible only to the staff named on that
 * category's access list, whatever their role: being an admin or a unit lead
 * grants nothing here. This is the data-layer rule behind every staff read
 * and write of a case, in addition to the service roles in ./access.ts:
 *
 *   assertCaseAccess   one case, called by the engine on every staff operation
 *   caseVisibleTo      the same rule as a SQL condition, for lists and counts
 *
 * A refused case is reported as `not_found`, so a handler cannot tell a
 * restricted case from one that does not exist. The public tracking pages do
 * not use this: they authorise by the private link, not by a member of staff.
 *
 * Postgres row-level security is the planned second layer (see ./access.ts).
 */

import { and, eq, sql, type SQL } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { cases, type CaseRow } from "@/lib/db/schema/cases";
import { complaintCases, complaintCategories, complaintCategoryAccess } from "@/lib/db/schema/complaints";
import { assertStaff } from "./internal";
import { CaseError, type CaseActor } from "./types";

/**
 * True for every case the person may see: any case outside a restricted
 * category, and a restricted one only when they are named on its category.
 */
export function caseVisibleTo(userId: string): SQL {
  return sql`not exists (
    select 1 from ${complaintCases} as cc
    inner join ${complaintCategories} as cat on cat.id = cc.category_id
    where cc.case_id = ${cases.id} and cat.restricted
      and not exists (select 1 from ${complaintCategoryAccess} as acc where acc.category_id = cat.id and acc.user_id = ${userId})
  )`;
}

/** Whether `userId` may see the case. A case that does not exist is not visible. */
export async function canSeeCase(db: AuditExecutor, caseId: string, userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: cases.id })
    .from(cases)
    .where(and(eq(cases.id, caseId), caseVisibleTo(userId)))
    .limit(1);
  return rows.length > 0;
}

/**
 * Throws unless `actor` is staff who may work the case's service and, for a
 * restricted complaint, is named on its category. Use it wherever a loaded
 * case is about to be read or changed on behalf of a member of staff.
 */
export async function assertCaseAccess(db: AuditExecutor, row: Pick<CaseRow, "id" | "service">, actor: CaseActor): Promise<void> {
  assertStaff(actor, row.service);
  if (row.service !== "complaint") return;
  if (!(await canSeeCase(db, row.id, actor.userId))) throw new CaseError("not_found", "Case not found.");
}
