import { describe, expect, it } from "vitest";
import { lockScroll } from "@/components/admin/hooks/scroll-lock";

const el = (overflow = "") => ({ style: { overflow } });

describe("lockScroll", () => {
  it("hides overflow and restores the original on release", () => {
    const target = el("auto");
    const release = lockScroll(target);
    expect(target.style.overflow).toBe("hidden");
    release();
    expect(target.style.overflow).toBe("auto");
  });

  it("restores only when the last overlapping lock is released, in any order", () => {
    const target = el("scroll");
    const first = lockScroll(target);
    const second = lockScroll(target);
    first();
    expect(target.style.overflow).toBe("hidden");
    second();
    expect(target.style.overflow).toBe("scroll");
  });

  it("releases each lock once", () => {
    const target = el("");
    const first = lockScroll(target);
    const second = lockScroll(target);
    first();
    first();
    expect(target.style.overflow).toBe("hidden");
    second();
    expect(target.style.overflow).toBe("");
  });

  it("keeps targets separate and can lock again afterwards", () => {
    const a = el("x");
    const b = el("y");
    const ra = lockScroll(a);
    const rb = lockScroll(b);
    ra();
    expect(a.style.overflow).toBe("x");
    expect(b.style.overflow).toBe("hidden");
    rb();
    a.style.overflow = "z";
    const again = lockScroll(a);
    again();
    expect(a.style.overflow).toBe("z");
  });
});
