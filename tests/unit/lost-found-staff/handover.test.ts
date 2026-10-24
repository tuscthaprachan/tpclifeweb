import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { readContacts } from "@/lib/cases";
import { caseContacts, cases } from "@/lib/db/schema";
import { ID_CHECK_TYPES, lostFoundCaseLinks, lostFoundHandovers } from "@/lib/db/schema/lost-found-staff";
import { createClaim, decideClaim } from "@/lib/lost-found/claims";
import { getHandover, recordHandover } from "@/lib/lost-found/handover";
import { getListingForCase } from "@/lib/lost-found/listing";
import { markPossibleMatch } from "@/lib/lost-found/links";
import { lfSetup } from "./helpers";

vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));

let t: Awaited<ReturnType<typeof lfSetup>>;
beforeAll(async () => {
  t = await lfSetup();
}, 60_000);

/** A matched pair with an accepted claim, so both cases wait to be collected. */
async function ready() {
  const lost = await t.lostReport();
  const found = await t.foundItem(t.officer, {}, { publish: true });
  await markPossibleMatch(t.db, { lostCaseId: lost.caseId, foundCaseId: found.caseId }, t.officer);
  const claimId = await createClaim(t.db, { foundCaseId: found.caseId, lostCaseId: lost.caseId, answer: "ok", claimant: { name: "SECRET-CLAIMANT" } }, t.officer);
  await decideClaim(t.db, { claimId, decision: "accepted" }, t.officer);
  return { lost, found };
}

const input = (foundCaseId: string, extra: Record<string, unknown> = {}) => ({
  foundCaseId,
  collectedByName: "Somchai Jaidee",
  idCheckType: "student_card",
  collectedAt: new Date(),
  deskOrganisationId: t.officer.organisationId,
  ...extra,
});

describe("recordHandover", () => {
  it("returns both cases, closes them, and marks both listings returned", async () => {
    const { lost, found } = await ready();
    const at = new Date(Date.now() - 60_000);
    const result = await recordHandover(t.db, input(found.caseId, { collectedAt: at }), t.officer);
    expect(result).toMatchObject({ foundCaseId: found.caseId, lostCaseId: lost.caseId });

    for (const id of [found.caseId, lost.caseId]) {
      const [row] = await t.db.select().from(cases).where(eq(cases.id, id));
      expect(row).toMatchObject({ status: "returned" });
      expect(row!.closedAt).toBeInstanceOf(Date);
      expect(row!.piiDeleteAfter).toBeInstanceOf(Date);
      expect((await getListingForCase(t.db, id))!.registerStatus).toBe("returned");
    }
    const [item] = await t.db.query.lostFoundItems.findMany({ where: (i, { eq: same }) => same(i.caseId, found.caseId), columns: { resolvedAt: true } });
    expect(item!.resolvedAt).toBeInstanceOf(Date);
    expect((await t.db.select().from(lostFoundCaseLinks).where(eq(lostFoundCaseLinks.foundCaseId, found.caseId)))[0]!.status).toBe("confirmed");
    const notes = (await t.events(lost.caseId)).filter((e) => e.type === "internal_note");
    expect(notes.at(-1)!.body).toContain("Returned to the owner");
    expect(notes.at(-1)!.body).toContain("student_card");

    const handover = await getHandover(t.db, found.caseId);
    expect(handover).toMatchObject({ idCheckType: "student_card", deskOrganisationId: t.officer.organisationId, officerUserId: t.officer.userId, lostCaseId: lost.caseId });
    expect(handover!.collectedAt).toEqual(at);
  });

  it("stores the type of ID checked and no ID number, and the collector's name encrypted", async () => {
    const { found } = await ready();
    // The table has no column that could hold an ID number or a picture of the ID.
    await recordHandover(t.db, input(found.caseId, { collectedByName: "Somchai", idCheckType: "national_id" }), t.officer);
    const [row] = await t.db.select().from(lostFoundHandovers).where(eq(lostFoundHandovers.caseId, found.caseId));
    expect(Object.keys(row!).sort()).toEqual(["caseId", "collectedAt", "collectedByContactId", "createdAt", "deskOrganisationId", "id", "idCheckType", "lostCaseId", "officerUserId"]);
    expect(row!.idCheckType).toBe("national_id");
    const contacts = await t.db.select().from(caseContacts).where(eq(caseContacts.caseId, found.caseId));
    expect(JSON.stringify(contacts)).not.toContain("Somchai");
    const audited = JSON.stringify(await t.audits("lost_found.handover"));
    expect(audited).toContain("national_id");
    expect(audited).not.toContain("Somchai");
    const shown = await readContacts(t.db, found.caseId, t.officer);
    expect(shown.some((c) => c.name === "Somchai")).toBe(true);
  });

  it("uses the claimant already on the case when no name is typed", async () => {
    const { found } = await ready();
    const before = (await t.db.select().from(caseContacts).where(eq(caseContacts.caseId, found.caseId))).length;
    await recordHandover(t.db, input(found.caseId, { collectedByName: "" }), t.officer);
    expect(await t.db.select().from(caseContacts).where(eq(caseContacts.caseId, found.caseId))).toHaveLength(before);
    const [row] = await t.db.select().from(lostFoundHandovers).where(eq(lostFoundHandovers.caseId, found.caseId));
    expect(row!.collectedByContactId).not.toBeNull();
  });

  it("records the desk as the organisation acting, and refuses another", async () => {
    const { found } = await ready();
    await expect(recordHandover(t.db, input(found.caseId, { deskOrganisationId: t.orgId("tusc") }), t.officer)).rejects.toMatchObject({ code: "invalid" });
    await recordHandover(t.db, input(found.caseId, { deskOrganisationId: t.other.organisationId }), t.other);
    expect((await getHandover(t.db, found.caseId))!.deskOrganisationId).toBe(t.orgId("tusc"));
    expect((await t.events(found.caseId)).find((e) => e.toStatus === "returned")!.actingOrganisationId).toBe(t.orgId("tusc"));
  });

  it("refuses an unknown ID type, a future time, a missing name and a second handover", async () => {
    const { found } = await ready();
    await expect(recordHandover(t.db, input(found.caseId, { idCheckType: "library_card" }), t.officer)).rejects.toMatchObject({ code: "invalid" });
    await expect(recordHandover(t.db, input(found.caseId, { idCheckType: "" }), t.officer)).rejects.toMatchObject({ code: "invalid" });
    await expect(recordHandover(t.db, input(found.caseId, { collectedAt: new Date(Date.now() + 3_600_000) }), t.officer)).rejects.toMatchObject({ code: "invalid" });
    expect(await t.statusOf(found.caseId)).toBe("ready_to_collect");
    await recordHandover(t.db, input(found.caseId), t.officer);
    await expect(recordHandover(t.db, input(found.caseId), t.officer)).rejects.toMatchObject({ code: "stale" });
    const nameless = await t.foundItem(t.officer, {}, { publish: true });
    await expect(recordHandover(t.db, input(nameless.caseId, { collectedByName: "" }), t.officer)).rejects.toMatchObject({ code: "invalid" });
    expect(await t.statusOf(nameless.caseId)).toBe("listed");
  });

  it("works for an item handed over straight from the list, with no lost report", async () => {
    const found = await t.foundItem(t.officer, {}, { publish: true });
    const result = await recordHandover(t.db, input(found.caseId), t.officer);
    expect(result.lostCaseId).toBeNull();
    expect(await t.statusOf(found.caseId)).toBe("returned");
  });

  it("leaves a withdrawn lost report alone", async () => {
    const { lost, found } = await ready();
    const { transition } = await import("@/lib/cases");
    await transition(t.db, lost.caseId, "withdrawn", t.officer);
    await recordHandover(t.db, input(found.caseId), t.officer);
    expect(await t.statusOf(found.caseId)).toBe("returned");
    expect(await t.statusOf(lost.caseId)).toBe("withdrawn");
  });

  it("is refused for staff outside the service, and changes nothing", async () => {
    const { found } = await ready();
    await expect(recordHandover(t.db, { ...input(found.caseId), deskOrganisationId: t.complaints.organisationId }, t.complaints)).rejects.toMatchObject({ code: "forbidden" });
    expect(await t.statusOf(found.caseId)).toBe("ready_to_collect");
  });

  it("offers exactly the ID types the plan names, none of which is a number", () => {
    expect([...ID_CHECK_TYPES]).toEqual(["student_card", "national_id", "passport", "driving_licence", "other_photo_id"]);
  });
});
