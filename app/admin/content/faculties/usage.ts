import { count, eq } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { complaintCases, directoryOrganisations } from "@/lib/db/schema";

export interface FacultyUsage {
  organisations: number;
  redirects: number;
  total: number;
}

/**
 * What still points at a faculty. Its committees and the complaints that were
 * redirected to it must keep their link, so the delete action refuses while
 * either is above zero.
 */
export async function facultyUsage(db: AuditExecutor, facultyId: string): Promise<FacultyUsage> {
  const [[o], [r]] = await Promise.all([
    db.select({ n: count() }).from(directoryOrganisations).where(eq(directoryOrganisations.facultyId, facultyId)),
    db.select({ n: count() }).from(complaintCases).where(eq(complaintCases.redirectFacultyId, facultyId)),
  ]);
  const usage = { organisations: o?.n ?? 0, redirects: r?.n ?? 0 };
  return { ...usage, total: usage.organisations + usage.redirects };
}
