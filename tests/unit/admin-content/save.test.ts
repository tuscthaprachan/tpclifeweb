import { and, eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLog, contentRevisions, newsPostImages, newsPosts, newsPostTags } from "@/lib/db/schema";
import { createTestDb, makeUser } from "../db/harness";

const revalidateFor = vi.fn();
vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: (...args: unknown[]) => revalidateFor(...args) }));

const { ContentConflictError, ContentNotFoundError, deleteContent, saveContent, setStatus } = await import("@/lib/admin/content/save");

type Harness = Awaited<ReturnType<typeof createTestDb>>;
let db: Harness["db"];
let userId: string;
const actor = () => ({ userId, context: { actorUserId: userId, ip: "203.0.113.9" } });

const post = (slug: string, extra: Record<string, unknown> = {}) => ({ slug, titleTh: "ก", titleEn: "A", owner: "tusu", ...extra });
const create = (slug = "first", extra: Record<string, unknown> = {}) =>
  saveContent({ entityType: "newsPost", table: newsPosts, actor: actor(), db, values: post(slug, extra) });

beforeAll(async () => {
  ({ db } = await createTestDb());
  userId = await makeUser(db);
});

beforeEach(async () => {
  revalidateFor.mockClear();
  await db.delete(newsPosts);
  await db.delete(contentRevisions);
});

describe("saveContent", () => {
  it("inserts a draft with audit, revision and revalidation, all attributed to the user", async () => {
    const { id, created, row } = await create();
    expect(created).toBe(true);
    expect(row).toMatchObject({ status: "draft", createdBy: userId, updatedBy: userId, publishedAt: null });

    const audits = await db.select().from(auditLog).where(eq(auditLog.entityId, id));
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ action: "news_posts.create", entityType: "news_posts", actorUserId: userId, ip: "203.0.113.9", before: null });
    expect((audits[0]!.after as { row: { slug: string } }).row.slug).toBe("first");

    const revisions = await db.select().from(contentRevisions).where(eq(contentRevisions.entityId, id));
    expect(revisions).toHaveLength(1);
    expect(revisions[0]).toMatchObject({ entityType: "news_posts", revisionNumber: 1, createdBy: userId });

    expect(revalidateFor).toHaveBeenCalledTimes(1);
    expect(revalidateFor).toHaveBeenCalledWith("newsPost", "first");
  });

  it("updates, numbers revisions and records before and after", async () => {
    const { id } = await create();
    const saved = await saveContent({ entityType: "newsPost", table: newsPosts, actor: actor(), db, id, values: { titleEn: "B" } });
    expect(saved.created).toBe(false);
    expect(saved.row).toMatchObject({ titleEn: "B", titleTh: "ก" });

    const audits = await db.select().from(auditLog).where(and(eq(auditLog.entityId, id), eq(auditLog.action, "news_posts.update")));
    expect(audits).toHaveLength(1);
    expect((audits[0]!.before as { titleEn: string }).titleEn).toBe("A");
    expect((audits[0]!.after as { row: { titleEn: string } }).row.titleEn).toBe("B");

    const numbers = (await db.select().from(contentRevisions).where(eq(contentRevisions.entityId, id))).map((r) => r.revisionNumber).sort();
    expect(numbers).toEqual([1, 2]);
  });

  it("writes child rows in the same transaction and puts them in the revision", async () => {
    const { id } = await saveContent({
      entityType: "newsPost",
      table: newsPosts,
      actor: actor(),
      db,
      values: post("with-tags"),
      children: async (tx, newsPostId) => {
        const tags = [{ newsPostId, position: 0, labelTh: "ก", labelEn: "a" }];
        await tx.insert(newsPostTags).values(tags);
        return { tags };
      },
    });
    expect(await db.select().from(newsPostTags).where(eq(newsPostTags.newsPostId, id))).toHaveLength(1);
    const [revision] = await db.select().from(contentRevisions).where(eq(contentRevisions.entityId, id));
    expect((revision!.revision as { tags: unknown[] }).tags).toHaveLength(1);
  });

  it("rolls everything back, and does not revalidate, when a child write fails", async () => {
    const auditsBefore = (await db.select().from(auditLog)).length;
    await expect(
      saveContent({
        entityType: "newsPost",
        table: newsPosts,
        actor: actor(),
        db,
        values: post("doomed"),
        children: async (tx, newsPostId) => {
          await tx.insert(newsPostImages).values({ newsPostId, imageId: "00000000-0000-4000-8000-000000000000", position: 0 });
        },
      }),
    ).rejects.toThrow();
    expect(await db.select().from(newsPosts)).toHaveLength(0);
    expect(await db.select().from(auditLog)).toHaveLength(auditsBefore);
    expect(await db.select().from(contentRevisions)).toHaveLength(0);
    expect(revalidateFor).not.toHaveBeenCalled();
  });

  it("reports a duplicate slug as a conflict", async () => {
    await create("taken");
    await expect(create("taken")).rejects.toBeInstanceOf(ContentConflictError);
    expect(await db.select().from(newsPosts)).toHaveLength(1);
  });

  it("refuses to update a row that does not exist", async () => {
    await expect(
      saveContent({ entityType: "newsPost", table: newsPosts, actor: actor(), db, id: "00000000-0000-4000-8000-000000000000", values: {} }),
    ).rejects.toBeInstanceOf(ContentNotFoundError);
  });

  it("revalidates both addresses when the slug changes", async () => {
    const { id } = await create("old-name");
    revalidateFor.mockClear();
    await saveContent({ entityType: "newsPost", table: newsPosts, actor: actor(), db, id, values: { slug: "new-name" } });
    expect(revalidateFor.mock.calls.map((c) => c[1]).sort()).toEqual(["new-name", "old-name"]);
  });
});

describe("setStatus and publishing", () => {
  it("publishing sets published_at once; unpublishing keeps it; republishing keeps it", async () => {
    const { id } = await create();
    const now = new Date("2026-10-23T03:00:00Z");
    const pub = await setStatus({ entityType: "newsPost", table: newsPosts, actor: actor(), db, id, status: "published", now });
    expect(pub.row).toMatchObject({ status: "published", publishedAt: now });

    const down = await setStatus({ entityType: "newsPost", table: newsPosts, actor: actor(), db, id, status: "draft" });
    expect(down.row).toMatchObject({ status: "draft", publishedAt: now });

    const again = await setStatus({ entityType: "newsPost", table: newsPosts, actor: actor(), db, id, status: "published", now: new Date("2027-01-01T00:00:00Z") });
    expect(again.row.publishedAt).toEqual(now);

    const actions = (await db.select().from(auditLog).where(eq(auditLog.entityId, id))).map((r) => r.action).sort();
    expect(actions).toEqual(["news_posts.create", "news_posts.publish", "news_posts.publish", "news_posts.unpublish"]);
  });

  it("an explicit publication date wins", async () => {
    const date = new Date("2026-01-05T00:00:00Z");
    const { row } = await saveContent({
      entityType: "newsPost",
      table: newsPosts,
      actor: actor(),
      db,
      status: "published",
      values: post("dated", { publishedAt: date }),
    });
    expect(row.publishedAt).toEqual(date);
  });
});

describe("deleteContent", () => {
  it("deletes with an audit entry and a final revision, cascades children, and revalidates", async () => {
    const { id } = await saveContent({
      entityType: "newsPost",
      table: newsPosts,
      actor: actor(),
      db,
      values: post("bye"),
      children: async (tx, newsPostId) => {
        await tx.insert(newsPostTags).values({ newsPostId, position: 0, labelTh: "ก", labelEn: "a" });
      },
    });
    revalidateFor.mockClear();
    await deleteContent({ entityType: "newsPost", table: newsPosts, actor: actor(), db, id });

    expect(await db.select().from(newsPosts)).toHaveLength(0);
    expect(await db.select().from(newsPostTags)).toHaveLength(0);
    const [audit] = await db.select().from(auditLog).where(and(eq(auditLog.entityId, id), eq(auditLog.action, "news_posts.delete")));
    expect((audit!.before as { slug: string }).slug).toBe("bye");
    const revisions = await db.select().from(contentRevisions).where(eq(contentRevisions.entityId, id));
    expect(revisions.map((r) => r.revisionNumber).sort()).toEqual([1, 2]);
    expect(revalidateFor).toHaveBeenCalledWith("newsPost", "bye");
    await expect(deleteContent({ entityType: "newsPost", table: newsPosts, actor: actor(), db, id })).rejects.toBeInstanceOf(ContentNotFoundError);
  });
});

describe("what the public read layer sees", () => {
  it("shows a news post only while it is published, with the latest edits", async () => {
    const { readNewsPage, readNewsPostBySlug } = await import("@/lib/content/news");
    const { id } = await create("visible", { titleEn: "Draft title", bodyEn: { type: "doc", content: [] } });
    expect((await readNewsPage(db, 1, 10)).items).toHaveLength(0);
    expect(await readNewsPostBySlug(db, "visible")).toBeNull();

    await setStatus({ entityType: "newsPost", table: newsPosts, actor: actor(), db, id, status: "published" });
    expect((await readNewsPage(db, 1, 10)).items.map((p) => p.slug.current)).toEqual(["visible"]);

    await saveContent({ entityType: "newsPost", table: newsPosts, actor: actor(), db, id, status: "published", values: { titleEn: "Edited title" } });
    expect((await readNewsPostBySlug(db, "visible"))?.title.en).toBe("Edited title");

    await setStatus({ entityType: "newsPost", table: newsPosts, actor: actor(), db, id, status: "draft" });
    expect((await readNewsPage(db, 1, 10)).items).toHaveLength(0);
  });
});
