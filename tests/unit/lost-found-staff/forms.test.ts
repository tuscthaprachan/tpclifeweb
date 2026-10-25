import { describe, expect, it } from "vitest";
import { parseClaim, parseContactFields, parseDescription, parseHandover, parseRejection, parseStorage, parseVerification, parseWalkIn } from "@/lib/lost-found/forms";

const form = (entries: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
};
const NOW = new Date("2026-10-24T05:00:00Z");
const ITEM = { category: "keys", "title.en": "Red keyring", "description.th": "กุญแจ", "locationNote.en": "Library", occurredOn: "2026-10-20" };

describe("parseDescription", () => {
  it("accepts either language first", () => {
    const parsed = parseDescription(form(ITEM), "en", NOW);
    expect(parsed).toMatchObject({ ok: true, data: { category: "keys", title: { th: "", en: "Red keyring" }, description: { th: "กุญแจ", en: "" }, occurredOn: "2026-10-20" } });
  });
  it("needs a title, a description, a category, a date and a place or note", () => {
    const parsed = parseDescription(form({}), "en", NOW);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(Object.keys(parsed.errors).sort()).toEqual(["category", "description.th", "occurredOn", "placeId", "title.th"]);
  });
  it("refuses a date in the future, in the staff member's language", () => {
    const en = parseDescription(form({ ...ITEM, occurredOn: "2026-10-30" }), "en", NOW);
    const th = parseDescription(form({ ...ITEM, occurredOn: "2026-10-30" }), "th", NOW);
    expect(en).toMatchObject({ ok: false, errors: { occurredOn: "Enter a date that is today or earlier" } });
    expect(th.ok || th.errors.occurredOn).toContain("วันที่");
  });
});

describe("parseWalkIn", () => {
  const person = { language: "th", "contact.name": "Somchai", "contact.email": "s@example.test", "contact.preferred": "email", "contact.consentContact": "on" };
  it("reads the person and the item", () => {
    const parsed = parseWalkIn(form({ ...ITEM, ...person }), "en", NOW);
    expect(parsed).toMatchObject({ ok: true, data: { locale: "th", contact: { name: "Somchai", email: "s@example.test", phone: null, preferredContact: "email", consentContact: true, consentShare: false } } });
  });
  it("needs a name and one way to reach them, a valid email, and a preferred method they gave", () => {
    expect(parseWalkIn(form({ ...ITEM, language: "en" }), "en", NOW)).toMatchObject({ ok: false, errors: { "contact.name": expect.any(String), "contact.email": expect.any(String) } });
    expect(parseWalkIn(form({ ...ITEM, ...person, "contact.email": "nope" }), "en", NOW)).toMatchObject({ ok: false, errors: { "contact.email": expect.stringContaining("email address") } });
    expect(parseWalkIn(form({ ...ITEM, ...person, "contact.preferred": "phone" }), "en", NOW)).toMatchObject({ ok: false, errors: { "contact.preferred": expect.any(String) } });
  });
});

describe("the small forms", () => {
  it("storage needs a desk and a shelf", () => {
    expect(parseStorage(form({ organisationId: "2", shelf: " A1 " }), "en")).toEqual({ ok: true, data: { organisationId: 2, shelf: "A1" } });
    expect(parseStorage(form({ organisationId: "", shelf: "" }), "en").ok).toBe(false);
  });
  it("the hidden detail is required and limited", () => {
    expect(parseVerification(form({ detail: "scratch" }), "en")).toEqual({ ok: true, data: { detail: "scratch" } });
    expect(parseVerification(form({ detail: "" }), "en").ok).toBe(false);
    expect(parseVerification(form({ detail: "x".repeat(2001) }), "en").ok).toBe(false);
  });
  it("a claim needs the answer and a named claimant with some contact", () => {
    expect(parseClaim(form({ answer: "a fox charm", "claimant.name": "A", "claimant.phone": "081" }), "en")).toMatchObject({ ok: true, data: { answer: "a fox charm", claimant: { name: "A", phone: "081" } } });
    expect(parseClaim(form({ answer: "", "claimant.name": "" }), "en")).toMatchObject({ ok: false, errors: { answer: expect.any(String) } });
  });
  it("the finder is optional detail but must be a real address", () => {
    expect(parseContactFields(form({ "finder.email": "bad" }), "en", "finder")).toMatchObject({ ok: false });
    expect(parseContactFields(form({}), "en", "finder")).toMatchObject({ ok: false });
  });
  it("a rejection needs both languages", () => {
    expect(parseRejection(form({ "message.th": "ขออภัย", "message.en": "Sorry" }), "en")).toEqual({ ok: true, data: { th: "ขออภัย", en: "Sorry" } });
    expect(parseRejection(form({ "message.th": "ขออภัย" }), "en").ok).toBe(false);
  });
  it("a handover needs the ID type, the time and the desk, and has no field for an ID number", () => {
    const ok = parseHandover(form({ idCheckType: "student_card", collectedAt: "2026-10-24T10:30", deskOrganisationId: "1", collectedByName: "S", idNumber: "1103700123456" }), "en", NOW);
    expect(ok).toMatchObject({ ok: true, data: { idCheckType: "student_card", deskOrganisationId: 1, collectedByName: "S" } });
    expect(JSON.stringify(ok)).not.toContain("1103700123456");
    expect(parseHandover(form({ idCheckType: "library_card", collectedAt: "2026-10-24T10:30", deskOrganisationId: "1" }), "en", NOW).ok).toBe(false);
    expect(parseHandover(form({ idCheckType: "passport", collectedAt: "2026-10-25T10:30", deskOrganisationId: "1" }), "en", NOW)).toMatchObject({ ok: false, errors: { collectedAt: expect.any(String) } });
  });
});
