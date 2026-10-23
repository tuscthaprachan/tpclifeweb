import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { contentColumns, requiredRichDoc, type ExternalLinkJson } from "./common";
import { categoryEnum, contentPageKindEnum } from "./enums";
import { forms } from "./forms";

/**
 * welfarePage and guidePage in ONE table, split by `kind`. They have the same
 * fields and the same queries, and `relatedPages` may point at either, which a
 * single table turns into an ordinary foreign key instead of a polymorphic
 * reference. Slugs are unique per kind (routes are /welfare/[slug] and
 * /guide/[slug]).
 */
export const contentPages = pgTable(
  "content_pages",
  {
    ...contentColumns(),
    kind: contentPageKindEnum("kind").notNull(),
    slug: text("slug").notNull(),
    titleTh: text("title_th").notNull().default(""),
    titleEn: text("title_en").notNull().default(""),
    summaryTh: text("summary_th").notNull().default(""),
    summaryEn: text("summary_en").notNull().default(""),
    bodyTh: requiredRichDoc("body_th"),
    bodyEn: requiredRichDoc("body_en"),
    category: categoryEnum("category").notNull(),
    /** Off-site links, rendered whole. */
    relatedLinks: jsonb("related_links").$type<ExternalLinkJson[]>().notNull().default(sql`'[]'::jsonb`),
    lastReviewed: date("last_reviewed", { mode: "string" }),
    /** Lower shows first. Not named `order`, a reserved word in SQL. */
    sortOrder: integer("sort_order"),
  },
  (t) => [
    unique("content_pages_kind_slug").on(t.kind, t.slug),
    index("content_pages_listing_idx").on(t.kind, t.status, t.sortOrder, t.titleEn),
  ],
);

export const contentPageForms = pgTable(
  "content_page_forms",
  {
    pageId: uuid("page_id")
      .notNull()
      .references(() => contentPages.id, { onDelete: "cascade" }),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.pageId, t.formId] }), index("content_page_forms_form_idx").on(t.formId)],
);

export const contentPageRelated = pgTable(
  "content_page_related",
  {
    pageId: uuid("page_id")
      .notNull()
      .references(() => contentPages.id, { onDelete: "cascade" }),
    relatedPageId: uuid("related_page_id")
      .notNull()
      .references(() => contentPages.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.pageId, t.relatedPageId] }),
    check("content_page_related_not_self", sql`${t.pageId} <> ${t.relatedPageId}`),
    index("content_page_related_target_idx").on(t.relatedPageId),
  ],
);

/** FAQs. Handbook order is `sort_order`. `slug` is a natural key for seeding and anchors, not a route. */
export const faqs = pgTable(
  "faqs",
  {
    ...contentColumns(),
    slug: text("slug").unique(),
    questionTh: text("question_th").notNull().default(""),
    questionEn: text("question_en").notNull().default(""),
    answerTh: requiredRichDoc("answer_th"),
    answerEn: requiredRichDoc("answer_en"),
    category: categoryEnum("category").notNull(),
    sortOrder: integer("sort_order"),
  },
  (t) => [index("faqs_listing_idx").on(t.status, t.sortOrder)],
);

export const faqForms = pgTable(
  "faq_forms",
  {
    faqId: uuid("faq_id")
      .notNull()
      .references(() => faqs.id, { onDelete: "cascade" }),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.faqId, t.formId] }), index("faq_forms_form_idx").on(t.formId)],
);

export type ContentPageRow = typeof contentPages.$inferSelect;
export type FaqRow = typeof faqs.$inferSelect;
