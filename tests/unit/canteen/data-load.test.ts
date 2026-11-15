import { describe, expect, it } from "vitest";

import { nextLoadAction } from "@/lib/canteen/data-load";

describe("nextLoadAction", () => {
  it("resolves on success whether or not the reload was spent", () => {
    expect(nextLoadAction(false, "ok")).toBe("resolve");
    expect(nextLoadAction(true, "ok")).toBe("resolve");
  });

  it("spends the one reload on the first failure", () => {
    expect(nextLoadAction(false, "failed")).toBe("reload");
  });

  it("rejects once the reload is spent, so the error boundary shows instead of a spinner forever", () => {
    expect(nextLoadAction(true, "failed")).toBe("reject");
  });
});
