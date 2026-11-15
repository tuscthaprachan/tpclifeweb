import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { events, newsPosts } from "@/lib/db/schema";
import { createTestDb, makeUser } from "../db/harness";

vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));

const { countByStatus, listContentRows, listEditors } = await import("@/lib/admin/content/list");
const { buildContentCsv } = await import("@/lib/admin/content/export");
const { getContentType } = await import("@/lib/admin/content/types");
const { saveContent } = await import("@/lib/admin/content/save");

type Harness = Awaited<ReturnType<typeof createTestDb>>;
let db: Harness["db"];
let ploy: string;
let somchai: string;
const news = getContentType("news")!;
const day = 86_400_000;

const post = (userId: string, slug: string, titleTh: string, titleEn: string, extra: { status?: "published"; category?: string; ageDays?: number; publishedAt?: Date } = {}) =>
  saveContent({
    entityType: "newsPost",
    table: newsPosts,
    actor: { userId, context: { actorUserId: userId } },
    db,
    status: extra.status,
    now: new Date(Date.now() - (extra.ageDays ?? 0) * day),
    values: { slug, titleTh, titleEn, owner: "tusu", category: extra.category ?? null, publishedAt: extra.publishedAt ?? null },
  });

beforeAll(async () => {
  ({ db } = await createTestDb());
  ploy = await makeUser(db, "Ploy");
  somchai = await makeUser(db, "Somchai");
  await post(ploy, "banana", "กล้วย", "Banana", { ageDays: 1, category: "welfare" });
  await post(somchai, "apple", "แอปเปิล", "Apple", { ageDays: 10, status: "published", category: "transport", publishedAt: new Date("2026-01-05") });
  await post(ploy, "cherry", "เชอร์รี", "Cherry", { ageDays: 40, status: "published", category: "welfare", publishedAt: new Date("2026-02-05") });
});

const slugs = async (options: Parameters<typeof listContentRows>[2]) => (await listContentRows(db, news, { withEditor: true, ...options })).rows.map((r) => r.slug);

describe("listContentRows sorting", () => {
  it("defaults to newest edit first", async () => {
    expect(await slugs({})).toEqual(["banana", "apple", "cherry"]);
    expect(await slugs({ sort: "updated", dir: "asc" })).toEqual(["cherry", "apple", "banana"]);
  });

  it("sorts by title in the staff language", async () => {
    expect(await slugs({ sort: "title", dir: "asc", locale: "en" })).toEqual(["apple", "banana", "cherry"]);
    expect(await slugs({ sort: "title", dir: "desc", locale: "en" })).toEqual(["cherry", "banana", "apple"]);
  });

  it("sorts by status", async () => {
    expect((await slugs({ sort: "status", dir: "asc" }))[0]).toBe("banana");
    expect((await slugs({ sort: "status", dir: "desc" }))[2]).toBe("banana");
  });

  it("sorts by the published date, drafts without one last", async () => {
    expect(await slugs({ sort: "date", dir: "desc" })).toEqual(["cherry", "apple", "banana"]);
    expect(await slugs({ sort: "date", dir: "asc" })).toEqual(["apple", "cherry", "banana"]);
  });

  it("pages stably", async () => {
    const first = await slugs({ sort: "title", dir: "asc", locale: "en", limit: 2, page: 1 });
    const second = await slugs({ sort: "title", dir: "asc", locale: "en", limit: 2, page: 2 });
    expect([...first, ...second]).toEqual(["apple", "banana", "cherry"]);
  });
});

describe("listContentRows filtering", () => {
  it("filters by editor, recency, facet, status and text, and they combine", async () => {
    expect(await slugs({ by: ploy })).toEqual(["banana", "cherry"]);
    expect(await slugs({ within: "7d" })).toEqual(["banana"]);
    expect(await slugs({ within: "30d" })).toEqual(["banana", "apple"]);
    expect(await slugs({ facet: "welfare" })).toEqual(["banana", "cherry"]);
    expect(await slugs({ facet: "welfare", status: "published" })).toEqual(["cherry"]);
    expect(await slugs({ q: "เปิล" })).toEqual(["apple"]);
    expect(await slugs({ by: ploy, facet: "welfare", within: "30d", q: "ban" })).toEqual(["banana"]);
  });

  it("ignores a facet value the type does not offer", async () => {
    expect(await slugs({ facet: "nonsense" })).toHaveLength(3);
  });

  it("counts by status under the other filters", async () => {
    expect(await countByStatus(db, news, { by: ploy })).toEqual({ all: 2, published: 1, draft: 1, scheduled: 0, expired: 0 });
    expect(await countByStatus(db, news, { by: ploy, status: "draft" })).toEqual({ all: 2, published: 1, draft: 1, scheduled: 0, expired: 0 });
  });

  it("counts and filters expired and scheduled items apart from live ones", async () => {
    const day = 86_400_000;
    await db.update(newsPosts).set({ unpublishAt: new Date(Date.now() - day) }).where(sql`${newsPosts.slug} = 'cherry'`);
    await db.update(newsPosts).set({ publishAt: new Date(Date.now() + day) }).where(sql`${newsPosts.slug} = 'apple'`);
    expect(await countByStatus(db, news)).toEqual({ all: 3, published: 0, draft: 1, scheduled: 1, expired: 1 });
    expect(await slugs({ status: "expired" })).toEqual(["cherry"]);
    expect(await slugs({ status: "scheduled" })).toEqual(["apple"]);
    expect(await slugs({ status: "published" })).toEqual([]);
    await db.update(newsPosts).set({ publishAt: null, unpublishAt: null });
  });

  it("lists the editors who have touched the type", async () => {
    expect((await listEditors(db, news)).map((e) => e.name)).toEqual(["Ploy", "Somchai"]);
  });

  it("filters events by start date sort and category", async () => {
    const def = getContentType("events")!;
    const actor = { userId: ploy, context: { actorUserId: ploy } };
    const base = { owner: "tusu", titleTh: "ก", locationTh: "", locationEn: "" };
    await saveContent({ entityType: "event", table: events, actor, db, values: { ...base, slug: "late", titleEn: "Late", startsAt: new Date("2026-06-01"), category: "activity" } });
    await saveContent({ entityType: "event", table: events, actor, db, values: { ...base, slug: "early", titleEn: "Early", startsAt: new Date("2026-05-01"), category: "welfare" } });
    const rows = await listContentRows(db, def, { sort: "date", dir: "asc", withEditor: true });
    expect(rows.rows.map((r) => r.slug)).toEqual(["early", "late"]);
    expect((await listContentRows(db, def, { facet: "activity" })).rows.map((r) => r.title.en)).toEqual(["Late"]);
  });
});

describe("buildContentCsv", () => {
  it("exports the filtered rows in the list order", async () => {
    const { csv, count, filename } = await buildContentCsv(db, news, { by: ploy, sort: "title", dir: "asc" }, "en");
    expect(count).toBe(2);
    expect(filename).toMatch(/^news-\d{4}-\d{2}-\d{2}\.csv$/);
    const lines = csv.slice(1).trim().split("\r\n");
    expect(lines[0]).toBe("id,title_th,title_en,slug,status,updated_at,updated_by,public_url");
    expect(lines[1]).toContain(",กล้วย,Banana,banana,draft,");
    expect(lines[2]).toContain(",เชอร์รี,Cherry,cherry,published,");
    expect(lines[2]).toContain("/en/news/cherry");
  });
});
