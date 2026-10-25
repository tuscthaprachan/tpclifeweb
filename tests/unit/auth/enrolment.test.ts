import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStaffAccount, newUserId, userExistsWithEmail } from "@/lib/auth/enrolment";
import { createInvite, InviteError, revokeInvite } from "@/lib/auth/invites";
import { getStaffRoles } from "@/lib/auth/roles";
import { auditLog, organisations, staffInvites, user } from "@/lib/db/schema";
import { createTestDb, makeUser } from "../db/harness";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

type TestDb = Awaited<ReturnType<typeof createTestDb>>["db"];

let db: TestDb;
let tusu: number;

async function code(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    return error instanceof InviteError ? error.code : String(error);
  }
  return undefined;
}

beforeEach(async () => {
  ({ db } = await createTestDb());
  tusu = (await db.select().from(organisations)).find((o) => o.slug === "tusu")!.id;
});

describe("createStaffAccount", () => {
  it("makes the account for the invited address, accepts the invite and grants the roles together", async () => {
    const { token, invite } = await createInvite(db, { email: "New@Example.org", organisationId: tusu, roles: ["editor", "admin"], invitedBy: null });
    const id = newUserId();
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    const result = await createStaffAccount(db, { token, userId: id, name: "  Somchai  Jaidee " });
    expect(result).toEqual({ userId: id, email: "new@example.org", organisationId: tusu });
    const [account] = await db.select().from(user).where(eq(user.id, id));
    expect(account).toMatchObject({ email: "new@example.org", name: "Somchai Jaidee", emailVerified: false });
    expect(await getStaffRoles(id, db)).toHaveLength(2);
    const [spent] = await db.select().from(staffInvites).where(eq(staffInvites.id, invite.id));
    expect(spent?.acceptedAt).toBeInstanceOf(Date);
    const actions = (await db.select().from(auditLog)).map((r) => r.action);
    expect(actions).toEqual(expect.arrayContaining(["staff_account.create", "staff_invite.accept", "staff_role.grant"]));
  });

  it("is single use", async () => {
    const { token } = await createInvite(db, { email: "a@example.org", organisationId: tusu, roles: ["editor"], invitedBy: null });
    await createStaffAccount(db, { token, userId: newUserId(), name: "A" });
    expect(await code(createStaffAccount(db, { token, userId: newUserId(), name: "A" }))).toBe("already_accepted");
    expect(await db.select().from(user)).toHaveLength(1);
  });

  it("refuses a missing name, an expired invite and a cancelled one, leaving nothing behind", async () => {
    const good = await createInvite(db, { email: "a@example.org", organisationId: tusu, roles: ["editor"], invitedBy: null });
    expect(await code(createStaffAccount(db, { token: good.token, userId: newUserId(), name: "  " }))).toBe("invalid_name");
    expect(await code(createStaffAccount(db, { token: good.token, userId: newUserId(), name: "A", now: new Date(Date.now() + 8 * 86_400_000) }))).toBe("expired");
    await revokeInvite(db, { inviteId: good.invite.id });
    expect(await code(createStaffAccount(db, { token: good.token, userId: newUserId(), name: "A" }))).toBe("revoked");
    expect(await code(createStaffAccount(db, { token: "nonsense", userId: newUserId(), name: "A" }))).toBe("not_found");
    expect(await db.select().from(user)).toHaveLength(0);
  });

  it("never touches an address that already has an account", async () => {
    const existing = await makeUser(db, "Existing");
    await db.update(user).set({ email: "taken@example.org" }).where(eq(user.id, existing));
    expect(await userExistsWithEmail(db, "TAKEN@example.org")).toBe(true);
    const { token, invite } = await createInvite(db, { email: "taken@example.org", organisationId: tusu, roles: ["admin"], invitedBy: null });
    expect(await code(createStaffAccount(db, { token, userId: newUserId(), name: "Impostor" }))).toBe("account_exists");
    expect((await db.select().from(user).where(eq(user.id, existing)))[0]?.name).toBe("Existing");
    const [pending] = await db.select().from(staffInvites).where(eq(staffInvites.id, invite.id));
    expect(pending?.acceptedAt).toBeNull();
  });
});
