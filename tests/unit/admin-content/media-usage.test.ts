import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { deleteImage, updateImage } from "@/app/admin/content/images/service";
import { findImageUses } from "@/app/admin/content/images/usage";
import { auditLog, contentPages, images, newsPostImages, newsPosts } from "@/lib/db/schema";
import type { RichTextDoc } from "@/lib/rich-text/types";
import { createTestDb, makeUser } from "../db/harness";

type Db = Awaited<ReturnType<typeof createTestDb>>["db"];
let db: Db;
let userId: string;
const actor = () => ({ userId, context: { actorUserId: userId } });

const asDoc = (doc: unknown) => doc as RichTextDoc;
const imageBlock = (imageId: string) => ({ type: "image", attrs: { imageId, isDecorative: true } });
const docWith = (imageId: string) => asDoc({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }, imageBlock(imageId)] });
const newImage = async (key: string) => (await db.insert(images).values({ storageKey: key, altTh: "ก", altEn: "a" }).returning())[0]!;

beforeAll(async () => {
  ({ db } = await createTestDb());
  userId = await makeUser(db);
});

beforeEach(async () => {
  await db.delete(newsPosts);
  await db.delete(contentPages);
  await db.delete(images);
});

describe("deleting a picture", () => {
  it("is blocked when a rich text document uses it, and says where", async () => {
    const image = await newImage("content/images/in-text.jpg");
    const [page] = await db
      .insert(contentPages)
      .values({ kind: "welfare", slug: "grants", titleTh: "ทุน", titleEn: "Grants", category: "welfare", bodyEn: docWith(image.id) })
      .returning();

    const result = await deleteImage(db, actor(), image.id);
    expect(result).toEqual({
      ok: false,
      reason: "inUse",
      uses: [{ segment: "welfare", id: page!.id, title: { th: "ทุน", en: "Grants" }, role: "text" }],
    });
    expect(await db.select().from(images).where(eq(images.id, image.id))).toHaveLength(1);
    expect(await db.select().from(auditLog).where(eq(auditLog.action, "images.delete"))).toHaveLength(0);
  });

  it("reports guide pages separately from welfare pages, and every language column", async () => {
    const image = await newImage("content/images/guide.jpg");
    await db.insert(contentPages).values({ kind: "guide", slug: "start", titleEn: "Start", category: "welfare", bodyTh: docWith(image.id), bodyEn: docWith(image.id) });
    const uses = await findImageUses(db, image.id);
    expect(uses).toHaveLength(1);
    expect(uses[0]).toMatchObject({ segment: "guides", role: "text" });
  });

  it("is blocked by a cover picture and by a gallery", async () => {
    const cover = await newImage("content/images/cover.jpg");
    const gallery = await newImage("content/images/gallery.jpg");
    const [post] = await db.insert(newsPosts).values({ slug: "p", titleEn: "Post", owner: "tusu", coverImageId: cover.id }).returning();
    await db.insert(newsPostImages).values({ newsPostId: post!.id, imageId: gallery.id, position: 0 });

    expect(await deleteImage(db, actor(), cover.id)).toMatchObject({ ok: false, reason: "inUse", uses: [{ segment: "news", role: "cover" }] });
    expect(await deleteImage(db, actor(), gallery.id)).toMatchObject({ ok: false, reason: "inUse", uses: [{ segment: "news", role: "gallery" }] });
  });

  it("ignores an id that only appears as other text in a document", async () => {
    const image = await newImage("content/images/mention.jpg");
    const note = asDoc({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: `see ${image.id}` }] }] });
    await db.insert(newsPosts).values({ slug: "note", titleEn: "Note", owner: "tusu", bodyEn: note });
    expect(await findImageUses(db, image.id)).toEqual([]);
  });

  it("deletes an unused picture with an audit entry and hands back its file key", async () => {
    const image = await newImage("content/images/unused.jpg");
    expect(await deleteImage(db, actor(), image.id)).toEqual({ ok: true, storageKey: "content/images/unused.jpg" });
    expect(await db.select().from(images)).toHaveLength(0);
    expect(await db.select().from(auditLog).where(eq(auditLog.action, "images.delete"))).toHaveLength(1);
    expect(await deleteImage(db, actor(), image.id)).toEqual({ ok: false, reason: "notFound" });
  });
});

describe("updateImage", () => {
  it("changes the description and credit and audits the change", async () => {
    const image = await newImage("content/images/edit.jpg");
    const saved = await updateImage(db, actor(), image.id, { altTh: "ใหม่", altEn: "New", isDecorative: false, captionTh: "ก", captionEn: "K" });
    expect(saved).toMatchObject({ altEn: "New", captionEn: "K" });
    const [entry] = await db.select().from(auditLog).where(eq(auditLog.action, "images.update"));
    expect((entry!.before as { altEn: string }).altEn).toBe("a");
    expect(await updateImage(db, actor(), "00000000-0000-4000-8000-000000000000", { altTh: "", altEn: "", isDecorative: true, captionTh: null, captionEn: null })).toBeNull();
  });
});
