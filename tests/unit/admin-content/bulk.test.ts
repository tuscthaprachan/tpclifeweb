import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLog, newsPosts } from "@/lib/db/schema";
import { createTestDb, makeUser } from "../db/harness";

const revalidateFor = vi.fn();
vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: (...args: unknown[]) => revalidateFor(...args) }));

const { applyBulk, bulkResultParams, parseBulkResult, parseIds, publishBlocker } = await import("@/lib/admin/content/bulk");
const { getContentType } = await import("@/lib/admin/content/types");
const { saveContent } = await import("@/lib/admin/content/save");

type Harness = Awaited<ReturnType<typeof createTestDb>>;
let db: Harness["db"];
let userId: string;
const actor = () => ({ userId, context: { actorUserId: userId } });
const def = getContentType("news")!;

const make = async (slug: string, titleTh: string, titleEn: string) =>
  (await saveContent({ entityType: "newsPost", table: newsPosts, actor: actor(), db, values: { slug, titleTh, titleEn, owner: "tusu" } })).id;

beforeAll(async () => {
  ({ db } = await createTestDb());
  userId = await makeUser(db);
});

beforeEach(async () => {
  revalidateFor.mockClear();
  await db.delete(newsPosts);
});

describe("applyBulk publish", () => {
  it("publishes the complete rows and reports each incomplete one", async () => {
    const good = await make("good", "ดี", "Good");
    const noEn = await make("no-en", "ไทยเท่านั้น", "");
    const noTh = await make("no-th", "", "English only");
    const neither = await make("neither", " ", "");
    const missing = "00000000-0000-4000-8000-000000000000";

    const result = await applyBulk({ def, action: "publish", ids: [good, noEn, noTh, neither, missing], actor: actor(), db });

    expect(result.done).toEqual([good]);
    expect(result.failed).toEqual([
      { id: noEn, reason: "missingEn" },
      { id: noTh, reason: "missingTh" },
      { id: neither, reason: "missingBoth" },
      { id: missing, reason: "notFound" },
    ]);
    const rows = await db.select({ id: newsPosts.id, status: newsPosts.status }).from(newsPosts);
    expect(Object.fromEntries(rows.map((r) => [r.id, r.status]))).toEqual({ [good]: "published", [noEn]: "draft", [noTh]: "draft", [neither]: "draft" });
    const audits = await db.select().from(auditLog).where(eq(auditLog.entityId, good));
    expect(audits.map((a) => a.action)).toContain("news_posts.publish");
    expect(revalidateFor).toHaveBeenCalledWith("newsPost", "good");
  });

  it("counts a row already in the wanted state as done without writing again", async () => {
    const id = await make("again", "ก", "A");
    await applyBulk({ def, action: "publish", ids: [id], actor: actor(), db });
    const before = (await db.select().from(auditLog).where(eq(auditLog.entityId, id))).length;
    const result = await applyBulk({ def, action: "publish", ids: [id], actor: actor(), db });
    expect(result).toEqual({ done: [id], failed: [] });
    expect((await db.select().from(auditLog).where(eq(auditLog.entityId, id))).length).toBe(before);
  });
});

describe("applyBulk unpublish and delete", () => {
  it("unpublishes to draft", async () => {
    const id = await make("live", "ก", "A");
    await applyBulk({ def, action: "publish", ids: [id], actor: actor(), db });
    const result = await applyBulk({ def, action: "unpublish", ids: [id], actor: actor(), db });
    expect(result.done).toEqual([id]);
    const [row] = await db.select().from(newsPosts).where(eq(newsPosts.id, id));
    expect(row!.status).toBe("draft");
  });

  it("deletes with an audit entry, and reports a row that has already gone", async () => {
    const id = await make("gone", "ก", "A");
    const missing = "00000000-0000-4000-8000-000000000001";
    const result = await applyBulk({ def, action: "delete", ids: [id, missing], actor: actor(), db });
    expect(result.done).toEqual([id]);
    expect(result.failed).toEqual([{ id: missing, reason: "notFound" }]);
    expect(await db.select().from(newsPosts)).toHaveLength(0);
    const audits = await db.select().from(auditLog).where(eq(auditLog.entityId, id));
    expect(audits.map((a) => a.action)).toContain("news_posts.delete");
  });
});

describe("helpers", () => {
  it("names what blocks a publish", () => {
    expect(publishBlocker({ th: "ก", en: "A" })).toBeUndefined();
    expect(publishBlocker({ th: "ก", en: " " })).toBe("missingEn");
  });

  it("keeps only distinct valid ids", () => {
    const id = "00000000-0000-4000-8000-000000000002";
    expect(parseIds([id, id, "nope", 4])).toEqual([id]);
  });

  it("round-trips a result through the query string", () => {
    const id = "00000000-0000-4000-8000-000000000003";
    const search = bulkResultParams("publish", { done: ["x", "y"], failed: [{ id, reason: "missingEn" }] });
    const parsed = parseBulkResult({ bulk: search.get("bulk")!, ok: search.get("ok")!, fail: search.getAll("fail") });
    expect(parsed).toEqual({ action: "publish", ok: 2, failed: [{ id, reason: "missingEn" }] });
    expect(parseBulkResult({ bulk: "explode" })).toBeUndefined();
  });
});
