import { and, eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLog, contentRevisions, newsPosts, newsPostTags, redirects } from "@/lib/db/schema";
import { createTestDb, makeUser } from "../db/harness";

const revalidateFor = vi.fn();
vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: (...args: unknown[]) => revalidateFor(...args) }));

const { saveContent } = await import("@/lib/admin/content/save");
const { duplicateContent } = await import("@/lib/admin/content/duplicate");
const { restoreRevision, RevisionNotRestorableError } = await import("@/lib/admin/content/restore");
const { listRevisions } = await import("@/lib/admin/content/history");
const { readNewsPage, readNewsPostBySlug } = await import("@/lib/content/news");
const { getContentType } = await import("@/lib/admin/content/types");

type Harness = Awaited<ReturnType<typeof createTestDb>>;
let db: Harness["db"];
let userId: string;
const actor = () => ({ userId, context: { actorUserId: userId } });
const news = getContentType("news")!;

const post = (slug: string, extra: Record<string, unknown> = {}) => ({ slug, titleTh: "ก", titleEn: "Title", summaryEn: "S", owner: "tusu", ...extra });
const create = (slug: string, extra: Record<string, unknown> = {}, status?: "draft" | "published") =>
  saveContent({ entityType: "newsPost", table: newsPosts, actor: actor(), db, values: post(slug, extra), status });

beforeAll(async () => {
  ({ db } = await createTestDb());
  userId = await makeUser(db);
});

beforeEach(async () => {
  revalidateFor.mockClear();
  await db.delete(newsPosts);
  await db.delete(contentRevisions);
  await db.delete(redirects);
});

describe("scheduled visibility in public reads", () => {
  const now = new Date("2026-06-10T12:00:00Z");
  const hour = 3_600_000;
  const at = (offset: number) => new Date(now.getTime() + offset * hour);

  it("hides a published post until publishAt and after unpublishAt, and shows it inside the window", async () => {
    await create("early", { publishAt: at(2) }, "published");
    await create("inside", { publishAt: at(-2), unpublishAt: at(2) }, "published");
    await create("late", { publishAt: at(-4), unpublishAt: at(-1) }, "published");
    await create("open", {}, "published");
    await create("draft", { publishAt: at(-2) });

    const slugs = (await readNewsPage(db, 1, 20, now)).items.map((p) => p.slug.current).sort();
    expect(slugs).toEqual(["inside", "open"]);
    expect(await readNewsPostBySlug(db, "early", false, now)).toBeNull();
    expect(await readNewsPostBySlug(db, "late", false, now)).toBeNull();
    expect(await readNewsPostBySlug(db, "inside", false, now)).not.toBeNull();
    expect(await readNewsPostBySlug(db, "draft", false, now)).toBeNull();
  });

  it("shows it the moment the clock passes publishAt, with no write in between", async () => {
    await create("soon", { publishAt: at(1) }, "published");
    expect(await readNewsPostBySlug(db, "soon", false, at(0))).toBeNull();
    expect(await readNewsPostBySlug(db, "soon", false, at(1))).not.toBeNull();
    expect(await readNewsPostBySlug(db, "soon", false, at(1.01))).not.toBeNull();
  });

  it("lets a preview read see a draft and a scheduled item", async () => {
    await create("hidden", { publishAt: at(5) }, "published");
    expect(await readNewsPostBySlug(db, "hidden", true, now)).not.toBeNull();
  });
});

describe("slug change on a published item", () => {
  it("adds redirects from the old public path in both languages and audits it", async () => {
    const { id } = await create("old-name", {}, "published");
    await saveContent({ entityType: "newsPost", table: newsPosts, actor: actor(), db, id, values: { slug: "new-name" } });
    const rows = await db.select().from(redirects);
    expect(rows.map((r) => [r.fromPath, r.toPath]).sort()).toEqual([
      ["/en/news/old-name", "/en/news/new-name"],
      ["/th/news/old-name", "/th/news/new-name"],
    ]);
    const audits = await db.select().from(auditLog).where(and(eq(auditLog.entityId, id), eq(auditLog.action, "news_posts.slug_redirect")));
    expect(audits).toHaveLength(1);
    expect(revalidateFor).toHaveBeenCalledWith("redirect");
  });

  it("adds none for a draft, or when the slug is unchanged", async () => {
    const { id } = await create("draft-slug");
    await saveContent({ entityType: "newsPost", table: newsPosts, actor: actor(), db, id, values: { slug: "renamed" } });
    const published = await create("same", {}, "published");
    await saveContent({ entityType: "newsPost", table: newsPosts, actor: actor(), db, id: published.id, values: { titleEn: "Changed" } });
    expect(await db.select().from(redirects)).toHaveLength(0);
  });

  it("repoints an older redirect so renaming twice does not chain", async () => {
    const { id } = await create("one", {}, "published");
    await saveContent({ entityType: "newsPost", table: newsPosts, actor: actor(), db, id, values: { slug: "two" } });
    await saveContent({ entityType: "newsPost", table: newsPosts, actor: actor(), db, id, values: { slug: "three" } });
    const map = Object.fromEntries((await db.select().from(redirects)).map((r) => [r.fromPath, r.toPath]));
    expect(map["/th/news/one"]).toBe("/th/news/three");
    expect(map["/th/news/two"]).toBe("/th/news/three");
  });
});

describe("duplicateContent", () => {
  it("creates a draft copy with (copy) titles, a unique slug, no dates, copied children and audit", async () => {
    const { id } = await saveContent({
      entityType: "newsPost",
      table: newsPosts,
      actor: actor(),
      db,
      values: post("hello", { publishAt: new Date("2030-01-01T00:00:00Z") }),
      status: "published",
      children: async (tx, postId) => {
        await tx.insert(newsPostTags).values({ newsPostId: postId, position: 0, labelTh: "ก", labelEn: "tag" });
      },
    });
    const copy = await duplicateContent({ segment: "news", id, actor: actor(), db });
    const second = await duplicateContent({ segment: "news", id, actor: actor(), db });

    const [row] = await db.select().from(newsPosts).where(eq(newsPosts.id, copy.id));
    expect(row).toMatchObject({ slug: "hello-copy", titleEn: "Title (copy)", titleTh: "ก (สำเนา)", status: "draft", publishedAt: null, publishAt: null, createdBy: userId });
    const [other] = await db.select().from(newsPosts).where(eq(newsPosts.id, second.id));
    expect(other!.slug).toBe("hello-copy-2");
    expect((await db.select().from(newsPostTags).where(eq(newsPostTags.newsPostId, copy.id))).map((t) => t.labelEn)).toEqual(["tag"]);
    expect(await db.select().from(auditLog).where(and(eq(auditLog.entityId, copy.id), eq(auditLog.action, "news_posts.duplicate")))).toHaveLength(1);
    expect((await listRevisions(db, news, copy.id))).toHaveLength(1);
  });

  it("refuses an unknown row", async () => {
    await expect(duplicateContent({ segment: "news", id: "00000000-0000-0000-0000-000000000000", actor: actor(), db })).rejects.toMatchObject({ name: "ContentNotFoundError" });
  });
});

describe("restoreRevision", () => {
  it("writes an old revision back as a new revision, as a draft, and audits it", async () => {
    const { id } = await create("restore-me", { titleEn: "First" }, "published");
    await saveContent({ entityType: "newsPost", table: newsPosts, actor: actor(), db, id, values: { titleEn: "Second", publishAt: new Date("2031-01-01T00:00:00Z") } });
    expect(await listRevisions(db, news, id)).toHaveLength(2);

    await restoreRevision({ segment: "news", id, revisionNumber: 1, publish: false, actor: actor(), db });
    const [row] = await db.select().from(newsPosts).where(eq(newsPosts.id, id));
    expect(row).toMatchObject({ titleEn: "First", status: "draft", publishAt: null });
    const revisions = await listRevisions(db, news, id);
    expect(revisions.map((r) => r.revisionNumber)).toEqual([3, 2, 1]);
    expect(revisions[0]!.status).toBe("draft");
    expect(await db.select().from(auditLog).where(and(eq(auditLog.entityId, id), eq(auditLog.action, "news_posts.restore")))).toHaveLength(1);
  });

  it("publishes when asked, and restores child rows", async () => {
    const { id } = await saveContent({
      entityType: "newsPost",
      table: newsPosts,
      actor: actor(),
      db,
      values: post("kids"),
      children: async (tx, postId) => {
        await tx.insert(newsPostTags).values({ newsPostId: postId, position: 0, labelTh: "ก", labelEn: "kept" });
        return { tags: [{ newsPostId: postId, position: 0, labelTh: "ก", labelEn: "kept" }] };
      },
    });
    await saveContent({
      entityType: "newsPost",
      table: newsPosts,
      actor: actor(),
      db,
      id,
      values: { titleEn: "Later" },
      children: async (tx, postId) => {
        await tx.delete(newsPostTags).where(eq(newsPostTags.newsPostId, postId));
        return { tags: [] };
      },
    });
    await restoreRevision({ segment: "news", id, revisionNumber: 1, publish: true, actor: actor(), db });
    const [row] = await db.select().from(newsPosts).where(eq(newsPosts.id, id));
    expect(row).toMatchObject({ titleEn: "Title", status: "published" });
    expect(row!.publishedAt).not.toBeNull();
    expect((await db.select().from(newsPostTags).where(eq(newsPostTags.newsPostId, id))).map((t) => t.labelEn)).toEqual(["kept"]);
  });

  it("reports a slug now used by another item, and an unknown revision", async () => {
    const { id } = await create("first-slug");
    await saveContent({ entityType: "newsPost", table: newsPosts, actor: actor(), db, id, values: { slug: "second-slug" } });
    await create("first-slug");
    await expect(restoreRevision({ segment: "news", id, revisionNumber: 1, publish: false, actor: actor(), db })).rejects.toMatchObject({ name: "ContentConflictError" });
    await expect(restoreRevision({ segment: "news", id, revisionNumber: 99, publish: false, actor: actor(), db })).rejects.toBeInstanceOf(RevisionNotRestorableError);
    const [row] = await db.select().from(newsPosts).where(eq(newsPosts.id, id));
    expect(row!.slug).toBe("second-slug");
  });
});
