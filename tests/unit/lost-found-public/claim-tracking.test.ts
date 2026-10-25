/**
 * A claimant's tracking link shows their own claim and nothing else on the
 * found item's case: not other claimants, not the item's general timeline.
 * Real Postgres (PGlite) with the real migrations.
 */

import { beforeAll, describe, expect, it, vi } from "vitest";
import { addPublicUpdate, publicTimeline } from "@/lib/cases";
import { decideClaim, DEFAULT_REJECT_MESSAGE } from "@/lib/lost-found/claims";
import { claimTrackView } from "@/lib/lost-found/public/claim-view";
import { submitClaim } from "@/lib/lost-found/public/submit";
import { limitedQuery, openTracked, parseWaitMinutes, withdrawTracked } from "@/lib/lost-found/public/track";
import { emptyValues } from "@/lib/lost-found/public/validate";
import { recordHandover } from "@/lib/lost-found/handover";
import { lostFoundClaims } from "@/lib/db/schema";
import { caseAccessTokens } from "@/lib/db/schema/cases";
import { eq } from "drizzle-orm";
import { KEY_A } from "../cases/helpers";
import { lfSetup, NOW } from "../lost-found-staff/helpers";

vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));

let t: Awaited<ReturnType<typeof lfSetup>>;
beforeAll(async () => {
  t = await lfSetup();
}, 60_000);

const env = { PII_ENCRYPTION_KEY: KEY_A, NODE_ENV: "test" };
const ctx = { locale: "en" as const, ip: "203.0.113.7", userAgent: "vitest", requestId: "req-1" };
let ipCounter = 0;
const ip = () => `198.51.100.${(ipCounter = (ipCounter % 200) + 1)}`;

const claimValues = (name: string) => ({
  ...emptyValues(),
  proof: `${name} says a green library card is behind the ID window`,
  name,
  email: `${name.toLowerCase().replace(/\W/g, "")}@example.com`,
  consent: "yes",
});

/** A published found item with two online claims, each with its own link. */
async function twoClaims() {
  const found = await t.foundItem(t.officer, {}, { publish: true });
  const slug = found.reference.toLowerCase();
  const a = await submitClaim(t.db, slug, claimValues("Alice Claimant"), ctx, { now: NOW, env });
  const b = await submitClaim(t.db, slug, claimValues("Bob Claimant"), ctx, { now: NOW, env });
  const claims = await t.db.select().from(lostFoundClaims).where(eq(lostFoundClaims.caseId, found.caseId));
  const [claimA, claimB] = [claims[0]!, claims[1]!];
  return { found, a, b, claimA, claimB };
}

const view = async (reference: string, token: string) => {
  const out = await openTracked(t.db, reference, token, ip(), NOW);
  if (out.state !== "claim") throw new Error(`Expected a claim view, got ${out.state}.`);
  return out.claim;
};

describe("a claimant's tracking link", () => {
  it("is tied to its own claim", async () => {
    const { a, b, claimA, claimB } = await twoClaims();
    const rows = await t.db.select().from(caseAccessTokens);
    expect(rows.filter((r) => r.claimId === claimA.id)).toHaveLength(1);
    expect(rows.filter((r) => r.claimId === claimB.id)).toHaveLength(1);
    expect(a.token).not.toBe(b.token);
  });

  it("shows only that claim, waiting to be checked, and nothing of the other claimant or the item's own timeline", async () => {
    const { found, a, b } = await twoClaims();
    await addPublicUpdate(t.db, found.caseId, { en: "General notice for the finder" }, t.officer, { now: NOW });
    const mine = await view(found.reference, a.token);
    expect(mine).toMatchObject({ reference: found.reference, stage: "waiting", desk: null, collectionNote: null });
    expect(mine.statusLabel.en).toBe("Waiting to be checked");
    expect(mine.timeline.map((e) => e.title.en)).toEqual(["Claim received"]);
    const theirs = await view(found.reference, b.token);
    expect(theirs.stage).toBe("waiting");
    for (const v of [mine, theirs]) {
      const text = JSON.stringify(v);
      expect(text).not.toMatch(/General notice|Checking a claim|Alice|Bob|example\.com|library card/);
    }
  });

  it("shows acceptance with where to collect and the staff message, to that claimant only", async () => {
    const { found, a, b, claimA } = await twoClaims();
    await decideClaim(t.db, { claimId: claimA.id, decision: "accepted", collectionNote: { en: "Come on weekdays, 10:00 to 16:00" } }, t.officer, { now: NOW });
    const mine = await view(found.reference, a.token);
    expect(mine.stage).toBe("accepted");
    expect(mine.statusLabel.en).toBe("Accepted, ready to collect");
    expect(mine.desk?.en).toMatch(/ desk$/);
    expect(mine.collectionNote).toEqual({ th: null, en: "Come on weekdays, 10:00 to 16:00" });
    expect(mine.timeline.map((e) => e.title.en)).toEqual(["Claim received", "Accepted, ready to collect", "Message from staff"]);
    // The other claimant has not been told anything.
    const theirs = await view(found.reference, b.token);
    expect(theirs).toMatchObject({ stage: "waiting", desk: null, collectionNote: null });
    expect(JSON.stringify(theirs)).not.toContain("weekdays");
    // The item's own timeline does not carry the claimant's message.
    expect(JSON.stringify(await publicTimeline(t.db, found.caseId))).not.toContain("weekdays");
  });

  it("an acceptance with no message is fine, and shows no collection details", async () => {
    const { found, a, claimA } = await twoClaims();
    await decideClaim(t.db, { claimId: claimA.id, decision: "accepted", collectionNote: { th: " ", en: "" } }, t.officer, { now: NOW });
    const mine = await view(found.reference, a.token);
    expect(mine).toMatchObject({ stage: "accepted", collectionNote: null });
    expect(mine.timeline.map((e) => e.title.en)).toEqual(["Claim received", "Accepted, ready to collect"]);
  });

  it("shows a rejection with the polite message to that claimant only", async () => {
    const { found, a, b, claimB } = await twoClaims();
    await decideClaim(t.db, { claimId: claimB.id, decision: "rejected", message: DEFAULT_REJECT_MESSAGE }, t.officer, { now: NOW });
    const rejected = await view(found.reference, b.token);
    expect(rejected.stage).toBe("not_accepted");
    expect(rejected.statusLabel.en).toBe("Not accepted");
    expect(rejected.timeline.at(-1)).toMatchObject({ title: { en: "Message from staff" }, body: DEFAULT_REJECT_MESSAGE });
    const other = await view(found.reference, a.token);
    expect(other.stage).toBe("waiting");
    expect(JSON.stringify(other)).not.toContain("could not confirm");
    expect(JSON.stringify(await publicTimeline(t.db, found.caseId))).not.toContain("could not confirm");
  });

  it("ends as returned for the claimant whose claim was accepted, once the handover is recorded", async () => {
    const { found, a, b, claimA, claimB } = await twoClaims();
    await decideClaim(t.db, { claimId: claimA.id, decision: "accepted" }, t.officer, { now: NOW });
    await decideClaim(t.db, { claimId: claimB.id, decision: "rejected", message: DEFAULT_REJECT_MESSAGE }, t.officer, { now: NOW });
    const collectedAt = new Date(NOW.getTime() + 3600_000);
    await recordHandover(t.db, { foundCaseId: found.caseId, collectedByName: null, idCheckType: "student_card", collectedAt, deskOrganisationId: t.officer.organisationId }, t.officer, { now: collectedAt, env });
    const mine = await view(found.reference, a.token);
    expect(mine.stage).toBe("returned");
    expect(mine.statusLabel.en).toBe("Returned to you");
    expect(mine.desk).toBeNull();
    expect(mine.timeline.at(-1)).toMatchObject({ title: { en: "Returned to you" }, at: collectedAt });
    expect((await view(found.reference, b.token)).stage).toBe("not_accepted");
  });

  it("offers no withdrawal, and a claim that is not on the case is not found", async () => {
    const { found, a, claimA } = await twoClaims();
    expect(await withdrawTracked(t.db, found.reference, a.token, { ip: ip() }, NOW)).toBe("not_allowed");
    const other = await t.foundItem(t.officer, {}, { publish: true });
    await expect(claimTrackView(t.db, other.caseId, claimA.id)).rejects.toMatchObject({ code: "not_found" });
  });

  it("a link for the whole case still shows the whole case", async () => {
    const found = await t.foundItem(t.officer, {}, { publish: true });
    const { issueTrackingLink } = await import("@/lib/cases");
    const { token } = await issueTrackingLink(t.db, found.caseId, t.officer, { now: NOW });
    expect(await openTracked(t.db, found.reference, token, ip(), NOW)).toMatchObject({ state: "ok", view: { reference: found.reference } });
  });
});

describe("the attempt limit", () => {
  it("says how long to wait, once the limit is reached, and nothing else about the link", async () => {
    const found = await t.foundItem(t.officer, {}, { publish: true });
    const address = "198.51.100.250";
    let last = await openTracked(t.db, found.reference, "z".repeat(43), address, NOW);
    expect(last).toEqual({ state: "none" });
    for (let i = 0; i < 25; i++) last = await openTracked(t.db, found.reference, "z".repeat(43), address, NOW);
    expect(last).toMatchObject({ state: "limited" });
    if (last.state === "limited") expect(limitedQuery(last.retryAfterSeconds)).toMatch(/^\?problem=limited&wait=(1[0-5]|[1-9])$/);
  });

  it("rounds up to whole minutes and reads the wait back safely", () => {
    expect(limitedQuery(1)).toBe("?problem=limited&wait=1");
    expect(limitedQuery(60)).toBe("?problem=limited&wait=1");
    expect(limitedQuery(61)).toBe("?problem=limited&wait=2");
    expect(limitedQuery(15 * 60)).toBe("?problem=limited&wait=15");
    expect(parseWaitMinutes("7")).toBe(7);
    for (const bad of [undefined, "", "0", "-3", "2.5", "abc", "99999"]) expect(parseWaitMinutes(bad)).toBeNull();
  });
});
