import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { caseContacts, caseEvents, cases, lostFoundItems } from "@/lib/db/schema";
import { lostFoundCaseDetails } from "@/lib/db/schema/lost-found-staff";
import { getCaseDetails, readVerificationDetail, saveStorageLocation, saveVerificationDetail } from "@/lib/lost-found/details";
import { descriptionProblems, intakeProgress, logFoundItem, publishFoundItem, summaryOf } from "@/lib/lost-found/intake";
import { getListingForCase, listingGaps } from "@/lib/lost-found/listing";
import { addPrivatePhoto, listPrivatePhotos } from "@/lib/lost-found/photos";
import { createMemoryStorage } from "@/lib/storage";
import { KEYS, lfSetup, NOW } from "./helpers";

vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));

let t: Awaited<ReturnType<typeof lfSetup>>;
beforeAll(async () => {
  t = await lfSetup();
}, 60_000);

const DETAIL = "SECRET-DETAIL-charm-shaped-like-a-fox";

describe("logFoundItem", () => {
  it("creates a logged found case and a linked draft listing that share the reference", async () => {
    const logged = await logFoundItem(t.db, KEYS, t.officer, { now: NOW });
    const [row] = await t.db.select().from(cases).where(eq(cases.id, logged.caseId));
    expect(row).toMatchObject({ service: "lost_found", kind: "found", status: "logged", reference: logged.reference, owningOrganisationId: t.officer.organisationId });
    const [listing] = await t.db.select().from(lostFoundItems).where(eq(lostFoundItems.caseId, logged.caseId));
    expect(listing).toMatchObject({ reference: logged.reference, slug: logged.reference.toLowerCase(), kind: "found", status: "draft", titleEn: "Red keyring", titleTh: "พวงกุญแจสีแดง", submittedByStudent: false });
    expect(listing!.submitterContact).toBeNull();
    expect(listing!.staffVerificationDetail).toBeNull();
    const [details] = await t.db.select().from(lostFoundCaseDetails).where(eq(lostFoundCaseDetails.caseId, logged.caseId));
    expect(details).toMatchObject({ storageOrganisationId: t.officer.organisationId, storageShelf: null, verificationDetailEnc: null });
    // The listing and the case share one number, so there is one reference at the desk and online.
    expect(logged.reference).toMatch(/^LF-2026-\d{4}$/);
  });

  it("accepts either language first and refuses when neither is given", async () => {
    const thaiOnly = await logFoundItem(t.db, { ...KEYS, title: { th: "กุญแจ", en: "" }, description: { th: "สีแดง", en: "" } }, t.officer, { now: NOW });
    const listing = (await getListingForCase(t.db, thaiOnly.caseId))!;
    expect(listingGaps(listing)).toEqual(["title_en", "description_en"]);
    expect(descriptionProblems({ ...KEYS, title: { th: "", en: "" }, description: { th: "", en: "" }, locationNote: { th: "", en: "" }, placeId: null })).toEqual(["title", "description", "location"]);
    await expect(logFoundItem(t.db, { ...KEYS, title: { th: "", en: "" } }, t.officer, { now: NOW })).rejects.toMatchObject({ code: "invalid" });
  });

  it("is refused for staff without a lost and found role, leaving nothing behind", async () => {
    const before = await t.db.select().from(cases);
    await expect(logFoundItem(t.db, KEYS, t.complaints, { now: NOW })).rejects.toMatchObject({ code: "forbidden" });
    expect(await t.db.select().from(cases)).toHaveLength(before.length);
  });

  it("builds an inbox summary with no personal data", () => {
    // The category is named as the public side names it, in the staff member's language.
    expect(summaryOf("keys", { th: "ก", en: "Red keyring" })).toBe("Keys: Red keyring");
    expect(summaryOf("wallet", { th: "กระเป๋าสตางค์หนังสีดำ", en: "Black leather wallet" })).toBe("Wallet or purse: Black leather wallet");
    expect(summaryOf("wallet", { th: "กระเป๋าสตางค์หนังสีดำ", en: "Black leather wallet" }, "th")).toBe("กระเป๋าสตางค์: กระเป๋าสตางค์หนังสีดำ");
    // The other language fills in for an empty one.
    expect(summaryOf("keys", { th: "", en: "Red keyring" }, "th")).toMatch(/: Red keyring$/);
    // Never the raw category key.
    expect(summaryOf("wallet", { th: "", en: "x" })).not.toContain("wallet:");
  });
});

describe("storage and the hidden verification detail", () => {
  it("records the desk and shelf, and the desk becomes the owning organisation and the public held-at line", async () => {
    const logged = await logFoundItem(t.db, KEYS, t.officer, { now: NOW });
    await saveStorageLocation(t.db, logged.caseId, { organisationId: t.orgId("tusc"), shelf: "Shelf B, box 3" }, t.officer, { now: NOW });
    expect(await getCaseDetails(t.db, logged.caseId)).toMatchObject({ storageOrganisationId: t.orgId("tusc"), storageShelf: "Shelf B, box 3" });
    const [row] = await t.db.select().from(cases).where(eq(cases.id, logged.caseId));
    expect(row!.owningOrganisationId).toBe(t.orgId("tusc"));
    const listing = (await getListingForCase(t.db, logged.caseId))!;
    expect(listing.heldAt.en).toMatch(/desk$/);
    expect(listing.heldAt.en + listing.heldAt.th).not.toContain("Shelf");
  });

  it("stores the detail encrypted, never in plaintext, and decrypts it only through a logged read", async () => {
    const logged = await logFoundItem(t.db, KEYS, t.officer, { now: NOW });
    await saveVerificationDetail(t.db, logged.caseId, DETAIL, t.officer, { now: NOW });

    const [stored] = await t.db.select().from(lostFoundCaseDetails).where(eq(lostFoundCaseDetails.caseId, logged.caseId));
    expect(stored!.verificationDetailEnc).toMatch(/^pii1\./);
    expect(JSON.stringify(stored)).not.toContain("SECRET-DETAIL");
    // Nowhere else: not on the listing, not in the audit log, not in the timeline.
    const everything = JSON.stringify([await t.db.select().from(lostFoundItems), await t.db.select().from(caseEvents), await t.audits("lost_found.verification_set")]);
    expect(everything).not.toContain("SECRET-DETAIL");
    expect(await getCaseDetails(t.db, logged.caseId)).toMatchObject({ hasVerificationDetail: true });

    const before = (await t.events(logged.caseId)).filter((e) => e.type === "verification_viewed").length;
    const shown = await readVerificationDetail(t.db, logged.caseId, t.officer, { now: NOW });
    expect(shown).toBe(DETAIL);
    const views = (await t.events(logged.caseId)).filter((e) => e.type === "verification_viewed");
    expect(views).toHaveLength(before + 1);
    expect(views.at(-1)).toMatchObject({ actorUserId: t.officer.userId, visibility: "internal" });
    const audited = await t.audits("lost_found.verification_view");
    expect(audited.at(-1)).toMatchObject({ entityId: logged.caseId, actorUserId: t.officer.userId });
    expect(JSON.stringify(audited)).not.toContain("SECRET-DETAIL");
  });

  it("reads null and logs nothing when there is no detail", async () => {
    const logged = await logFoundItem(t.db, KEYS, t.officer, { now: NOW });
    expect(await readVerificationDetail(t.db, logged.caseId, t.officer)).toBeNull();
    expect((await t.events(logged.caseId)).some((e) => e.type === "verification_viewed")).toBe(false);
  });

  it("will not show the detail to staff outside the service, and a replaced detail is the one shown", async () => {
    const logged = await logFoundItem(t.db, KEYS, t.officer, { now: NOW });
    await saveVerificationDetail(t.db, logged.caseId, "old", t.officer);
    await saveVerificationDetail(t.db, logged.caseId, "new", t.other);
    await expect(readVerificationDetail(t.db, logged.caseId, t.complaints)).rejects.toMatchObject({ code: "forbidden" });
    expect(await readVerificationDetail(t.db, logged.caseId, t.officer)).toBe("new");
  });

  it("refuses an empty detail or shelf", async () => {
    const logged = await logFoundItem(t.db, KEYS, t.officer, { now: NOW });
    await expect(saveVerificationDetail(t.db, logged.caseId, "   ", t.officer)).rejects.toMatchObject({ code: "invalid" });
    await expect(saveStorageLocation(t.db, logged.caseId, { organisationId: t.officer.organisationId, shelf: "" }, t.officer)).rejects.toMatchObject({ code: "invalid" });
  });
});

describe("publishFoundItem", () => {
  it("needs both languages and a place; storage and the hidden detail only warn", async () => {
    const logged = await logFoundItem(t.db, KEYS, t.officer, { now: NOW });
    const before = await intakeProgress(t.db, logged.caseId, false);
    expect(before).toMatchObject({ canPublish: true, storageDone: false, verificationDone: false, warnings: ["storage", "verification"], listingStatus: "draft" });

    expect(await publishFoundItem(t.db, logged.caseId, t.officer, { now: NOW })).toEqual(["storage", "verification"]);
    expect(await t.statusOf(logged.caseId)).toBe("listed");
    const listing = (await getListingForCase(t.db, logged.caseId))!;
    expect(listing).toMatchObject({ status: "published" });
    expect(listing.publishedAt).toEqual(NOW);
    expect((await t.events(logged.caseId)).find((e) => e.toStatus === "listed")?.visibility).toBe("public");
  });

  it("reports only what is still missing, and nothing when both are recorded", async () => {
    const half = await logFoundItem(t.db, KEYS, t.officer, { now: NOW });
    await saveStorageLocation(t.db, half.caseId, { organisationId: t.officer.organisationId, shelf: "A1" }, t.officer);
    expect((await intakeProgress(t.db, half.caseId, false)).warnings).toEqual(["verification"]);
    expect(await publishFoundItem(t.db, half.caseId, t.officer, { now: NOW })).toEqual(["verification"]);

    const full = await logFoundItem(t.db, KEYS, t.officer, { now: NOW });
    await saveStorageLocation(t.db, full.caseId, { organisationId: t.officer.organisationId, shelf: "A1" }, t.officer);
    await saveVerificationDetail(t.db, full.caseId, DETAIL, t.officer);
    expect((await intakeProgress(t.db, full.caseId, false)).warnings).toEqual([]);
    expect(await publishFoundItem(t.db, full.caseId, t.officer, { now: NOW })).toEqual([]);
  });

  it("still refuses without a place or a note about where", async () => {
    const logged = await logFoundItem(t.db, KEYS, t.officer, { now: NOW });
    await t.db.update(lostFoundItems).set({ placeId: null, locationNoteTh: null, locationNoteEn: null }).where(eq(lostFoundItems.caseId, logged.caseId));
    expect((await intakeProgress(t.db, logged.caseId, false)).gaps).toEqual(["location"]);
    await expect(publishFoundItem(t.db, logged.caseId, t.officer)).rejects.toMatchObject({ name: "ListingIncompleteError", gaps: ["location"] });
    expect(await t.statusOf(logged.caseId)).toBe("logged");
  });

  it("refuses, and changes nothing, when a language is missing", async () => {
    const logged = await logFoundItem(t.db, { ...KEYS, title: { th: "กุญแจ", en: "" } }, t.officer, { now: NOW });
    await saveStorageLocation(t.db, logged.caseId, { organisationId: t.officer.organisationId, shelf: "A1" }, t.officer);
    await saveVerificationDetail(t.db, logged.caseId, DETAIL, t.officer);
    expect((await intakeProgress(t.db, logged.caseId, false)).canPublish).toBe(false);
    await expect(publishFoundItem(t.db, logged.caseId, t.officer)).rejects.toMatchObject({ name: "ListingIncompleteError" });
    expect(await t.statusOf(logged.caseId)).toBe("logged");
    expect((await getListingForCase(t.db, logged.caseId))!.status).toBe("draft");
  });
});

describe("private photos and the finder", () => {
  it("stores a photo privately for the case and shows it by signed link", async () => {
    const logged = await logFoundItem(t.db, KEYS, t.officer, { now: NOW });
    const storage = createMemoryStorage();
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
    const added = await addPrivatePhoto(t.db, logged.caseId, { bytes: jpeg, declaredType: "image/jpeg" }, t.officer, { storage: () => storage, now: NOW });
    expect(added.ok).toBe(true);
    if (added.ok) expect(added.storageKey).toMatch(/^lf\/items\/[0-9a-f-]+\.jpg$/);
    const photos = await listPrivatePhotos(t.db, logged.caseId, () => storage);
    expect(photos).toHaveLength(1);
    expect(photos[0]!.url).toBeTruthy();
    expect((await t.events(logged.caseId)).some((e) => e.type === "attachment_added")).toBe(true);
  });

  it("refuses a file that is not a picture", async () => {
    const logged = await logFoundItem(t.db, KEYS, t.officer, { now: NOW });
    const result = await addPrivatePhoto(t.db, logged.caseId, { bytes: new TextEncoder().encode("<script>alert(1)</script>"), declaredType: "image/jpeg" }, t.officer, { storage: () => createMemoryStorage() });
    expect(result).toEqual({ ok: false, reason: "unsupported_type" });
  });

  it("keeps the finder's details encrypted on the case", async () => {
    const logged = await logFoundItem(t.db, KEYS, t.officer, { now: NOW });
    const { addContact } = await import("@/lib/cases");
    await addContact(t.db, logged.caseId, { role: "finder", name: "SECRET-FINDER", phone: "0899999999", consentContact: true }, t.officer);
    const rows = await t.db.select().from(caseContacts).where(eq(caseContacts.caseId, logged.caseId));
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain("SECRET-FINDER");
    expect(JSON.stringify(rows)).not.toContain("0899999999");
    expect((await intakeProgress(t.db, logged.caseId, true)).finderDone).toBe(true);
  });
});
