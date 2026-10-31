import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import type { ContentActor } from "@/lib/admin/content/access";
import { revalidateFor } from "@/lib/content/revalidate";
import { getDb } from "@/lib/db";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { openDataBudgetLines, openDataDocuments, openDataFunds, type OpenDataOwner } from "@/lib/db/schema/content/open-data";
import { parseBudgetCsv, parseFundsCsv, type CsvFailure } from "./csv-import";

/**
 * Imports the budget line and fund CSVs. The file is checked completely
 * first; the rows are then written in one transaction with one audit entry, so
 * a failure leaves nothing behind. A row that matches an existing one by its
 * natural key (budget year, view, organisation, project and category; fund
 * number) updates it; the rest are added.
 */

const CHUNK = 100;

export type CsvImportOutcome =
  | { ok: true; created: number; updated: number; unchanged: number; total: number }
  | CsvFailure
  | { ok: false; reason: "source" };

interface ImportInput {
  db?: AuditExecutor;
  actor: ContentActor;
  owner: OpenDataOwner;
  text: string;
  now?: Date;
}

async function sourceDocumentId(db: AuditExecutor, owner: OpenDataOwner, number: string): Promise<string | null | undefined> {
  const wanted = number.trim();
  if (!wanted) return null;
  const [row] = await db
    .select({ id: openDataDocuments.id })
    .from(openDataDocuments)
    .where(and(eq(openDataDocuments.owner, owner), eq(openDataDocuments.number, wanted)));
  return row?.id;
}

function chunks<T>(rows: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(rows.slice(i, i + CHUNK));
  return out;
}

export async function importBudgetCsv(input: ImportInput & { sourceDocumentNumber?: string }): Promise<CsvImportOutcome> {
  const db = input.db ?? getDb();
  const now = input.now ?? new Date();
  const { actor, owner } = input;
  const parsed = parseBudgetCsv(input.text);
  if (!parsed.ok) return parsed;
  const sourceId = await sourceDocumentId(db, owner, input.sourceDocumentNumber ?? "");
  if (sourceId === undefined) return { ok: false, reason: "source" };

  const keyOf = (r: { fiscalYear: number; view: string; organisation: string; project: string; category: string }) =>
    JSON.stringify([r.fiscalYear, r.view, r.organisation, r.project, r.category]);

  const counts = await withAudit(db, actor.context, async (tx, audit) => {
    const years = [...new Set(parsed.rows.map((r) => r.fiscalYear))];
    const existing = await tx
      .select()
      .from(openDataBudgetLines)
      .where(and(eq(openDataBudgetLines.owner, owner), inArray(openDataBudgetLines.fiscalYear, years)));
    const byKey = new Map(existing.map((r) => [keyOf(r), r]));

    const toInsert: (typeof openDataBudgetLines.$inferInsert)[] = [];
    let updated = 0;
    let unchanged = 0;
    for (const row of parsed.rows) {
      const values = {
        organisationType: row.organisationType,
        amount: row.amount,
        sourceDocumentId: sourceId ?? null,
        sourcePage: row.sourcePage,
        position: row.line - 1,
      };
      const found = byKey.get(keyOf(row));
      if (!found) {
        toInsert.push({
          ...values,
          owner,
          fiscalYear: row.fiscalYear,
          view: row.view,
          organisation: row.organisation,
          project: row.project,
          category: row.category,
          status: "published",
          publishedAt: now,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        });
        continue;
      }
      const same =
        found.organisationType === values.organisationType &&
        Number(found.amount) === Number(values.amount) &&
        (found.sourceDocumentId ?? null) === values.sourceDocumentId &&
        found.sourcePage === values.sourcePage &&
        found.position === values.position &&
        found.status === "published";
      if (same) {
        unchanged++;
        continue;
      }
      await tx
        .update(openDataBudgetLines)
        .set({ ...values, status: "published", publishedAt: found.publishedAt ?? now, updatedBy: actor.userId, updatedAt: now })
        .where(eq(openDataBudgetLines.id, found.id));
      updated++;
    }
    for (const batch of chunks(toInsert)) await tx.insert(openDataBudgetLines).values(batch);

    const result = { created: toInsert.length, updated, unchanged, total: parsed.rows.length };
    await audit({
      action: "open_data_budget_lines.import",
      entityType: "open_data_budget_lines",
      entityId: crypto.randomUUID(),
      after: { owner, ...result, fiscalYears: years, sourceDocumentId: sourceId ?? null },
    });
    return result;
  });
  revalidateFor("openDataBudget");
  return { ok: true, ...counts };
}

export async function importFundsCsv(input: ImportInput): Promise<CsvImportOutcome> {
  const db = input.db ?? getDb();
  const now = input.now ?? new Date();
  const { actor, owner } = input;
  const parsed = parseFundsCsv(input.text);
  if (!parsed.ok) return parsed;

  const counts = await withAudit(db, actor.context, async (tx, audit) => {
    const existing = await tx.select().from(openDataFunds).where(eq(openDataFunds.owner, owner));
    const byNumber = new Map(existing.map((r) => [r.number, r]));

    const toInsert: (typeof openDataFunds.$inferInsert)[] = [];
    let updated = 0;
    let unchanged = 0;
    for (const row of parsed.rows) {
      const values = { type: row.type, code: row.code, name: row.name, annotation: row.annotation };
      const found = byNumber.get(row.number);
      if (!found) {
        toInsert.push({ ...values, owner, number: row.number, status: "published", publishedAt: now, createdBy: actor.userId, updatedBy: actor.userId });
        continue;
      }
      const same =
        found.type === values.type && found.code === values.code && found.name === values.name && found.annotation === values.annotation && found.status === "published";
      if (same) {
        unchanged++;
        continue;
      }
      await tx
        .update(openDataFunds)
        .set({ ...values, status: "published", publishedAt: found.publishedAt ?? now, updatedBy: actor.userId, updatedAt: now })
        .where(eq(openDataFunds.id, found.id));
      updated++;
    }
    for (const batch of chunks(toInsert)) await tx.insert(openDataFunds).values(batch);

    const result = { created: toInsert.length, updated, unchanged, total: parsed.rows.length };
    await audit({ action: "open_data_funds.import", entityType: "open_data_funds", entityId: crypto.randomUUID(), after: { owner, ...result } });
    return result;
  });
  revalidateFor("openDataFund");
  return { ok: true, ...counts };
}
