import { describe, expect, it } from "vitest";
import { claimStage } from "@/lib/lost-found/public/claim-view";
import { isUnclaimed } from "@/lib/lost-found/register";

describe("claimStage", () => {
  it("an undecided claim waits while the item can still be decided", () => {
    for (const status of ["listed", "claim_pending"]) expect(claimStage(null, status)).toBe("waiting");
  });
  it("an undecided claim reads as closed once the item is promised elsewhere, returned or withdrawn", () => {
    for (const status of ["ready_to_collect", "returned", "withdrawn"]) expect(claimStage(null, status)).toBe("closed");
  });
  it("decided claims keep their stage", () => {
    expect(claimStage("rejected", "returned")).toBe("not_accepted");
    expect(claimStage("accepted", "ready_to_collect")).toBe("accepted");
    expect(claimStage("accepted", "returned")).toBe("returned");
  });
});

describe("isUnclaimed", () => {
  const item = { kind: "found", registerStatus: "open", claimBy: "2026-11-10" };
  it("is true from the Bangkok day after claimBy, only for an open found item", () => {
    expect(isUnclaimed(item, new Date("2026-11-10T16:59:59Z"))).toBe(false);
    expect(isUnclaimed(item, new Date("2026-11-10T17:00:00Z"))).toBe(true);
    expect(isUnclaimed({ ...item, registerStatus: "matched" }, new Date("2027-01-01T00:00:00Z"))).toBe(false);
    expect(isUnclaimed({ ...item, kind: "lost" }, new Date("2027-01-01T00:00:00Z"))).toBe(false);
    expect(isUnclaimed({ ...item, claimBy: null }, new Date("2027-01-01T00:00:00Z"))).toBe(false);
  });
});
