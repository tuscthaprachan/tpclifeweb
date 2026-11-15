import { describe, expect, it } from "vitest";
import { stableId } from "@/lib/db/seed/util";

describe("stableId", () => {
  it("is a valid UUID that depends only on its inputs", () => {
    const a = stableId("faculty", "law");
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(stableId("faculty", "law")).toBe(a);
    expect(stableId("faculty", "economics")).not.toBe(a);
    expect(stableId("item", "law")).not.toBe(a);
  });
});
