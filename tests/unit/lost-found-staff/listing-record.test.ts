import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { lostFoundItemPhotos, lostFoundItems } from "@/lib/db/schema";
import { images } from "@/lib/db/schema";
import { parseListingDetails } from "@/lib/lost-found/forms";
import {
  appendListingPhoto,
  contentActorOf,
  getListingForCase,
  listListingPhotos,
  removeListingPhoto,
  unpublishListingForCase,
  updateListingDetailsForCase,
} from "@/lib/lost-found/listing";
import { lfSetup, NOW } from "./helpers";

vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));

let t: Awaited<ReturnType<typeof lfSetup>>;
beforeAll(async () => {
  t = await lfSetup();
}, 60_000);

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
};

describe("parseListingDetails", () => {
  const base = { registerStatus: "open" };

  it("accepts no claim contact at all", () => {
    const parsed = parseListingDetails(form(base), "en");
    expect(parsed).toMatchObject({ ok: true, data: { registerStatus: "open", claimContact: null, claimBy: null } });
  });

  it("needs the whole claim contact once any part is typed", () => {
    const parsed = parseListingDetails(form({ ...base, claimValue: "0812345678" }), "en");
    expect(parsed.ok).toBe(false);
  });

  it("builds a claim contact and the deadline", () => {
    const parsed = parseListingDetails(
      form({ ...base, claimBy: "2026-11-30", "claimLabel.th": "เคาน์เตอร์", "claimLabel.en": "Desk", claimChannel: "inPerson", claimValue: "Student centre", "claimHours.en": "9 to 5" }),
      "en",
    );
    expect(parsed).toMatchObject({ ok: true, data: { claimBy: "2026-11-30", claimContact: { channel: "inPerson", value: "Student centre", hours: { en: "9 to 5" } } } });
  });

  it("rejects a claim link that is not a URL", () => {
    const parsed = parseListingDetails(form({ ...base, "claimLabel.th": "ก", "claimLabel.en": "A", claimChannel: "url", claimValue: "not a link" }), "en");
    expect(parsed.ok).toBe(false);
  });

  it("rejects an unknown progress value", () => {
    expect(parseListingDetails(form({ registerStatus: "lost" }), "en").ok).toBe(false);
  });
});

describe("listing writes from the case page", () => {
  it("unpublishes a published listing through the content path, with an audit entry", async () => {
    const found = await t.foundItem(t.officer, {}, { publish: true });
    expect((await getListingForCase(t.db, found.caseId))!.status).toBe("published");
    const done = await t.db.transaction((tx) => unpublishListingForCase(tx, found.caseId, contentActorOf(t.officer), NOW));
    expect(done).toBe(true);
    expect((await getListingForCase(t.db, found.caseId))!.status).toBe("draft");
    expect((await t.audits("lost_found_items.update")).length).toBeGreaterThan(0);
  });

  it("saves held at, claim deadline, claim contact and progress, stamping resolved_at", async () => {
    const found = await t.foundItem();
    const contact = { label: { th: "เคาน์เตอร์", en: "Desk" }, channel: "inPerson" as const, value: "Student centre" };
    await updateListingDetailsForCase(
      t.db,
      found.caseId,
      { heldAt: { th: "", en: "Desk shelf" }, claimBy: "2026-12-01", claimContact: contact, registerStatus: "returned" },
      contentActorOf(t.officer),
      NOW,
    );
    expect(await getListingForCase(t.db, found.caseId)).toMatchObject({ heldAt: { th: "", en: "Desk shelf" }, claimBy: "2026-12-01", claimContact: contact, registerStatus: "returned" });
    const [row] = await t.db.select({ resolvedAt: lostFoundItems.resolvedAt }).from(lostFoundItems).where(eq(lostFoundItems.caseId, found.caseId));
    expect(row!.resolvedAt).toEqual(NOW);
  });

  it("reports false for a case with no listing", async () => {
    const none = "00000000-0000-4000-8000-000000000000";
    expect(await updateListingDetailsForCase(t.db, none, { heldAt: { th: "", en: "" }, claimBy: null, claimContact: null, registerStatus: "open" }, contentActorOf(t.officer), NOW)).toBe(false);
    expect(await unpublishListingForCase(t.db, none, contentActorOf(t.officer), NOW)).toBe(false);
  });

  it("removes one picture and keeps the others in order", async () => {
    const found = await t.foundItem();
    const listing = (await getListingForCase(t.db, found.caseId))!;
    const ids: string[] = [];
    for (const n of [1, 2, 3]) {
      const [image] = await t.db.insert(images).values({ storageKey: `lf-${found.caseId}-${n}.jpg`, altTh: "รูป", altEn: "Picture", isDecorative: false } as typeof images.$inferInsert).returning({ id: images.id });
      ids.push(image!.id);
      await appendListingPhoto(t.db, listing.id, image!.id);
    }
    await removeListingPhoto(t.db, found.caseId, ids[1]!, contentActorOf(t.officer), NOW);
    expect(await listListingPhotos(t.db, found.caseId)).toEqual([ids[0], ids[2]]);
    const rows = await t.db.select().from(lostFoundItemPhotos).where(eq(lostFoundItemPhotos.itemId, listing.id));
    expect(rows.map((r) => r.position).sort()).toEqual([0, 1]);
  });
});
