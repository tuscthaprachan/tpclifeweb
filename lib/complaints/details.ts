/**
 * Reading a complaint for staff. The case page shows facts that hold no
 * personal data freely (`getComplaintFacts`: category, targets, flags,
 * counts). What the person wrote and the files they attached are behind two
 * logged reads, like contact details: `readComplaintText` and `readEvidence`
 * each decrypt only when asked, record an internal event and an audit entry
 * in the same transaction, and check access to the case first.
 */

import { asc, eq, sql } from "drizzle-orm";
import { appendEvent, auditContextOf, lockCase } from "@/lib/cases/internal";
import { assertCaseAccess } from "@/lib/cases/restrictions";
import { CaseError, type StaffActor } from "@/lib/cases/types";
import { decryptOptionalPii, type PiiEnv } from "@/lib/crypto/pii";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { caseAttachments, cases } from "@/lib/db/schema/cases";
import { complaintCases, complaintCategories, complaintEvidence, type ComplaintCaseRow, type ComplaintCategoryRow } from "@/lib/db/schema/complaints";
import type { Storage } from "@/lib/storage";
import { complaintTextAad, evidenceNameAad } from "./aad";

export interface ComplaintFacts {
  caseId: string;
  category: Pick<ComplaintCategoryRow, "id" | "key" | "nameTh" | "nameEn" | "acknowledgeDays" | "resolveDays" | "restricted" | "offerWellbeing">;
  identity: ComplaintCaseRow["identity"];
  acknowledgeDueAt: Date;
  resolveDueAt: Date;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
  escalatedAt: Date | null;
  escalatedReason: ComplaintCaseRow["escalatedReason"];
  wellbeingRoutedAt: Date | null;
  reopenCount: number;
  evidenceCount: number;
  hasText: boolean;
}

/** The complaint's facts, with nothing the person wrote. Needs access to the case. */
export async function getComplaintFacts(db: AuditExecutor, caseId: string, actor: StaffActor): Promise<ComplaintFacts> {
  const [row] = await db.select().from(cases).where(eq(cases.id, caseId));
  if (!row) throw new CaseError("not_found", "Case not found.");
  await assertCaseAccess(db, row, actor);
  const [found] = await db
    .select({ cc: complaintCases, category: complaintCategories })
    .from(complaintCases)
    .innerJoin(complaintCategories, eq(complaintCategories.id, complaintCases.categoryId))
    .where(eq(complaintCases.caseId, caseId));
  if (!found) throw new CaseError("not_found", "Case not found.");
  const [evidence] = await db.select({ n: sql<number>`count(*)::int` }).from(complaintEvidence).where(eq(complaintEvidence.caseId, caseId));
  const { cc, category } = found;
  return {
    caseId,
    category: {
      id: category.id,
      key: category.key,
      nameTh: category.nameTh,
      nameEn: category.nameEn,
      acknowledgeDays: category.acknowledgeDays,
      resolveDays: category.resolveDays,
      restricted: category.restricted,
      offerWellbeing: category.offerWellbeing,
    },
    identity: cc.identity,
    acknowledgeDueAt: cc.acknowledgeDueAt,
    resolveDueAt: cc.resolveDueAt,
    acknowledgedAt: cc.acknowledgedAt,
    resolvedAt: cc.resolvedAt,
    escalatedAt: cc.escalatedAt,
    escalatedReason: cc.escalatedReason,
    wellbeingRoutedAt: cc.wellbeingRoutedAt,
    reopenCount: cc.reopenCount,
    evidenceCount: evidence?.n ?? 0,
    hasText: Boolean(cc.descriptionEnc),
  };
}

export interface ComplaintText {
  description: string | null;
  when: string | null;
  where: string | null;
  remedy: string | null;
  reopenReason: string | null;
}

/**
 * Decrypts what the person wrote. Records a `details_viewed` event and a
 * `complaint.view_details` audit entry. Returns null, logging nothing, when
 * retention has already deleted it.
 */
export async function readComplaintText(db: AuditExecutor, caseId: string, actor: StaffActor, opts: { now?: Date; env?: PiiEnv } = {}): Promise<ComplaintText | null> {
  const now = opts.now ?? new Date();
  return withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const row = await lockCase(tx, caseId);
    await assertCaseAccess(tx, row, actor);
    const [cc] = await tx.select().from(complaintCases).where(eq(complaintCases.caseId, caseId));
    if (!cc) throw new CaseError("not_found", "Case not found.");
    if (row.piiDeletedAt || !cc.descriptionEnc) return null;
    const dec = (value: string | null, column: Parameters<typeof complaintTextAad>[1]) => decryptOptionalPii(value, complaintTextAad(caseId, column), opts.env);
    const text: ComplaintText = {
      description: dec(cc.descriptionEnc, "description"),
      when: dec(cc.whenEnc, "when"),
      where: dec(cc.whereEnc, "where"),
      remedy: dec(cc.remedyEnc, "remedy"),
      reopenReason: dec(cc.reopenReasonEnc, "reopen_reason"),
    };
    await appendEvent(tx, caseId, actor, now, { type: "details_viewed" });
    await audit({ action: "complaint.view_details", entityType: "case", entityId: caseId, after: { reference: row.reference } });
    return text;
  });
}

export interface EvidenceItem {
  id: string;
  name: string | null;
  contentType: string;
  size: number;
  /** A short-lived signed link, or null when file storage cannot be reached. */
  url: string | null;
}

/**
 * The attached files with decrypted names and 10 minute signed links.
 * Records an `evidence_viewed` event and a `complaint.view_evidence` audit
 * entry. Returns an empty list, logging nothing, when there are none.
 */
export async function readEvidence(
  db: AuditExecutor,
  caseId: string,
  actor: StaffActor,
  storage: () => Storage,
  opts: { now?: Date; env?: PiiEnv } = {},
): Promise<EvidenceItem[]> {
  const now = opts.now ?? new Date();
  const items = await withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const row = await lockCase(tx, caseId);
    await assertCaseAccess(tx, row, actor);
    const rows = await tx
      .select({ evidence: complaintEvidence, attachment: caseAttachments })
      .from(complaintEvidence)
      .innerJoin(caseAttachments, eq(caseAttachments.id, complaintEvidence.attachmentId))
      .where(eq(complaintEvidence.caseId, caseId))
      .orderBy(asc(complaintEvidence.createdAt));
    if (rows.length === 0) return [];
    const list = rows.map(({ evidence, attachment }) => ({
      id: evidence.id,
      name: decryptOptionalPii(evidence.nameEnc, evidenceNameAad(evidence.id), opts.env),
      contentType: attachment.contentType,
      size: attachment.size,
      key: attachment.storageKey,
    }));
    await appendEvent(tx, caseId, actor, now, { type: "evidence_viewed", metadata: { count: list.length } });
    await audit({ action: "complaint.view_evidence", entityType: "case", entityId: caseId, after: { count: list.length, reference: row.reference } });
    return list;
  });
  if (items.length === 0) return [];
  let store: Storage | null = null;
  try {
    store = storage();
  } catch {
    store = null;
  }
  return Promise.all(
    items.map(async ({ key, ...item }) => ({
      ...item,
      url: store ? await store.signedReadUrl(key, { expiresInSeconds: 600 }).catch(() => null) : null,
    })),
  );
}
