/**
 * The inbox as a CSV, for officers and administrators. It holds no personal
 * data: no names or contacts of the people concerned and none of the free
 * text (the summary, descriptions, notes). Columns are reference, service,
 * type, category, status, who it is assigned to (staff), the dates and the
 * escalated flag. It is built from `listCases`, so cases outside the
 * person's services and restricted complaints they are not named on are never
 * in it, and a text cell that a spreadsheet would run as a formula is
 * neutralised. The caller audits the export (`case.export`).
 */

import type { AuditExecutor } from "@/lib/db/audit";
import { safeCell, toCsv } from "@/lib/admin/content/csv";
import { listCases, type CaseListFilters } from "./engine";
import { SERVICES, statusLabel } from "./services";
import type { StaffActor } from "./types";

export const CASE_EXPORT_HEADER = ["reference", "service", "type", "category", "status", "assigned_to", "received", "due", "closed", "escalated"] as const;

export async function buildCaseCsv(db: AuditExecutor, actor: StaffActor, filters: CaseListFilters = {}): Promise<{ csv: string; count: number; truncated: boolean }> {
  const { rows, total } = await listCases(db, actor, { ...filters, unpaged: true });
  const iso = (d: Date | null) => (d ? d.toISOString() : "");
  const cells = rows.map((r) => [
    r.reference,
    SERVICES[r.service].label.en,
    safeCell(SERVICES[r.service].kinds[r.kind]?.label.en ?? r.kind),
    safeCell(r.categoryName ?? ""),
    safeCell(statusLabel(r.service, r.kind, r.status).en),
    safeCell(r.assigneeName ?? ""),
    iso(r.createdAt),
    iso(r.dueAt),
    iso(r.closedAt),
    r.escalated ? "yes" : "no",
  ]);
  return { csv: toCsv(CASE_EXPORT_HEADER, cells), count: rows.length, truncated: total > rows.length };
}
