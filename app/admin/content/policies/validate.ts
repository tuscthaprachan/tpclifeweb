import { inArray } from "drizzle-orm";
import { z } from "zod";
import { fieldKit, formDataToObject, parseForm } from "@/lib/admin/content/fields";
import { resolveIntent, type FieldErrors, type ResolvedIntent } from "@/lib/admin/content/form-state";
import { isSlugTaken } from "@/lib/admin/content/slug";
import type { AuditExecutor } from "@/lib/db/audit";
import { policies } from "@/lib/db/schema";
import type { ExternalLinkJson } from "@/lib/db/schema/content/common";
import { OWNERS, POLICY_STATUSES, type ContentStatus } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

/** True when every text in `value` is empty, ignoring the keys in `ignore` (prefilled defaults such as a status). */
function isBlankRow(value: unknown, ignore: readonly string[]): boolean {
  if (typeof value === "string") return value.trim() === "";
  if (value === null || value === undefined) return true;
  if (typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).every(([key, v]) => ignore.includes(key) || isBlankRow(v, ignore));
}

/** Rows stay in place (as null when blank) so error paths keep the row numbers on the page. */
const rowsOf = (ignore: readonly string[]) => (v: unknown) => (Array.isArray(v) ? v.map((row) => (isBlankRow(row, ignore) ? null : row)) : []);

/**
 * Everything a policy form (with its update history and evidence links) must
 * satisfy, apart from writing it. Split out of the Server Action so tests can
 * run it against a database without a signed-in session.
 */
export async function validatePolicyForm(
  db: AuditExecutor,
  input: { locale: Locale; id: string | null; formData: FormData; existingStatus?: ContentStatus },
) {
  const { locale, id, formData } = input;
  const L = (key: AdminKey) => a(key, locale);
  const resolved: ResolvedIntent = resolveIntent(formData, input.existingStatus);
  const { publishing } = resolved;

  const k = fieldKit(locale, publishing);
  const updateRow = z.object({
    date: k.date(L("policiesFieldUpdateDate"), { required: true }),
    note: k.bilingual(L("policiesFieldUpdateNote"), { required: true, max: 2000 }),
    status: k.enumOf(L("policiesFieldUpdateStatus"), POLICY_STATUSES),
    author: k.bilingual(L("policiesFieldUpdateAuthor"), { max: 200 }),
    evidenceUrl: k.url(L("policiesFieldUpdateEvidence")),
  });
  const evidenceRow = z.object({
    label: k.bilingual(L("policiesFieldLinkLabel"), { required: true, max: 200 }),
    url: k.href(L("policiesFieldLinkUrl"), { required: true }),
    description: k.bilingual(L("policiesFieldLinkDescription"), { max: 300 }),
    requiresSignIn: k.checkbox(),
  });

  const schema = z.object({
    slug: k.slug(L("fieldSlug")),
    title: k.bilingual(L("fieldTitle"), { required: true, max: 200 }),
    summary: k.bilingual(L("fieldSummary"), { required: true, max: 500 }),
    detail: k.bilingualRichText(L("policiesFieldDetail")),
    owner: k.enumOf(L("fieldOwner"), OWNERS),
    area: k.bilingual(L("policiesFieldArea"), { required: true, max: 100 }),
    policyStatus: k.enumOf(L("policiesFieldStatus"), POLICY_STATUSES),
    progress: k.integer(L("policiesFieldProgress"), { min: 0, max: 100 }),
    startedAt: k.date(L("policiesFieldStarted")),
    targetDate: k.date(L("policiesFieldTarget")),
    completedAt: k.date(L("policiesFieldCompleted")),
    oversightOf: k.reference(L("policiesFieldOversight")),
    evidence: z.preprocess(rowsOf(["requiresSignIn"]), z.array(evidenceRow.nullable()).max(30)),
    updates: z.preprocess(rowsOf(["status"]), z.array(updateRow.nullable()).max(200)),
  });

  const parsed = parseForm(schema, formDataToObject(formData));
  const errors: FieldErrors = parsed.ok ? {} : { ...parsed.errors };

  if (parsed.ok) {
    const data = parsed.data;
    if (data.startedAt && data.targetDate && data.targetDate < data.startedAt) errors.targetDate = L("policiesErrTargetBeforeStart");
    if (data.startedAt && data.completedAt && data.completedAt < data.startedAt) errors.completedAt = L("policiesErrCompletedBeforeStart");

    const taken = await isSlugTaken(db, {
      table: policies,
      slugColumn: policies.slug,
      idColumn: policies.id,
      slug: data.slug,
      excludeId: id ?? undefined,
    });
    if (taken) errors.slug = L("errSlugTaken");

    if (data.oversightOf) {
      if (data.oversightOf === id) errors.oversightOf = L("policiesErrOversightSelf");
      else if ((await db.select({ id: policies.id }).from(policies).where(inArray(policies.id, [data.oversightOf]))).length === 0) {
        errors.oversightOf = a("errSelectField", locale, { field: L("policiesFieldOversight") });
      }
    }
  }

  if (!parsed.ok || Object.keys(errors).length > 0) return { ok: false as const, errors };
  const { evidence, updates, ...rest } = parsed.data;
  return {
    ok: true as const,
    data: { ...rest, evidence: evidence.filter((r) => r !== null), updates: updates.filter((r) => r !== null) },
    ...resolved,
  };
}

type ValidPolicy = Extract<Awaited<ReturnType<typeof validatePolicyForm>>, { ok: true }>["data"];

/** The columns a validated policy form writes, evidence links included. */
export function policyValues(data: ValidPolicy) {
  const evidenceLinks: ExternalLinkJson[] = data.evidence.map((link) => ({
    label: link.label,
    url: link.url!,
    ...(link.description.th || link.description.en ? { description: link.description } : {}),
    ...(link.requiresSignIn ? { requiresSignIn: true } : {}),
  }));
  return {
    slug: data.slug,
    titleTh: data.title.th,
    titleEn: data.title.en,
    summaryTh: data.summary.th,
    summaryEn: data.summary.en,
    detailTh: data.detail.th,
    detailEn: data.detail.en,
    owner: data.owner,
    policyAreaTh: data.area.th,
    policyAreaEn: data.area.en,
    policyStatus: data.policyStatus,
    progressPercent: data.progress,
    startedAt: data.startedAt,
    targetDate: data.targetDate,
    completedAt: data.completedAt,
    oversightOfId: data.oversightOf,
    evidenceLinks,
  };
}

/** The update history rows, in form order, for a policy. */
export function policyUpdateRows(policyId: string, data: ValidPolicy) {
  return data.updates.map((u, position) => ({
    policyId,
    position,
    date: u.date!,
    noteTh: u.note.th,
    noteEn: u.note.en,
    policyStatus: u.status!,
    authorTh: u.author.th || null,
    authorEn: u.author.en || null,
    evidenceUrl: u.evidenceUrl,
  }));
}
