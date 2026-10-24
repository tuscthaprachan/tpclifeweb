import { eq } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { contentPageForms, contentPageRelated } from "@/lib/db/schema";
import { toExternalLinks } from "./rows";
import type { ContentPageKind, validatePageForm } from "./validate";

type PageData = Extract<Awaited<ReturnType<typeof validatePageForm>>, { ok: true }>["data"];

/** The `content_pages` columns a validated page form sets. */
export function pageValues(kind: ContentPageKind, data: PageData): Record<string, unknown> {
  return {
    kind,
    slug: data.slug,
    titleTh: data.title.th,
    titleEn: data.title.en,
    summaryTh: data.summary.th,
    summaryEn: data.summary.en,
    bodyTh: data.body.th,
    bodyEn: data.body.en,
    category: data.category,
    relatedLinks: toExternalLinks(data.links),
    lastReviewed: data.lastReviewed,
    sortOrder: data.sortOrder,
  };
}

/** `saveContent`'s `children` callback: replaces the page's related forms and related pages. */
export function pageChildren(data: PageData) {
  return async (tx: AuditExecutor, pageId: string) => {
    await tx.delete(contentPageForms).where(eq(contentPageForms.pageId, pageId));
    await tx.delete(contentPageRelated).where(eq(contentPageRelated.pageId, pageId));
    const formRows = data.forms.map((formId, position) => ({ pageId, formId, position }));
    const relatedRows = data.related.map((relatedPageId, position) => ({ pageId, relatedPageId, position }));
    if (formRows.length > 0) await tx.insert(contentPageForms).values(formRows);
    if (relatedRows.length > 0) await tx.insert(contentPageRelated).values(relatedRows);
    return { forms: formRows, related: relatedRows };
  };
}
