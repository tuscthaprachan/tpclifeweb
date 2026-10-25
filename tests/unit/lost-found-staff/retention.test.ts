import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { purgeExpiredPii, transition } from "@/lib/cases";
import { cases } from "@/lib/db/schema";
import { lostFoundCaseDetails, lostFoundClaims } from "@/lib/db/schema/lost-found-staff";
import { createClaim } from "@/lib/lost-found/claims";
import { readVerificationDetail } from "@/lib/lost-found/details";
import { lfSetup } from "./helpers";

vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));

let t: Awaited<ReturnType<typeof lfSetup>>;
beforeAll(async () => {
  t = await lfSetup();
}, 60_000);

describe("retention", () => {
  it("clears the hidden detail and claim answers with the case's other personal data, keeping where the item was stored", async () => {
    const found = await t.foundItem(t.officer, {}, { publish: true, detail: "SECRET-DETAIL" });
    const claimId = await createClaim(t.db, { foundCaseId: found.caseId, answer: "SECRET-ANSWER", claimant: { name: "C" } }, t.officer);
    await transition(t.db, found.caseId, "withdrawn", t.officer, { now: new Date("2026-01-01T00:00:00Z") });

    // Not due yet: nothing is touched.
    expect((await purgeExpiredPii(t.db, new Date("2026-06-01T00:00:00Z"))).purged).toBe(0);
    expect((await t.db.select().from(lostFoundCaseDetails).where(eq(lostFoundCaseDetails.caseId, found.caseId)))[0]!.verificationDetailEnc).not.toBeNull();

    const result = await purgeExpiredPii(t.db, new Date("2027-01-02T00:00:00Z"));
    expect(result.purged).toBeGreaterThanOrEqual(1);
    const [details] = await t.db.select().from(lostFoundCaseDetails).where(eq(lostFoundCaseDetails.caseId, found.caseId));
    expect(details).toMatchObject({ verificationDetailEnc: null, storageShelf: "Shelf B, box 3" });
    const [claim] = await t.db.select().from(lostFoundClaims).where(eq(lostFoundClaims.id, claimId));
    expect(claim!.answerEnc).toBeNull();
    expect((await t.db.select().from(cases).where(eq(cases.id, found.caseId)))[0]!.piiDeletedAt).not.toBeNull();
    expect(await readVerificationDetail(t.db, found.caseId, t.officer)).toBeNull();
  });
});
