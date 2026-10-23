import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import type { AuditExecutor } from "@/lib/db/audit";
import { policies, policyUpdates, type PolicyRow } from "@/lib/db/schema";
import { CACHE_TAGS, REVALIDATE, cachedRead } from "./cache";
import { ci, groupBy, iso, ls, lsOpt, opt, optList, richPairOpt, withKeys } from "./map";
import { safeFetch } from "./safe-fetch";
import type { Policy } from "./types";

/** The fields a TUSC item shows about the TUSU policy it scrutinises, without that policy's own history. */
function toOversight(row: PolicyRow): Policy {
  return {
    _id: row.id,
    _type: "policy",
    _createdAt: iso(row.createdAt),
    _updatedAt: iso(row.updatedAt),
    title: ls(row.titleTh, row.titleEn),
    slug: { current: row.slug },
    summary: ls(row.summaryTh, row.summaryEn),
    owner: row.owner,
    policyArea: ls(row.policyAreaTh, row.policyAreaEn),
    status: row.policyStatus,
    progressPercent: opt(row.progressPercent),
    startedAt: opt(row.startedAt),
    targetDate: opt(row.targetDate),
    completedAt: opt(row.completedAt),
  };
}

async function toPolicies(db: AuditExecutor, rows: PolicyRow[]): Promise<Policy[]> {
  if (rows.length === 0) return [];
  const updates = await db
    .select()
    .from(policyUpdates)
    .where(
      inArray(
        policyUpdates.policyId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(policyUpdates.position));
  const updatesByPolicy = groupBy(updates, (u) => u.policyId);

  const targetIds = [...new Set(rows.flatMap((r) => (r.oversightOfId ? [r.oversightOfId] : [])))];
  const targets =
    targetIds.length > 0
      ? await db
          .select()
          .from(policies)
          .where(and(eq(policies.status, "published"), inArray(policies.id, targetIds)))
      : [];
  const targetById = new Map(targets.map((t) => [t.id, toOversight(t)]));

  return rows.map((row) => ({
    ...toOversight(row),
    detail: richPairOpt(row.detailTh, row.detailEn),
    oversightOf: row.oversightOfId ? targetById.get(row.oversightOfId) : undefined,
    updates: optList(
      (updatesByPolicy.get(row.id) ?? []).map((u) => ({
        _key: u.id,
        date: u.date,
        note: ls(u.noteTh, u.noteEn),
        status: u.policyStatus,
        author: lsOpt(u.authorTh, u.authorEn),
        evidenceUrl: opt(u.evidenceUrl),
      })),
    ),
    evidenceLinks: row.evidenceLinks.length > 0 ? withKeys(row.evidenceLinks) : undefined,
  }));
}

/** Grouped by owner in the order the owner values sort as text (joint, tusc, tusu, university), then A to Z by title. */
export async function readPolicies(db: AuditExecutor): Promise<Policy[]> {
  const rows = await db
    .select()
    .from(policies)
    .where(eq(policies.status, "published"))
    .orderBy(sql`${policies.owner}::text`, ci(policies.titleEn), policies.slug);
  return toPolicies(db, rows);
}

export async function readPolicyBySlug(db: AuditExecutor, slug: string): Promise<Policy | null> {
  const [row] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.status, "published"), eq(policies.slug, slug)))
    .limit(1);
  return row ? ((await toPolicies(db, [row]))[0] ?? null) : null;
}

const cachedPolicies = cachedRead(["policies"], [CACHE_TAGS.policy], REVALIDATE.content, () => readPolicies(getDb()));
const cachedPolicyBySlug = cachedRead(["policy-by-slug"], [CACHE_TAGS.policy], REVALIDATE.content, (slug: string) =>
  readPolicyBySlug(getDb(), slug),
);

export async function getPolicies(): Promise<Policy[]> {
  return safeFetch<Policy[]>("getPolicies", () => cachedPolicies(), []);
}

export async function getPolicyBySlug(slug: string): Promise<Policy | null> {
  return safeFetch<Policy | null>("getPolicyBySlug", () => cachedPolicyBySlug(slug), null);
}

