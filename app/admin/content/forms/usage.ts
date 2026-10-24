import { and, eq, ne, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { AuditExecutor } from "@/lib/db/audit";
import { contentPageForms, contentPages, events, faqForms, faqs, forms, newsPosts, policies } from "@/lib/db/schema";

export type FormUsageKind = "news" | "event" | "policy" | "guide" | "welfare" | "faq" | "form";

/** One place that still points at a form. */
export interface FormUsage {
  kind: FormUsageKind;
  id: string;
  title: { th: string; en: string };
  /** The admin segment of the row's type, for a link to it. */
  segment: string;
}

/** The rich text column holds a form callout for this form. Rich text is stored as jsonb, whose text form is `"formId": "<id>"`. */
const calls = (id: string, ...columns: AnyPgColumn[]): SQL | undefined =>
  or(...columns.map((column) => sql`${column}::text like ${`%"formId": "${id}"%`}`));

/**
 * Everything that still uses a form: rich text callouts in news, events,
 * policies, pages, FAQs and other forms' descriptions, plus pages, FAQs and
 * events that list it as related. Deleting such a form would leave a broken
 * callout or silently drop the link, so the delete is refused instead.
 */
export async function findFormUsages(db: AuditExecutor, formId: string): Promise<FormUsage[]> {
  const [news, eventRows, policyRows, pages, faqRows, formRows, pageLinks, faqLinks] = await Promise.all([
    db.select({ id: newsPosts.id, th: newsPosts.titleTh, en: newsPosts.titleEn }).from(newsPosts).where(calls(formId, newsPosts.bodyTh, newsPosts.bodyEn)),
    db
      .select({ id: events.id, th: events.titleTh, en: events.titleEn })
      .from(events)
      .where(or(eq(events.relatedFormId, formId), calls(formId, events.bodyTh, events.bodyEn))),
    db.select({ id: policies.id, th: policies.titleTh, en: policies.titleEn }).from(policies).where(calls(formId, policies.detailTh, policies.detailEn)),
    db
      .select({ id: contentPages.id, kind: contentPages.kind, th: contentPages.titleTh, en: contentPages.titleEn })
      .from(contentPages)
      .where(calls(formId, contentPages.bodyTh, contentPages.bodyEn)),
    db.select({ id: faqs.id, th: faqs.questionTh, en: faqs.questionEn }).from(faqs).where(calls(formId, faqs.answerTh, faqs.answerEn)),
    db
      .select({ id: forms.id, th: forms.titleTh, en: forms.titleEn })
      .from(forms)
      .where(and(ne(forms.id, formId), calls(formId, forms.descriptionTh, forms.descriptionEn))),
    db
      .select({ id: contentPages.id, kind: contentPages.kind, th: contentPages.titleTh, en: contentPages.titleEn })
      .from(contentPageForms)
      .innerJoin(contentPages, eq(contentPages.id, contentPageForms.pageId))
      .where(eq(contentPageForms.formId, formId)),
    db
      .select({ id: faqs.id, th: faqs.questionTh, en: faqs.questionEn })
      .from(faqForms)
      .innerJoin(faqs, eq(faqs.id, faqForms.faqId))
      .where(eq(faqForms.formId, formId)),
  ]);

  const seen = new Set<string>();
  const out: FormUsage[] = [];
  const add = (kind: FormUsageKind, segment: string, r: { id: string; th: string; en: string }) => {
    if (seen.has(`${kind}:${r.id}`)) return;
    seen.add(`${kind}:${r.id}`);
    out.push({ kind, id: r.id, title: { th: r.th, en: r.en }, segment });
  };
  for (const r of news) add("news", "news", r);
  for (const r of eventRows) add("event", "events", r);
  for (const r of policyRows) add("policy", "policies", r);
  for (const r of [...pages, ...pageLinks]) add(r.kind === "guide" ? "guide" : "welfare", r.kind === "guide" ? "guides" : "welfare", r);
  for (const r of [...faqRows, ...faqLinks]) add("faq", "faqs", r);
  for (const r of formRows) add("form", "forms", r);
  return out;
}
