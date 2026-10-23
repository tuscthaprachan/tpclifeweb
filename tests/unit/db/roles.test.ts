import { describe, expect, it } from "vitest";
import { hasAnyRole, hasRole, isStaff, organisationsWithRole, type ActiveRole } from "@/lib/auth/roles";

const roles: ActiveRole[] = [
  { role: "lf_officer", organisationId: 1 },
  { role: "lf_officer", organisationId: 2 },
  { role: "editor", organisationId: 2 },
];

describe("role helpers", () => {
  it("hasRole matches any organisation when none is given", () => {
    expect(hasRole(roles, "editor")).toBe(true);
    expect(hasRole(roles, "admin")).toBe(false);
  });
  it("hasRole respects the organisation", () => {
    expect(hasRole(roles, "editor", 2)).toBe(true);
    expect(hasRole(roles, "editor", 1)).toBe(false);
  });
  it("hasAnyRole", () => {
    expect(hasAnyRole(roles, ["admin", "editor"])).toBe(true);
    expect(hasAnyRole(roles, ["admin", "unit_lead"])).toBe(false);
    expect(hasAnyRole(roles, ["lf_officer"], 3)).toBe(false);
  });
  it("organisationsWithRole and isStaff", () => {
    expect(organisationsWithRole(roles, "lf_officer")).toEqual([1, 2]);
    expect(isStaff(roles)).toBe(true);
    expect(isStaff([])).toBe(false);
  });
});
