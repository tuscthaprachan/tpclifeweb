import { beforeAll, describe, expect, it, vi } from "vitest";
import { transition } from "@/lib/cases";
import { bulkTransition } from "@/lib/cases/bulk";
import { getMachine } from "@/lib/cases/services";
import { createClaim, DEFAULT_REJECT_MESSAGE, decideClaim } from "@/lib/lost-found/claims";
import { getListingForCase } from "@/lib/lost-found/listing";
import { markPossibleMatch } from "@/lib/lost-found/links";
import { listingRegisterFor } from "@/lib/lost-found/register";
import { lfSetup, NOW } from "./helpers";

vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));

let t: Awaited<ReturnType<typeof lfSetup>>;
beforeAll(async () => {
  t = await lfSetup();
}, 60_000);

const register = async (caseId: string) => (await getListingForCase(t.db, caseId))!;

describe("listingRegisterFor", () => {
  it.each(["lost", "found"] as const)("answers for every status of the %s machine", (kind) => {
    for (const status of Object.keys(getMachine("lost_found", kind)!.statuses)) {
      expect(listingRegisterFor(kind, status), `${kind} ${status}`).not.toBeNull();
    }
  });

  it("maps each status as the register shows it", () => {
    expect(["submitted", "searching", "match_found", "ready_to_collect", "returned", "closed_unfound", "withdrawn"].map((s) => listingRegisterFor("lost", s))).toEqual(["open", "open", "matched", "matched", "returned", "withdrawn", "withdrawn"]);
    expect(["logged", "listed", "claim_pending", "ready_to_collect", "returned", "withdrawn"].map((s) => listingRegisterFor("found", s))).toEqual(["open", "open", "matched", "matched", "returned", "withdrawn"]);
  });

  it("is null for a kind or status it does not know", () => {
    expect(listingRegisterFor("loan", "returned")).toBeNull();
    expect(listingRegisterFor("found", "closed_unfound")).toBeNull();
  });
});

describe("the listing follows a generic status move", () => {
  it("returns a found item's listing, stamping resolved_at, and reopens it", async () => {
    const found = await t.foundItem(t.officer, {}, { publish: true });
    await transition(t.db, found.caseId, "returned", t.officer, { now: NOW });
    expect(await register(found.caseId)).toMatchObject({ registerStatus: "returned", status: "published" });
    const { lostFoundItems } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    const [row] = await t.db.select({ resolvedAt: lostFoundItems.resolvedAt }).from(lostFoundItems).where(eq(lostFoundItems.caseId, found.caseId));
    expect(row!.resolvedAt).toEqual(NOW);
  });

  it("withdraws a found item's listing through the bulk move", async () => {
    const found = await t.foundItem(t.officer, {}, { publish: true });
    const result = await bulkTransition(t.db, [found.caseId], "withdrawn", t.officer, { now: NOW });
    expect(result.done).toEqual([found.caseId]);
    expect((await register(found.caseId)).registerStatus).toBe("withdrawn");
  });

  it("takes a closed lost report off the open register and puts it back when reopened", async () => {
    const lost = await t.lostReport();
    await bulkTransition(t.db, [lost.caseId], "closed_unfound", t.officer, { now: NOW });
    expect((await register(lost.caseId)).registerStatus).toBe("withdrawn");
    await transition(t.db, lost.caseId, "searching", t.officer, { now: NOW });
    expect((await register(lost.caseId)).registerStatus).toBe("open");
  });

  it("does not publish a draft", async () => {
    const found = await t.foundItem();
    await transition(t.db, found.caseId, "listed", t.officer, { now: NOW });
    expect(await register(found.caseId)).toMatchObject({ status: "draft", registerStatus: "open" });
  });

  it("marks a listing matched when the case moves to claim pending, and open when it goes back to listed", async () => {
    const found = await t.foundItem(t.officer, {}, { publish: true });
    await transition(t.db, found.caseId, "claim_pending", t.officer, { now: NOW });
    expect((await register(found.caseId)).registerStatus).toBe("matched");
    await transition(t.db, found.caseId, "listed", t.officer, { now: NOW });
    expect((await register(found.caseId)).registerStatus).toBe("open");
  });

  it("leaves nothing half done when the listing cannot be written", async () => {
    const found = await t.foundItem(t.officer, {}, { publish: true });
    const { sql } = await import("drizzle-orm");
    await t.db.execute(sql`create function lf_refuse() returns trigger as $$ begin raise exception 'listing refused'; end $$ language plpgsql`);
    await t.db.execute(sql`create trigger lf_refuse before update on lost_found_items for each row when (new.register_status = 'returned') execute function lf_refuse()`);
    try {
      await expect(transition(t.db, found.caseId, "returned", t.officer, { now: NOW })).rejects.toThrow();
      expect(await t.statusOf(found.caseId)).toBe("listed");
    } finally {
      await t.db.execute(sql`drop trigger lf_refuse on lost_found_items`);
    }
  });
});

describe("decideClaim on an item that can no longer be claimed", () => {
  const claim = (foundCaseId: string, name: string) => createClaim(t.db, { foundCaseId, answer: name, claimant: { name } }, t.officer);

  it("refuses to accept a second claim once the item is ready to collect for the first", async () => {
    const found = await t.foundItem(t.officer, {}, { publish: true });
    const first = await claim(found.caseId, "First");
    const second = await claim(found.caseId, "Second");
    await decideClaim(t.db, { claimId: first, decision: "accepted" }, t.officer, { now: NOW });
    await expect(decideClaim(t.db, { claimId: second, decision: "accepted" }, t.officer, { now: NOW })).rejects.toMatchObject({ code: "invalid_transition" });
    expect(await t.statusOf(found.caseId)).toBe("ready_to_collect");
    const { listClaims } = await import("@/lib/lost-found/claims");
    expect((await listClaims(t.db, found.caseId)).find((c) => c.id === second)!.decision).toBeNull();
  });

  it("refuses to accept on a returned or withdrawn item", async () => {
    for (const to of ["returned", "withdrawn"]) {
      const found = await t.foundItem(t.officer, {}, { publish: true });
      const id = await claim(found.caseId, "Late");
      await transition(t.db, found.caseId, to, t.officer, { now: NOW });
      await expect(decideClaim(t.db, { claimId: id, decision: "accepted" }, t.officer, { now: NOW })).rejects.toMatchObject({ code: "invalid_transition" });
      expect(await t.statusOf(found.caseId)).toBe(to);
    }
  });

  it("still lets an undecided claim be rejected", async () => {
    const found = await t.foundItem(t.officer, {}, { publish: true });
    const first = await claim(found.caseId, "First");
    const second = await claim(found.caseId, "Second");
    await decideClaim(t.db, { claimId: first, decision: "accepted" }, t.officer, { now: NOW });
    const result = await decideClaim(t.db, { claimId: second, decision: "rejected", message: DEFAULT_REJECT_MESSAGE }, t.officer, { now: NOW });
    expect(result.foundStatus).toBe("ready_to_collect");
  });

  it("keeps the register matched after an acceptance with no linked report", async () => {
    const found = await t.foundItem(t.officer, {}, { publish: true });
    await decideClaim(t.db, { claimId: await claim(found.caseId, "Walk-in"), decision: "accepted" }, t.officer, { now: NOW });
    expect((await register(found.caseId)).registerStatus).toBe("matched");
  });

  it("matches a linked pair on the register", async () => {
    const lost = await t.lostReport();
    const found = await t.foundItem(t.officer, {}, { publish: true });
    await markPossibleMatch(t.db, { lostCaseId: lost.caseId, foundCaseId: found.caseId }, t.officer, { now: NOW });
    expect((await register(lost.caseId)).registerStatus).toBe("matched");
  });
});
