import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { ContentSection } from "@/lib/db/schema/content/enums";
import { getDb } from "@/lib/db";
import type { AuditExecutor } from "@/lib/db/audit";
import {
  contentPageForms,
  contentPageRelated,
  contentPages,
  faqForms,
  faqs,
  type ContentPageRow,
} from "@/lib/db/schema";
import { CACHE_TAGS, REVALIDATE, cachedRead } from "./cache";
import { readFormsByIds } from "./forms";
import { ci, groupBy, iso, ls, opt, richPair, withKeys } from "./map";
import { liveWindow } from "./window";
import { safeFetch } from "./safe-fetch";
import type { ContentPage, Faq, FormRecord } from "./types";

/** A page without its relations. Related pages are returned in this shallow form. */
function toPage(row: ContentPageRow): ContentPage {
  return {
    _id: row.id,
    _type: "topicPage",
    section: row.section,
    _createdAt: iso(row.createdAt),
    _updatedAt: iso(row.updatedAt),
    title: ls(row.titleTh, row.titleEn),
    slug: { current: row.slug },
    summary: ls(row.summaryTh, row.summaryEn),
    body: richPair(row.bodyTh, row.bodyEn),
    category: row.category,
    relatedLinks: row.relatedLinks.length > 0 ? withKeys(row.relatedLinks) : undefined,
    lastReviewed: opt(row.lastReviewed),
    order: opt(row.sortOrder),
  };
}

async function toPages(db: AuditExecutor, rows: ContentPageRow[]): Promise<ContentPage[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [formLinks, relatedLinks] = await Promise.all([
    db.select().from(contentPageForms).where(inArray(contentPageForms.pageId, ids)).orderBy(asc(contentPageForms.position)),
    db.select().from(contentPageRelated).where(inArray(contentPageRelated.pageId, ids)).orderBy(asc(contentPageRelated.position)),
  ]);
  const formById = await readFormsByIds(db, formLinks.map((l) => l.formId));
  const relatedRows =
    relatedLinks.length > 0
      ? await db
          .select()
          .from(contentPages)
          .where(
            and(
              liveWindow(contentPages),
              inArray(contentPages.id, [...new Set(relatedLinks.map((l) => l.relatedPageId))]),
            ),
          )
      : [];
  const relatedById = new Map(relatedRows.map((r) => [r.id, toPage(r)]));
  const formsByPage = groupBy(formLinks, (l) => l.pageId);
  const relatedByPage = groupBy(relatedLinks, (l) => l.pageId);

  return rows.map((row) => {
    const forms = (formsByPage.get(row.id) ?? [])
      .map((l) => formById.get(l.formId))
      .filter((f): f is FormRecord => f !== undefined);
    const related = (relatedByPage.get(row.id) ?? [])
      .map((l) => relatedById.get(l.relatedPageId))
      .filter((p): p is ContentPage => p !== undefined);
    return {
      ...toPage(row),
      relatedForms: forms.length > 0 ? forms : undefined,
      relatedPages: related.length > 0 ? related : undefined,
    };
  });
}

/** `includeUnpublished` is for editor previews only. The slug is unique across sections. */
export async function readTopicPageBySlug(db: AuditExecutor, slug: string, includeUnpublished = false, now: Date = new Date()): Promise<ContentPage | null> {
  const [row] = await db
    .select()
    .from(contentPages)
    .where(and(includeUnpublished ? undefined : liveWindow(contentPages, now), eq(contentPages.slug, slug)))
    .limit(1);
  return row ? ((await toPages(db, [row]))[0] ?? null) : null;
}

/** Hand-ordered pages first (lowest `order`), pages with no order after them, each group A to Z. All sections when none is given. */
export async function readTopicPages(db: AuditExecutor, section?: ContentSection): Promise<ContentPage[]> {
  const rows = await db
    .select()
    .from(contentPages)
    .where(and(liveWindow(contentPages), section ? eq(contentPages.section, section) : undefined))
    .orderBy(sql`${contentPages.sortOrder} asc nulls last`, ci(contentPages.titleEn), contentPages.slug);
  return toPages(db, rows);
}

/** In handbook order (`order`), with the forms each answer points to. */
export async function readFaqs(db: AuditExecutor, now: Date = new Date()): Promise<Faq[]> {
  const rows = await db
    .select()
    .from(faqs)
    .where(liveWindow(faqs, now))
    .orderBy(sql`${faqs.sortOrder} asc nulls last`, faqs.createdAt, faqs.id);
  if (rows.length === 0) return [];
  const links = await db
    .select()
    .from(faqForms)
    .where(
      inArray(
        faqForms.faqId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(faqForms.position));
  const formById = await readFormsByIds(db, links.map((l) => l.formId));
  const linksByFaq = groupBy(links, (l) => l.faqId);
  return rows.map((row) => {
    const related = (linksByFaq.get(row.id) ?? [])
      .map((l) => formById.get(l.formId))
      .filter((f): f is FormRecord => f !== undefined);
    return {
      _id: row.id,
      _type: "faq",
      _createdAt: iso(row.createdAt),
      _updatedAt: iso(row.updatedAt),
      question: ls(row.questionTh, row.questionEn),
      answer: richPair(row.answerTh, row.answerEn),
      category: row.category,
      relatedForms: related.length > 0 ? related : undefined,
      order: opt(row.sortOrder),
    };
  });
}

const PAGE_TAGS = [CACHE_TAGS.content, CACHE_TAGS.form] as const;

const cachedPageBySlug = cachedRead(["topic-page-by-slug"], PAGE_TAGS, REVALIDATE.windowed, (slug: string) => readTopicPageBySlug(getDb(), slug));
const cachedPages = cachedRead(["topic-pages"], PAGE_TAGS, REVALIDATE.windowed, (section: ContentSection | undefined) => readTopicPages(getDb(), section));
const cachedFaqs = cachedRead(["faqs"], [CACHE_TAGS.faq, CACHE_TAGS.form], REVALIDATE.windowed, () => readFaqs(getDb()));

export async function getTopicPageBySlug(slug: string): Promise<ContentPage | null> {
  return safeFetch<ContentPage | null>("getTopicPageBySlug", () => cachedPageBySlug(slug), null);
}

export async function getTopicPages(section?: ContentSection): Promise<ContentPage[]> {
  return safeFetch<ContentPage[]>("getTopicPages", () => cachedPages(section), []);
}

export async function getFaqs(): Promise<Faq[]> {
  return safeFetch<Faq[]>("getFaqs", () => cachedFaqs(), []);
}

/** Uncached and unfiltered: the page as saved, draft or scheduled. Call only behind `isPreview()`. */
export async function getTopicPagePreview(slug: string): Promise<ContentPage | null> {
  return safeFetch<ContentPage | null>("getTopicPagePreview", () => readTopicPageBySlug(getDb(), slug, true), null);
}
