import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { lostFoundItems } from "@/lib/db/schema";
import { auditedLostFoundItems, saveLostFoundItem } from "@/app/admin/content/lost-and-found/service";
import { validateLostFoundForm } from "@/app/admin/content/lost-and-found/validate";
import { lfSetup, KEYS } from "./helpers";

vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));

let t: Awaited<ReturnType<typeof lfSetup>>;
beforeAll(async () => {
  t = await lfSetup();
}, 60_000);

const LEGACY_CONTACT = "LEGACY-CONTACT-0812345678";
const LEGACY_DETAIL = "LEGACY-DETAIL-scratch";
const actor = () => ({ userId: t.officer.userId, context: { actorUserId: t.officer.userId } });

const BASE: Record<string, string> = {
  kind: "found",
  "title.th": "กุญแจ",
  "title.en": "Keys",
  "description.th": "พวงกุญแจ",
  "description.en": "A keyring",
  category: "keys",
  "locationNote.th": "ห้องสมุด",
  "locationNote.en": "Library",
  occurredOn: "2026-10-20",
  registerStatus: "open",
  owner: "tusc",
};
async function validated(extra: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...BASE, intent: "save", ...extra })) fd.append(k, v);
  const result = await validateLostFoundForm(t.db, { locale: "en", formData: fd });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result;
}

describe("the listing editor and private fields", () => {
  it("still saves the two private fields for a legacy listing, when the form sends them", async () => {
    const v = await validated({ submitterContact: LEGACY_CONTACT, staffVerificationDetail: LEGACY_DETAIL });
    expect(v.data.privateIncluded).toBe(true);
    const saved = await saveLostFoundItem(t.db, { actor: actor(), status: v.status, data: v.data });
    const [row] = await t.db.select().from(lostFoundItems).where(eq(lostFoundItems.id, saved.id));
    expect(row).toMatchObject({ submitterContact: LEGACY_CONTACT, staffVerificationDetail: LEGACY_DETAIL, caseId: null });
  });

  it("leaves a legacy listing's private fields exactly as stored when the form does not send them", async () => {
    const first = await validated({ submitterContact: LEGACY_CONTACT, staffVerificationDetail: LEGACY_DETAIL });
    const saved = await saveLostFoundItem(t.db, { actor: actor(), status: first.status, data: first.data });
    const edit = await validated({ "title.en": "Keys (edited)" });
    expect(edit.data.privateIncluded).toBe(false);
    await saveLostFoundItem(t.db, { actor: actor(), id: saved.id, status: edit.status, data: edit.data });
    const [row] = await t.db.select().from(lostFoundItems).where(eq(lostFoundItems.id, saved.id));
    expect(row).toMatchObject({ titleEn: "Keys (edited)", submitterContact: LEGACY_CONTACT, staffVerificationDetail: LEGACY_DETAIL });
  });

  it("a new listing from the editor, sent without the fields, holds no contact at all", async () => {
    const v = await validated({});
    const saved = await saveLostFoundItem(t.db, { actor: actor(), status: v.status, data: v.data });
    const [row] = await t.db.select().from(lostFoundItems).where(eq(lostFoundItems.id, saved.id));
    expect(row).toMatchObject({ submitterContact: null, staffVerificationDetail: null, caseId: null });
  });

  it("editing a listing that belongs to a case keeps its case link and never writes private fields", async () => {
    const found = await t.foundItem(t.officer, KEYS);
    const [item] = await t.db.select().from(lostFoundItems).where(eq(lostFoundItems.caseId, found.caseId));
    const edit = await validated({ "title.en": "Edited in the editor" });
    await saveLostFoundItem(t.db, { actor: actor(), id: item!.id, status: edit.status, data: edit.data });
    const [after] = await t.db.select().from(lostFoundItems).where(eq(lostFoundItems.id, item!.id));
    expect(after).toMatchObject({ caseId: found.caseId, reference: found.reference, titleEn: "Edited in the editor", submitterContact: null, staffVerificationDetail: null });
  });

  it("the audit view of the table carries the case id but neither private column", () => {
    const columns = Object.keys(auditedLostFoundItems);
    expect(columns).toContain("caseId");
    expect(columns).not.toContain("submitterContact");
    expect(columns).not.toContain("staffVerificationDetail");
  });
});
