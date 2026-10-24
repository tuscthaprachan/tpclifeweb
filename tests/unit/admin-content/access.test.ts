import { describe, expect, it } from "vitest";
import { decideAccess, type AccessSession } from "@/lib/auth/access";
import type { ActiveRole, StaffRole } from "@/lib/auth/roles";

const now = new Date("2026-10-23T10:00:00Z");
const session: AccessSession = {
  updatedAt: new Date("2026-10-23T09:59:00Z"),
  expiresAt: new Date("2026-10-30T10:00:00Z"),
  secondFactorAt: new Date("2026-10-23T09:55:00Z"),
};
const EDITORS: readonly StaffRole[] = ["editor", "admin"];
const hold = (role: StaffRole, organisationId = 1): ActiveRole => ({ role, organisationId });
const decide = (roles: ActiveRole[], required?: { role?: StaffRole | readonly StaffRole[]; organisationId?: number }) =>
  decideAccess({ session, now, roles, required }).kind;

describe("decideAccess with a list of roles", () => {
  it("lets an editor or an admin edit content, in any organisation", () => {
    expect(decide([hold("editor", 1)], { role: EDITORS })).toBe("ok");
    expect(decide([hold("admin", 2)], { role: EDITORS })).toBe("ok");
    expect(decide([hold("lf_officer"), hold("editor", 2)], { role: EDITORS })).toBe("ok");
  });

  it("refuses staff who hold only other roles", () => {
    expect(decide([hold("lf_officer")], { role: EDITORS })).toBe("forbidden");
    expect(decide([hold("complaints_handler"), hold("unit_lead")], { role: EDITORS })).toBe("forbidden");
  });

  it("still applies the organisation to the list", () => {
    expect(decide([hold("editor", 1)], { role: EDITORS, organisationId: 2 })).toBe("forbidden");
    expect(decide([hold("editor", 1)], { role: EDITORS, organisationId: 1 })).toBe("ok");
  });

  it("keeps the single-role form and the earlier gates working", () => {
    expect(decide([hold("editor")], { role: "admin" })).toBe("forbidden");
    expect(decide([hold("admin")], { role: "admin" })).toBe("ok");
    expect(decide([hold("editor")], { role: [] })).toBe("ok");
    expect(decide([])).toBe("not_staff");
    expect(decideAccess({ session: { ...session, secondFactorAt: null }, now, roles: [hold("editor")], required: { role: EDITORS } }).kind).toBe(
      "passkey_required",
    );
    expect(decideAccess({ session: null, now, roles: [], required: { role: EDITORS } }).kind).toBe("unauthenticated");
  });
});
