/**
 * The satisfaction survey. After a complaint is resolved the person can give a
 * score from 1 to 5 and an optional comment from their tracking page. One
 * survey per resolution (`round` counts reopenings), so a reopened and
 * re-resolved complaint can be rated again. The score holds no personal data
 * and is kept for performance reporting; the comment is encrypted and cleared
 * by retention. The caller must have resolved the tracking link first.
 */

import { and, eq } from "drizzle-orm";
import { appendEvent, lockCase } from "@/lib/cases/internal";
import { encryptOptionalPii, type PiiEnv } from "@/lib/crypto/pii";
import { recordAudit, type AuditContext, type AuditExecutor } from "@/lib/db/audit";
import { cases } from "@/lib/db/schema/cases";
import { complaintCases, complaintSurveys } from "@/lib/db/schema/complaints";
import { surveyCommentAad } from "./aad";
import { COMPLAINT_LIMITS } from "./constants";

export type SurveyOutcome = "saved" | "already" | "not_open" | "invalid";

export function parseScore(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

/** Whether the survey can be answered now: the complaint is resolved or closed and this round has no answer yet. */
export async function surveyState(db: AuditExecutor, caseId: string): Promise<"open" | "answered" | "unavailable"> {
  const [row] = await db
    .select({ status: cases.status, round: complaintCases.reopenCount })
    .from(complaintCases)
    .innerJoin(cases, eq(cases.id, complaintCases.caseId))
    .where(eq(complaintCases.caseId, caseId));
  if (!row || (row.status !== "resolved" && row.status !== "closed")) return "unavailable";
  const [done] = await db
    .select({ id: complaintSurveys.id })
    .from(complaintSurveys)
    .where(and(eq(complaintSurveys.caseId, caseId), eq(complaintSurveys.round, row.round)));
  return done ? "answered" : "open";
}

export async function submitSurvey(
  db: AuditExecutor,
  caseId: string,
  input: { score: number | null; comment?: string | null },
  context: Pick<AuditContext, "ip" | "userAgent" | "requestId"> = {},
  opts: { now?: Date; env?: PiiEnv } = {},
): Promise<SurveyOutcome> {
  const now = opts.now ?? new Date();
  const score = parseScore(input.score);
  const comment = input.comment?.trim() || null;
  if (score === null || (comment && [...comment].length > COMPLAINT_LIMITS.surveyComment)) return "invalid";
  return db.transaction(async (tx) => {
    const row = await lockCase(tx, caseId);
    if (row.status !== "resolved" && row.status !== "closed") return "not_open";
    const [cc] = await tx.select().from(complaintCases).where(eq(complaintCases.caseId, caseId));
    if (!cc) return "not_open";
    const id = crypto.randomUUID();
    const inserted = await tx
      .insert(complaintSurveys)
      .values({ id, caseId, categoryId: cc.categoryId, round: cc.reopenCount, score, commentEnc: encryptOptionalPii(comment, surveyCommentAad(id), opts.env), createdAt: now })
      .onConflictDoNothing()
      .returning({ id: complaintSurveys.id });
    if (inserted.length === 0) return "already";
    await appendEvent(tx, caseId, { kind: "public" }, now, { type: "survey_received", metadata: { score, round: cc.reopenCount, comment: Boolean(comment) } });
    await recordAudit(tx, { ...context, actorUserId: null, action: "complaint.survey", entityType: "case", entityId: caseId, after: { score, round: cc.reopenCount, comment: Boolean(comment) } });
    return "saved";
  });
}
