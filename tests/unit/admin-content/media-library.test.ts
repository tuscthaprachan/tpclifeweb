import { eq } from "drizzle-orm";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { bulkDeleteImages, bulkUpdateAlt, parseImageIds } from "@/lib/admin/media/bulk";
import { readImageDimensions } from "@/lib/admin/media/dimensions";
import { listLibrary, parseLibraryQuery } from "@/lib/admin/media/library";
import { replaceImageFile } from "@/lib/admin/media/replace";
import { scanImageUsage } from "@/lib/admin/media/usage";
import { auditLog, canteenStalls, contentPages, events, images, newsPostImages, newsPosts } from "@/lib/db/schema";
import { createMemoryStorage, setStorageForTests } from "@/lib/storage";
import type { RichTextDoc } from "@/lib/rich-text/types";
import { createTestDb, makeUser } from "../db/harness";

type Db = Awaited<ReturnType<typeof createTestDb>>["db"];
let db: Db;
let userId: string;
let otherId: string;
const actor = () => ({ userId, context: { actorUserId: userId } });

const doc = (imageId: string) =>
  ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }, { type: "image", attrs: { imageId, isDecorative: true } }] }) as unknown as RichTextDoc;
const newImage = async (key: string, extra: Partial<typeof images.$inferInsert> = {}) =>
  (await db.insert(images).values({ storageKey: key, altTh: "ก", altEn: "a", ...extra }).returning())[0]!;

function png(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}

beforeAll(async () => {
  ({ db } = await createTestDb());
  userId = await makeUser(db, "Ann");
  otherId = await makeUser(db, "Ben");
});

beforeEach(async () => {
  await db.delete(newsPosts);
  await db.delete(events);
  await db.delete(contentPages);
  await db.delete(canteenStalls);
  await db.delete(images);
});

afterEach(() => setStorageForTests(undefined));

describe("usage scan", () => {
  it("finds covers, galleries, stall photos and rich text in every content type in one pass", async () => {
    const cover = await newImage("content/images/cover.png");
    const gallery = await newImage("content/images/gallery.png");
    const inNews = await newImage("content/images/in-news.png");
    const inPage = await newImage("content/images/in-page.png");
    const unused = await newImage("content/images/unused.png");
    const [post] = await db.insert(newsPosts).values({ slug: "p", titleEn: "Post", owner: "tusu", coverImageId: cover.id, bodyEn: doc(inNews.id) }).returning();
    await db.insert(newsPostImages).values({ newsPostId: post!.id, imageId: gallery.id, position: 0 });
    const [page] = await db
      .insert(contentPages)
      .values({ section: "start", slug: "g", titleEn: "Guide", category: "welfare", bodyTh: doc(inPage.id), bodyEn: doc(inPage.id) })
      .returning();

    const usage = await scanImageUsage(db);
    expect(usage.get(cover.id)).toEqual([{ segment: "news", id: post!.id, title: { th: "", en: "Post" }, role: "cover" }]);
    expect(usage.get(gallery.id)?.[0]).toMatchObject({ segment: "news", role: "gallery" });
    expect(usage.get(inNews.id)?.[0]).toMatchObject({ segment: "news", role: "text" });
    expect(usage.get(inPage.id)).toEqual([{ segment: "topics", id: page!.id, title: { th: "", en: "Guide" }, role: "text" }]);
    expect(usage.has(unused.id)).toBe(false);
  });

  it("ignores an id that only appears as plain text", async () => {
    const image = await newImage("content/images/mention.png");
    const note = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: `see imageId ${image.id}` }] }] } as unknown as RichTextDoc;
    await db.insert(newsPosts).values({ slug: "n", titleEn: "Note", owner: "tusu", bodyEn: note });
    expect((await scanImageUsage(db)).has(image.id)).toBe(false);
  });
});

describe("bulk delete", () => {
  it("deletes unused pictures and refuses used ones with where they are used", async () => {
    const used = await newImage("content/images/used.png");
    const free = await newImage("content/images/free.png");
    const [post] = await db.insert(newsPosts).values({ slug: "p", titleEn: "Post", owner: "tusu", bodyEn: doc(used.id) }).returning();

    const result = await bulkDeleteImages(db, actor(), [used.id, free.id, "00000000-0000-4000-8000-000000000000"]);
    expect(result.deleted).toEqual([{ id: free.id, storageKey: "content/images/free.png" }]);
    expect(result.failed).toEqual([
      { id: used.id, reason: "inUse", uses: [{ segment: "news", id: post!.id, title: { th: "", en: "Post" }, role: "text" }] },
      { id: "00000000-0000-4000-8000-000000000000", reason: "notFound" },
    ]);
    expect(await db.select().from(images).where(eq(images.id, used.id))).toHaveLength(1);
    expect(await db.select().from(auditLog).where(eq(auditLog.action, "images.delete"))).toHaveLength(1);
  });

  it("keeps only valid distinct ids from a form", () => {
    expect(parseImageIds(["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000001", "nope", 3])).toEqual(["00000000-0000-4000-8000-000000000001"]);
  });
});

describe("bulk alt text", () => {
  it("saves complete descriptions and reports incomplete ones", async () => {
    const one = await newImage("content/images/one.png", { altTh: "", altEn: "" });
    const two = await newImage("content/images/two.png", { altTh: "", altEn: "" });
    const three = await newImage("content/images/three.png", { altTh: "ก", altEn: "a" });
    const result = await bulkUpdateAlt(db, actor(), [
      { id: one.id, altTh: " สวน ", altEn: "Garden", isDecorative: false },
      { id: two.id, altTh: "สวน", altEn: "", isDecorative: false },
      { id: three.id, altTh: "x", altEn: "y", isDecorative: true },
    ]);
    expect(result.updated).toEqual([one.id, three.id]);
    expect(result.failed).toEqual([{ id: two.id, reason: "missingAlt" }]);
    const [after] = await db.select().from(images).where(eq(images.id, one.id));
    expect(after).toMatchObject({ altTh: "สวน", altEn: "Garden" });
    const [decorative] = await db.select().from(images).where(eq(images.id, three.id));
    expect(decorative).toMatchObject({ altTh: "", altEn: "", isDecorative: true });
    expect(await db.select().from(auditLog).where(eq(auditLog.action, "images.update"))).toHaveLength(2);
  });
});

describe("replace file", () => {
  it("keeps the id and every use, swaps the key, deletes the old file and audits", async () => {
    const storage = createMemoryStorage();
    setStorageForTests(storage);
    const oldKey = "content/images/old.png";
    await storage.put(oldKey, png(10, 10), { visibility: "public", contentType: "image/png", maxBytes: 1_000_000 });
    const image = await newImage(oldKey, { width: 10, height: 10 });
    const [post] = await db.insert(newsPosts).values({ slug: "p", titleEn: "Post", owner: "tusu", coverImageId: image.id }).returning();

    const file = new File([png(640, 480) as BlobPart], "new.png", { type: "image/png" });
    const result = await replaceImageFile({ db, actor: actor(), id: image.id, file, locale: "en" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.image.id).toBe(image.id);
    expect(result.image.storageKey).not.toBe(oldKey);
    expect(result.image).toMatchObject({ width: 640, height: 480, altTh: "ก", altEn: "a" });
    expect(await storage.get(oldKey)).toBeNull();
    expect(await storage.get(result.image.storageKey)).not.toBeNull();
    const [row] = await db.select().from(newsPosts).where(eq(newsPosts.id, post!.id));
    expect(row!.coverImageId).toBe(image.id);
    expect(await db.select().from(auditLog).where(eq(auditLog.action, "images.replace"))).toHaveLength(1);
  });

  it("refuses a file that is not a picture and changes nothing", async () => {
    const storage = createMemoryStorage();
    setStorageForTests(storage);
    const image = await newImage("content/images/keep.png");
    const result = await replaceImageFile({ db, actor: actor(), id: image.id, file: new File(["hello"], "x.png", { type: "image/png" }), locale: "en" });
    expect(result.ok).toBe(false);
    const [row] = await db.select().from(images).where(eq(images.id, image.id));
    expect(row!.storageKey).toBe("content/images/keep.png");
  });
});

describe("library filters", () => {
  it("filters by missing alt, unused, uploader, age and search, and sorts", async () => {
    const used = await newImage("content/images/used-one.png", { createdBy: userId, width: 100, height: 100 });
    await newImage("content/images/bare.png", { createdBy: otherId, altTh: "", altEn: "Bare", width: 400, height: 400 });
    await newImage("content/images/decor.png", { createdBy: userId, altTh: "", altEn: "", isDecorative: true });
    await newImage("content/images/old.png", { createdBy: userId, altEn: "Zebra", createdAt: new Date(Date.now() - 60 * 86_400_000) });
    await db.insert(events).values({ slug: "e", titleEn: "Event", owner: "tusu", startsAt: new Date(), coverImageId: used.id } as typeof events.$inferInsert);

    const q = (raw: Record<string, string>) => listLibrary(db, parseLibraryQuery(raw));
    expect((await q({ alt: "missing" })).rows.map((r) => r.image.storageKey)).toEqual(["content/images/bare.png"]);
    const unused = await q({ unused: "1" });
    expect(unused.rows.map((r) => r.image.storageKey)).not.toContain("content/images/used-one.png");
    expect(unused.total).toBe(3);
    expect((await q({})).rows.find((r) => r.image.id === used.id)?.uses).toHaveLength(1);
    expect((await q({ by: otherId })).total).toBe(1);
    expect((await q({ within: "30d" })).total).toBe(3);
    expect((await q({ q: "zebra" })).total).toBe(1);
    expect((await q({ q: "bare.png" })).total).toBe(1);
    expect((await q({ sort: "size" })).rows[0]!.image.storageKey).toBe("content/images/bare.png");
    expect((await q({ sort: "oldest" })).rows[0]!.image.storageKey).toBe("content/images/old.png");
    const name = await q({ sort: "name" });
    expect(name.rows[name.rows.length - 1]!.image.altEn).toBe("Zebra");
    expect((await q({ q: "100%" })).total).toBe(0);
  });

  it("falls back to defaults for unknown parameters", () => {
    expect(parseLibraryQuery({ sort: "nope", view: "x", within: "1y", page: "-4" })).toMatchObject({ sort: "newest", view: "grid", page: 1, within: undefined });
    expect(parseLibraryQuery({ view: "table" }).view).toBe("table");
  });
});

describe("image dimensions", () => {
  it("reads PNG, JPEG and WebP headers and rejects junk", () => {
    expect(readImageDimensions(png(321, 123), "image/png")).toEqual({ width: 321, height: 123 });
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 11, 8, 0x01, 0x00, 0x02, 0x00, 3, 0, 0, 0]);
    expect(readImageDimensions(jpeg, "image/jpeg")).toEqual({ width: 512, height: 256 });
    const webp = new Uint8Array(30);
    webp.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58]);
    webp.set([0x1f, 0x03, 0x00], 24);
    webp.set([0x0f, 0x02, 0x00], 27);
    expect(readImageDimensions(webp, "image/webp")).toEqual({ width: 800, height: 528 });
    expect(readImageDimensions(new Uint8Array(40), "image/png")).toBeNull();
    expect(readImageDimensions(png(1, 1), "image/heic")).toBeNull();
  });
});
