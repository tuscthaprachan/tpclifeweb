import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { publicTimeline, readContacts } from "@/lib/cases";
import { caseContacts } from "@/lib/db/schema";
import { lostFoundCaseLinks, lostFoundClaims } from "@/lib/db/schema/lost-found-staff";
import { createClaim, DEFAULT_REJECT_MESSAGE, decideClaim, listClaims, readClaimAnswer } from "@/lib/lost-found/claims";
import { getListingForCase } from "@/lib/lost-found/listing";
import { linkedCases, markPossibleMatch } from "@/lib/lost-found/links";
import { lfSetup, NOW } from "./helpers";

vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));

let t: Awaited<ReturnType<typeof lfSetup>>;
beforeAll(async () => {
  t = await lfSetup();
}, 60_000);

const ANSWER = "SECRET-ANSWER-blue-bottle-opener";

async function pair() {
  const lost = await t.lostReport();
  const found = await t.foundItem(t.officer, {}, { publish: true });
  return { lost, found };
}

describe("markPossibleMatch", () => {
  it("links the cases, moves both through their state machines and notes both", async () => {
    const { lost, found } = await pair();
    const result = await markPossibleMatch(t.db, { lostCaseId: lost.caseId, foundCaseId: found.caseId, score: 87 }, t.officer);
    expect(result).toMatchObject({ lostStatus: "match_found", foundStatus: "claim_pending" });
    expect(await t.statusOf(lost.caseId)).toBe("match_found");
    expect(await t.statusOf(found.caseId)).toBe("claim_pending");

    const [link] = await t.db.select().from(lostFoundCaseLinks).where(eq(lostFoundCaseLinks.lostCaseId, lost.caseId));
    expect(link).toMatchObject({ foundCaseId: found.caseId, status: "possible", score: 87, createdBy: t.officer.userId });

    const lostNotes = (await t.events(lost.caseId)).filter((e) => e.type === "internal_note");
    const foundNotes = (await t.events(found.caseId)).filter((e) => e.type === "internal_note");
    expect(lostNotes.at(-1)!.body).toContain(found.reference);
    expect(foundNotes.at(-1)!.body).toContain(lost.reference);
    expect(lostNotes.at(-1)!.visibility).toBe("internal");
    // The lost reporter's tracking page shows the new status.
    expect((await publicTimeline(t.db, lost.caseId)).at(-1)!.title.en).toBe("We may have found it");
    expect((await getListingForCase(t.db, found.caseId))!.registerStatus).toBe("matched");
    expect((await getListingForCase(t.db, lost.caseId))!.registerStatus).toBe("matched");
    expect(await linkedCases(t.db, lost.caseId, "lost")).toEqual([{ linkId: link!.id, caseId: found.caseId, status: "possible", score: 87 }]);
  });

  it("refuses to link the same pair twice, and a pair of the wrong kinds", async () => {
    const { lost, found } = await pair();
    await markPossibleMatch(t.db, { lostCaseId: lost.caseId, foundCaseId: found.caseId }, t.officer);
    await expect(markPossibleMatch(t.db, { lostCaseId: lost.caseId, foundCaseId: found.caseId }, t.officer)).rejects.toMatchObject({ code: "invalid" });
    await expect(markPossibleMatch(t.db, { lostCaseId: found.caseId, foundCaseId: lost.caseId }, t.officer)).rejects.toMatchObject({ code: "invalid" });
  });

  it("refuses, changing nothing, when one side has moved on", async () => {
    const { lost, found } = await pair();
    const { transition } = await import("@/lib/cases");
    await transition(t.db, lost.caseId, "withdrawn", t.officer);
    await expect(markPossibleMatch(t.db, { lostCaseId: lost.caseId, foundCaseId: found.caseId }, t.officer)).rejects.toMatchObject({ code: "invalid_transition" });
    expect(await t.statusOf(found.caseId)).toBe("listed");
    expect(await t.db.select().from(lostFoundCaseLinks).where(eq(lostFoundCaseLinks.foundCaseId, found.caseId))).toHaveLength(0);
  });

  it("takes a found item straight from logged to claim_pending without listing it", async () => {
    const lost = await t.lostReport();
    const found = await t.foundItem(); // logged, not published
    await markPossibleMatch(t.db, { lostCaseId: lost.caseId, foundCaseId: found.caseId }, t.officer);
    expect(await t.statusOf(found.caseId)).toBe("claim_pending");
    expect((await t.events(found.caseId)).some((e) => e.toStatus === "listed")).toBe(false);
  });

  it("is refused for staff outside the service", async () => {
    const { lost, found } = await pair();
    await expect(markPossibleMatch(t.db, { lostCaseId: lost.caseId, foundCaseId: found.caseId }, t.complaints)).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("claims", () => {
  it("stores the claimant's answer encrypted and shows it only through a logged read", async () => {
    const found = await t.foundItem(t.officer, {}, { publish: true });
    const claimId = await createClaim(t.db, { foundCaseId: found.caseId, answer: ANSWER, claimant: { name: "SECRET-CLAIMANT", phone: "0811111111", consentContact: true } }, t.officer, { now: NOW });

    const [row] = await t.db.select().from(lostFoundClaims).where(eq(lostFoundClaims.id, claimId));
    expect(row!.answerEnc).toMatch(/^pii1\./);
    expect(JSON.stringify(row)).not.toContain("SECRET-ANSWER");
    const contacts = await t.db.select().from(caseContacts).where(and(eq(caseContacts.caseId, found.caseId), eq(caseContacts.role, "claimant")));
    expect(contacts).toHaveLength(1);
    expect(JSON.stringify(contacts)).not.toContain("SECRET-CLAIMANT");
    expect(await listClaims(t.db, found.caseId)).toMatchObject([{ id: claimId, decision: null, hasAnswer: true, hasContact: true }]);
    expect(JSON.stringify(await listClaims(t.db, found.caseId))).not.toContain("SECRET");

    expect((await t.events(found.caseId)).filter((e) => e.type === "claim_viewed")).toHaveLength(0);
    expect(await readClaimAnswer(t.db, claimId, t.officer, { now: NOW })).toBe(ANSWER);
    const views = (await t.events(found.caseId)).filter((e) => e.type === "claim_viewed");
    expect(views).toHaveLength(1);
    expect(views[0]).toMatchObject({ actorUserId: t.officer.userId, metadata: { claimId } });
    const audited = await t.audits("lost_found.claim_view");
    expect(audited.at(-1)).toMatchObject({ entityId: found.caseId, actorUserId: t.officer.userId });
    expect(JSON.stringify(audited)).not.toContain("SECRET-ANSWER");
    await expect(readClaimAnswer(t.db, claimId, t.complaints)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("accepts a public claim, which leaves the status alone until an officer reviews it", async () => {
    const found = await t.foundItem(t.officer, {}, { publish: true });
    await createClaim(t.db, { foundCaseId: found.caseId, answer: ANSWER, claimant: { name: "A", email: "a@example.test" } }, { kind: "public" });
    expect(await t.statusOf(found.caseId)).toBe("listed");
    await expect(createClaim(t.db, { foundCaseId: found.caseId, answer: "", claimant: { name: "A" } }, { kind: "public" })).rejects.toMatchObject({ code: "invalid" });
  });

  it("accept: found item and lost report become ready to collect, and the link is confirmed", async () => {
    const { lost, found } = await pair();
    await markPossibleMatch(t.db, { lostCaseId: lost.caseId, foundCaseId: found.caseId }, t.officer);
    const claimId = await createClaim(t.db, { foundCaseId: found.caseId, lostCaseId: lost.caseId, answer: ANSWER, claimant: { name: "Somchai" } }, t.officer);
    const result = await decideClaim(t.db, { claimId, decision: "accepted" }, t.other, { now: NOW });
    expect(result).toMatchObject({ foundStatus: "ready_to_collect", lostStatus: "ready_to_collect" });
    expect(await t.statusOf(found.caseId)).toBe("ready_to_collect");
    expect(await t.statusOf(lost.caseId)).toBe("ready_to_collect");
    const [claim] = await t.db.select().from(lostFoundClaims).where(eq(lostFoundClaims.id, claimId));
    expect(claim).toMatchObject({ decision: "accepted", decidedBy: t.other.userId, decidedAt: NOW });
    expect((await linkedCases(t.db, found.caseId, "found"))[0]!.status).toBe("confirmed");
    // The deciding officer's organisation is the one recorded.
    expect((await t.events(found.caseId)).find((e) => e.toStatus === "ready_to_collect")!.actingOrganisationId).toBe(t.other.organisationId);
    await expect(decideClaim(t.db, { claimId, decision: "rejected", message: DEFAULT_REJECT_MESSAGE }, t.officer)).rejects.toMatchObject({ code: "stale" });
  });

  it("accept works for a claim at the desk with no lost report", async () => {
    const found = await t.foundItem(t.officer, {}, { publish: true });
    const claimId = await createClaim(t.db, { foundCaseId: found.caseId, answer: ANSWER, claimant: { name: "Walk-in" } }, t.officer);
    const result = await decideClaim(t.db, { claimId, decision: "accepted" }, t.officer);
    expect(result).toMatchObject({ foundStatus: "ready_to_collect", lostCaseId: null, lostStatus: null });
  });

  it("reject: the item goes back to listed with a public message, the report goes back to searching and the link is dismissed", async () => {
    const { lost, found } = await pair();
    await markPossibleMatch(t.db, { lostCaseId: lost.caseId, foundCaseId: found.caseId }, t.officer);
    const claimId = await createClaim(t.db, { foundCaseId: found.caseId, lostCaseId: lost.caseId, answer: "a guess", claimant: { name: "Somchai" } }, t.officer);
    const result = await decideClaim(t.db, { claimId, decision: "rejected", message: DEFAULT_REJECT_MESSAGE }, t.officer);
    expect(result).toMatchObject({ foundStatus: "listed", lostStatus: "searching" });
    expect(await t.statusOf(found.caseId)).toBe("listed");
    expect(await t.statusOf(lost.caseId)).toBe("searching");
    const foundPublic = await publicTimeline(t.db, found.caseId);
    expect(foundPublic.at(-1)!.body).toEqual(DEFAULT_REJECT_MESSAGE);
    expect((await publicTimeline(t.db, lost.caseId)).at(-1)!.body).toEqual(DEFAULT_REJECT_MESSAGE);
    expect((await linkedCases(t.db, found.caseId, "found"))[0]!.status).toBe("dismissed");
    expect((await getListingForCase(t.db, found.caseId))!.registerStatus).toBe("open");
    expect((await getListingForCase(t.db, lost.caseId))!.registerStatus).toBe("open");
    // The dismissed pair can be linked again.
    await markPossibleMatch(t.db, { lostCaseId: lost.caseId, foundCaseId: found.caseId }, t.officer);
    expect((await linkedCases(t.db, found.caseId, "found"))[0]!.status).toBe("possible");
  });

  it("reject needs a polite message in both languages and keeps the item pending while another claim waits", async () => {
    const found = await t.foundItem(t.officer, {}, { publish: true });
    const first = await createClaim(t.db, { foundCaseId: found.caseId, answer: "one", claimant: { name: "One" } }, t.officer);
    await createClaim(t.db, { foundCaseId: found.caseId, answer: "two", claimant: { name: "Two" } }, t.officer);
    await expect(decideClaim(t.db, { claimId: first, decision: "rejected", message: { th: "", en: "No" } }, t.officer)).rejects.toMatchObject({ code: "invalid" });
    // Moving to claim_pending is the officer's step; do it as the review would.
    const { transition } = await import("@/lib/cases");
    await transition(t.db, found.caseId, "claim_pending", t.officer);
    const result = await decideClaim(t.db, { claimId: first, decision: "rejected", message: DEFAULT_REJECT_MESSAGE }, t.officer);
    expect(result.foundStatus).toBe("claim_pending");
    expect(await t.statusOf(found.caseId)).toBe("claim_pending");
  });

  it("deciding a claim on a listed item first starts the review", async () => {
    const found = await t.foundItem(t.officer, {}, { publish: true });
    const claimId = await createClaim(t.db, { foundCaseId: found.caseId, answer: ANSWER, claimant: { name: "X" } }, { kind: "public" });
    await decideClaim(t.db, { claimId, decision: "accepted" }, t.officer);
    const to = (await t.events(found.caseId)).filter((e) => e.type === "status_changed").map((e) => e.toStatus);
    expect(to).toEqual(["listed", "claim_pending", "ready_to_collect"]);
  });

  it("the claimant contact stays readable through the logged contact view", async () => {
    const found = await t.foundItem(t.officer, {}, { publish: true });
    await createClaim(t.db, { foundCaseId: found.caseId, answer: ANSWER, claimant: { name: "Visible", email: "v@example.test" } }, t.officer);
    expect((await readContacts(t.db, found.caseId, t.officer))[0]).toMatchObject({ role: "claimant", name: "Visible" });
  });
});
