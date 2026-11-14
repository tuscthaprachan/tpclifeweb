import { eq } from "drizzle-orm";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";
import {
  contentPageForms,
  contentPageRelated,
  faqForms,
  newsPostImages,
  newsPostTags,
  policyUpdates,
} from "@/lib/db/schema";
import { getContentType, type ContentTypeDef } from "./types";

/**
 * What the lifecycle tools (restore, duplicate, scheduling, preview) need to
 * know about a content type beyond `CONTENT_TYPES`: which child tables a
 * snapshot's keys map to and which columns hold the title and slug.
 */
export interface LifecycleChild {
  /** The key the save action stores the rows under in the revision snapshot. */
  key: string;
  table: AnyPgTable;
  /** Column on the child that points at the parent row, and its property name. */
  fk: AnyPgColumn;
  fkKey: string;
}

export interface Lifecycle {
  /** Property names of the Thai and English title columns. */
  titleKeys: [string, string];
  /** Property name of the slug column when the type has one. */
  slugKey?: string;
  children: LifecycleChild[];
}

const LIFECYCLE: Record<string, Lifecycle> = {
  alerts: { titleKeys: ["titleTh", "titleEn"], children: [] },
  news: {
    titleKeys: ["titleTh", "titleEn"],
    slugKey: "slug",
    children: [
      { key: "gallery", table: newsPostImages, fk: newsPostImages.newsPostId, fkKey: "newsPostId" },
      { key: "tags", table: newsPostTags, fk: newsPostTags.newsPostId, fkKey: "newsPostId" },
    ],
  },
  events: { titleKeys: ["titleTh", "titleEn"], slugKey: "slug", children: [] },
  policies: {
    titleKeys: ["titleTh", "titleEn"],
    slugKey: "slug",
    children: [{ key: "updates", table: policyUpdates, fk: policyUpdates.policyId, fkKey: "policyId" }],
  },
  guides: {
    titleKeys: ["titleTh", "titleEn"],
    slugKey: "slug",
    children: [
      { key: "forms", table: contentPageForms, fk: contentPageForms.pageId, fkKey: "pageId" },
      { key: "related", table: contentPageRelated, fk: contentPageRelated.pageId, fkKey: "pageId" },
    ],
  },
  welfare: {
    titleKeys: ["titleTh", "titleEn"],
    slugKey: "slug",
    children: [
      { key: "forms", table: contentPageForms, fk: contentPageForms.pageId, fkKey: "pageId" },
      { key: "related", table: contentPageRelated, fk: contentPageRelated.pageId, fkKey: "pageId" },
    ],
  },
  faqs: {
    titleKeys: ["questionTh", "questionEn"],
    slugKey: "slug",
    children: [{ key: "forms", table: faqForms, fk: faqForms.faqId, fkKey: "faqId" }],
  },
  forms: { titleKeys: ["titleTh", "titleEn"], slugKey: "slug", children: [] },
};

export function lifecycleFor(segment: string): Lifecycle | undefined {
  return LIFECYCLE[segment];
}

/** The type and its lifecycle, or undefined when the type does not support the tools. */
export function lifecycleType(segment: string): { def: ContentTypeDef; life: Lifecycle } | undefined {
  const def = getContentType(segment);
  const life = LIFECYCLE[segment];
  return def && life && def.kind === "collection" ? { def, life } : undefined;
}

export const childWhere = (child: LifecycleChild, id: string) => eq(child.fk, id);
