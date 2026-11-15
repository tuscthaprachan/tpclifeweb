import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { lostFoundItems } from "@/lib/db/schema";
import { purgeExpiredPii } from "@/lib/cases";
import { getListingForCase, markUnclaimedListings } from "@/lib/lost-found/listing";
import { lfSetup } from "./helpers";

vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));

let t: Awaited<ReturnType<typeof lfSetup>>;
beforeAll(async () => {
  t = await lfSetup();
}, 60_000);

const setClaimBy = (caseId: string, claimBy: string | null) => t.db.update(lostFoundItems).set({ claimBy }).where(eq(lostFoundItems.caseId, caseId));

describe("unclaimed listings", () => {
  it("moves an open published found listing to unclaimed after claimBy, stamping resolved_at, once", async () => {
    const found = await t.foundItem(t.officer, {}, { publish: true });
    await setClaimBy(found.caseId, "2026-11-10");
    expect(await markUnclaimedListings(t.db, new Date("2026-11-10T16:59:59Z"))).toEqual([]);
    const now = new Date("2026-11-10T17:00:00Z");
    expect(await markUnclaimedListings(t.db, now)).toEqual([found.caseId]);
    const listing = await getListingForCase(t.db, found.caseId);
    expect(listing?.registerStatus).toBe("unclaimed");
    expect(await t.statusOf(found.caseId)).toBe("listed");
    expect(await markUnclaimedListings(t.db, now)).toEqual([]);
  });

  it("leaves matched, unpublished and deadline-less listings alone", async () => {
    const none = await t.foundItem(t.officer, {}, { publish: true });
    const draft = await t.foundItem(t.officer);
    await setClaimBy(draft.caseId, "2020-01-01");
    await markUnclaimedListings(t.db, new Date("2030-01-01T00:00:00Z"));
    expect((await getListingForCase(t.db, none.caseId))?.registerStatus).toBe("open");
    expect((await getListingForCase(t.db, draft.caseId))?.registerStatus).toBe("open");
  });

  it("is applied by the retention job", async () => {
    const found = await t.foundItem(t.officer, {}, { publish: true });
    await setClaimBy(found.caseId, "2020-01-01");
    const result = await purgeExpiredPii(t.db, new Date("2026-11-10T17:00:00Z"));
    expect(result.unclaimed).toBeGreaterThanOrEqual(1);
    expect((await getListingForCase(t.db, found.caseId))?.registerStatus).toBe("unclaimed");
  });
});
