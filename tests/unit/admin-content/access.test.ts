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
const hold = (role: StaffRole): ActiveRole => ({ role });
const decide = (roles: ActiveRole[], required?: { role?: StaffRole | readonly StaffRole[] }) =>
  decideAccess({ session, now, roles, required }).kind;

describe("decideAccess with a list of roles", () => {
  it("lets an editor or an admin edit content", () => {
    expect(decide([hold("editor")], { role: EDITORS })).toBe("ok");
    expect(decide([hold("admin")], { role: EDITORS })).toBe("ok");
    expect(decide([hold("officer"), hold("editor")], { role: EDITORS })).toBe("ok");
  });

  it("refuses staff who hold only other roles", () => {
    expect(decide([hold("officer")], { role: EDITORS })).toBe("forbidden");
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
