import { eq } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { cases } from "@/lib/db/schema/cases";
import { complaintCases, complaintCategories } from "@/lib/db/schema/complaints";
import type { LocaleString } from "@/lib/i18n/config";

export interface ConfirmationFacts {
  category: { name: LocaleString; offerWellbeing: boolean; restricted: boolean };
  acknowledgeDueAt: Date;
  resolveDueAt: Date;
}

/**
 * What the confirmation page promises: the target dates exactly as stored, and
 * whether to show the wellbeing details. Read by reference, which the page got
 * from the person's own journey; nothing a person wrote is read.
 */
export async function getConfirmationFacts(db: AuditExecutor, reference: string): Promise<ConfirmationFacts | null> {
  const [row] = await db
    .select({ cc: complaintCases, category: complaintCategories })
    .from(cases)
    .innerJoin(complaintCases, eq(complaintCases.caseId, cases.id))
    .innerJoin(complaintCategories, eq(complaintCategories.id, complaintCases.categoryId))
    .where(eq(cases.reference, reference));
  if (!row) return null;
  return {
    category: { name: { th: row.category.nameTh, en: row.category.nameEn }, offerWellbeing: row.category.offerWellbeing, restricted: row.category.restricted },
    acknowledgeDueAt: row.cc.acknowledgeDueAt,
    resolveDueAt: row.cc.resolveDueAt,
  };
}
