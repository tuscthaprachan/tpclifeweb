import "server-only";

import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import type { AuditExecutor } from "@/lib/db/audit";
import { newsPostImages, newsPosts, newsPostTags, type NewsPostRow } from "@/lib/db/schema";
import { CACHE_TAGS, REVALIDATE, cachedRead } from "./cache";
import { loadImages } from "./images";
import { groupBy, iso, ls, opt, optList, richPair } from "./map";
import { safeFetch } from "./safe-fetch";
import type { ContentImage, NewsPost } from "./types";

export interface PagedNews {
  items: NewsPost[];
  total: number;
}

async function toNewsPosts(db: AuditExecutor, rows: NewsPostRow[]): Promise<NewsPost[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [gallery, tags] = await Promise.all([
    db.select().from(newsPostImages).where(inArray(newsPostImages.newsPostId, ids)).orderBy(asc(newsPostImages.position)),
    db.select().from(newsPostTags).where(inArray(newsPostTags.newsPostId, ids)).orderBy(asc(newsPostTags.position)),
  ]);
  const imageById = await loadImages(db, [...rows.map((r) => r.coverImageId), ...gallery.map((g) => g.imageId)]);
  const galleryByPost = groupBy(gallery, (g) => g.newsPostId);
  const tagsByPost = groupBy(tags, (t) => t.newsPostId);

  return rows.map((row) => {
    const pictures = (galleryByPost.get(row.id) ?? [])
      .map((g) => imageById.get(g.imageId))
      .filter((image): image is ContentImage => image !== undefined);
    return {
      _id: row.id,
      _type: "newsPost",
      _createdAt: iso(row.createdAt),
      _updatedAt: iso(row.updatedAt),
      title: ls(row.titleTh, row.titleEn),
      slug: { current: row.slug },
      summary: ls(row.summaryTh, row.summaryEn),
      body: richPair(row.bodyTh, row.bodyEn),
      publishedAt: iso(row.publishedAt ?? row.createdAt),
      owner: row.owner,
      category: opt(row.category),
      cover: row.coverImageId ? imageById.get(row.coverImageId) : undefined,
      gallery: optList(pictures),
      tags: optList((tagsByPost.get(row.id) ?? []).map((t) => ls(t.labelTh, t.labelEn))),
    };
  });
}

/** Newest first. `page` is 1-based. */
export async function readNewsPage(db: AuditExecutor, page: number, pageSize: number): Promise<PagedNews> {
  const published = eq(newsPosts.status, "published");
  const rows = await db
    .select()
    .from(newsPosts)
    .where(published)
    .orderBy(sql`${newsPosts.publishedAt} desc nulls last`, desc(newsPosts.createdAt), newsPosts.id)
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(newsPosts).where(published);
  return { items: await toNewsPosts(db, rows), total };
}

export async function readNewsPostBySlug(db: AuditExecutor, slug: string): Promise<NewsPost | null> {
  const [row] = await db
    .select()
    .from(newsPosts)
    .where(and(eq(newsPosts.status, "published"), eq(newsPosts.slug, slug)))
    .limit(1);
  return row ? ((await toNewsPosts(db, [row]))[0] ?? null) : null;
}

const cachedNewsPage = cachedRead(["news-page"], [CACHE_TAGS.news, CACHE_TAGS.image], REVALIDATE.content, (page: number, pageSize: number) =>
  readNewsPage(getDb(), page, pageSize),
);
const cachedNewsPostBySlug = cachedRead(["news-by-slug"], [CACHE_TAGS.news, CACHE_TAGS.image], REVALIDATE.content, (slug: string) =>
  readNewsPostBySlug(getDb(), slug),
);

/** `page` is 1-based. */
export async function getNewsPage(page = 1, pageSize = 10): Promise<PagedNews> {
  return safeFetch<PagedNews>(
    "getNewsPage",
    () => cachedNewsPage(page, pageSize),
    // An unreadable news list is an empty news list, not a broken page. The
    // listing renders its "nothing here yet" state and keeps the navigation,
    // search and help contacts that the reader may actually have come for.
    { items: [], total: 0 },
  );
}

export async function getNewsPostBySlug(slug: string): Promise<NewsPost | null> {
  return safeFetch<NewsPost | null>("getNewsPostBySlug", () => cachedNewsPostBySlug(slug), null);
}
