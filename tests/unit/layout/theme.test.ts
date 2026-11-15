import { describe, expect, it } from "vitest";
import { resolveScheme, resolveTheme } from "@/lib/theme/config";

describe("resolveTheme", () => {
  it("returns forced themes", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });
  it("treats anything else as system", () => {
    expect(resolveTheme(null)).toBe("system");
    expect(resolveTheme(undefined)).toBe("system");
    expect(resolveTheme("")).toBe("system");
    expect(resolveTheme("system")).toBe("system");
    expect(resolveTheme("purple")).toBe("system");
  });
});

describe("resolveScheme", () => {
  it("follows the system only for system", () => {
    expect(resolveScheme("system", true)).toBe("dark");
    expect(resolveScheme("system", false)).toBe("light");
    expect(resolveScheme("light", true)).toBe("light");
    expect(resolveScheme("dark", false)).toBe("dark");
  });
});
