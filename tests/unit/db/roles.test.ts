import { describe, expect, it } from "vitest";
import { hasAnyRole, hasRole, isStaff, type ActiveRole } from "@/lib/auth/roles";

const roles: ActiveRole[] = [{ role: "officer" }, { role: "editor" }];

describe("role helpers", () => {
  it("hasRole", () => {
    expect(hasRole(roles, "editor")).toBe(true);
    expect(hasRole(roles, "admin")).toBe(false);
  });
  it("hasAnyRole", () => {
    expect(hasAnyRole(roles, ["admin", "editor"])).toBe(true);
    expect(hasAnyRole(roles, ["admin"])).toBe(false);
    expect(hasAnyRole([], ["admin", "editor", "officer"])).toBe(false);
  });
  it("isStaff", () => {
    expect(isStaff(roles)).toBe(true);
    expect(isStaff([])).toBe(false);
  });
});
