import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { getStaffOrganisationIds, getStaffRoles } from "@/lib/auth/roles";
import {
  findStaffByEmail,
  getStaffMember,
  getStaffMemberDetail,
  grantToStaffMember,
  listPendingInvites,
  listStaff,
  revokeRole,
  suspendMember,
  updateStaffMember,
} from "@/lib/auth/staff";
import { createInvite } from "@/lib/auth/invites";
import { auditLog, organisations, passkey, session, staffMemberships, staffRoles, user } from "@/lib/db/schema";
import { createTestDb, makeUser } from "../db/harness";

// Each test may boot an in-memory Postgres and run every migration, which is slow on a busy machine.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

type TestDb = Awaited<ReturnType<typeof createTestDb>>["db"];
let db: TestDb;
let tusu: number;
let tusc: number;

beforeAll(async () => {
  ({ db } = await createTestDb());
  const orgs = await db.select().from(organisations);
  tusu = orgs.find((o) => o.slug === "tusu")!.id;
  tusc = orgs.find((o) => o.slug === "tusc")!.id;
});

async function grant(userId: string, role: "admin" | "editor" | "officer", by: string, orgs: number[] = [tusu]) {
  const [row] = await db.insert(staffRoles).values({ userId, role, grantedBy: by }).returning();
  for (const organisationId of orgs) await db.insert(staffMemberships).values({ userId, organisationId, addedBy: by }).onConflictDoNothing();
  return row!;
}

const auditOf = async (action: string, entityId: string) =>
  (await db.select().from(auditLog)).filter((r) => r.action === action && r.entityId === entityId);

describe("staff list", () => {
  it("lists everyone with an active role or a membership, across both organisations", async () => {
    const boss = await makeUser(db, "Boss");
    const a = await makeUser(db, "Ann");
    const b = await makeUser(db, "Bob");
    await grant(boss, "admin", boss);
    const annRole = await grant(a, "editor", boss, [tusu]);
    await grant(b, "editor", boss, [tusc]);
    const listed = await listStaff(db);
    const ids = listed.map((m) => m.userId);
    expect(ids).toContain(a);
    expect(ids).toContain(b);
    const ann = listed.find((m) => m.userId === a)!;
    expect(ann.roles[0]?.id).toBe(annRole.id);
    expect(ann.organisationIds).toEqual([tusu]);
    expect(ann.suspended).toBe(false);
  });

  it("lists pending invites only", async () => {
    const boss = await makeUser(db);
    const live = await createInvite(db, { email: "live@example.org", organisationIds: [tusu], roles: ["editor"], invitedBy: boss });
    const old = await createInvite(db, { email: "old@example.org", organisationIds: [tusu], roles: ["editor"], invitedBy: boss, now: new Date("2020-01-01") });
    const ids = (await listPendingInvites(db)).map((i) => i.id);
    expect(ids).toContain(live.invite.id);
    expect(ids).not.toContain(old.invite.id);
  });
});

describe("revoking a role", () => {
  it("revokes, keeps the history row, and audits before and after", async () => {
    const boss = await makeUser(db);
    const person = await makeUser(db);
    const g = await grant(person, "editor", boss);
    expect(await revokeRole(db, { roleId: g.id, context: { actorUserId: boss, ip: "198.51.100.1" } })).toBe("revoked");
    expect(await getStaffRoles(person, db)).toEqual([]);
    const [row] = await db.select().from(staffRoles).where(eq(staffRoles.id, g.id));
    expect(row?.revokedAt).not.toBeNull();
    const audit = await auditOf("staff_role.revoke", String(g.id));
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ actorUserId: boss, ip: "198.51.100.1" });
    expect(audit[0]?.before).toMatchObject({ userId: person, role: "editor" });
  });

  it("will not touch a grant that is already revoked", async () => {
    const boss = await makeUser(db);
    const person = await makeUser(db);
    const g = await grant(person, "editor", boss);
    expect(await revokeRole(db, { roleId: g.id })).toBe("revoked");
    expect(await revokeRole(db, { roleId: g.id })).toBe("not_found");
  });

  it("refuses to remove the last admin, but allows it once another exists", async () => {
    const fresh = await createTestDb();
    const one = await makeUser(fresh.db);
    const two = await makeUser(fresh.db);
    const [g1] = await fresh.db.insert(staffRoles).values({ userId: one, role: "admin", grantedBy: one }).returning();
    expect(await revokeRole(fresh.db, { roleId: g1!.id })).toBe("last_admin");
    await fresh.db.insert(staffRoles).values({ userId: two, role: "admin", grantedBy: one });
    expect(await revokeRole(fresh.db, { roleId: g1!.id })).toBe("revoked");
  });
});

describe("updating a member", () => {
  it("saves a role diff: grants new roles, revokes removed ones, keeps history, one audit row", async () => {
    const boss = await makeUser(db, "Boss");
    await grant(boss, "admin", boss);
    const person = await makeUser(db, "Pat");
    const editorGrant = await grant(person, "editor", boss, [tusu]);
    const result = await updateStaffMember(db, { userId: person, roles: ["officer"], organisationIds: [tusu], actorUserId: boss, context: { ip: "198.51.100.2" } });
    expect(result).toBe("updated");
    expect((await getStaffRoles(person, db)).map((r) => r.role)).toEqual(["officer"]);
    const [old] = await db.select().from(staffRoles).where(eq(staffRoles.id, editorGrant.id));
    expect(old?.revokedAt).not.toBeNull();
    const audit = await auditOf("staff_member.update", person);
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ actorUserId: boss, ip: "198.51.100.2" });
    expect(audit[0]?.before).toEqual({ roles: ["editor"], organisationIds: [tusu] });
    expect(audit[0]?.after).toEqual({ roles: ["officer"], organisationIds: [tusu] });
  });

  it("reports unchanged and writes no audit row when nothing differs", async () => {
    const boss = await makeUser(db);
    const person = await makeUser(db);
    await grant(person, "editor", boss, [tusu]);
    expect(await updateStaffMember(db, { userId: person, roles: ["editor"], organisationIds: [tusu], actorUserId: boss })).toBe("unchanged");
    expect(await auditOf("staff_member.update", person)).toHaveLength(0);
  });

  it("changes memberships: adds a second body, removes the first, and needs at least one", async () => {
    const boss = await makeUser(db);
    const person = await makeUser(db);
    await grant(person, "editor", boss, [tusu]);
    expect(await updateStaffMember(db, { userId: person, roles: ["editor"], organisationIds: [tusu, tusc], actorUserId: boss })).toBe("updated");
    expect(await getStaffOrganisationIds(person, db)).toEqual([tusu, tusc].sort((x, y) => x - y));
    expect(await updateStaffMember(db, { userId: person, roles: ["editor"], organisationIds: [tusc], actorUserId: boss })).toBe("updated");
    expect(await getStaffOrganisationIds(person, db)).toEqual([tusc]);
    expect(await updateStaffMember(db, { userId: person, roles: ["editor"], organisationIds: [], actorUserId: boss })).toBe("no_organisation");
    expect(await updateStaffMember(db, { userId: person, roles: ["editor"], organisationIds: [9999], actorUserId: boss })).toBe("unknown_organisation");
    expect(await updateStaffMember(db, { userId: person, roles: [], organisationIds: [tusc], actorUserId: boss })).toBe("no_roles");
    expect(await getStaffOrganisationIds(person, db)).toEqual([tusc]);
  });

  it("roles are not tied to a body: the same role stays active when memberships change", async () => {
    const boss = await makeUser(db);
    const person = await makeUser(db);
    const g = await grant(person, "officer", boss, [tusu]);
    await updateStaffMember(db, { userId: person, roles: ["officer"], organisationIds: [tusu, tusc], actorUserId: boss });
    const [row] = await db.select().from(staffRoles).where(eq(staffRoles.id, g.id));
    expect(row?.revokedAt).toBeNull();
  });

  it("protects the last admin, including when the admin edits themselves", async () => {
    const fresh = await createTestDb();
    const orgs = await fresh.db.select().from(organisations);
    const only = await makeUser(fresh.db, "Only");
    await fresh.db.insert(staffRoles).values({ userId: only, role: "admin", grantedBy: only });
    await fresh.db.insert(staffMemberships).values({ userId: only, organisationId: orgs[0]!.id, addedBy: only });
    expect(await updateStaffMember(fresh.db, { userId: only, roles: ["editor"], organisationIds: [orgs[0]!.id], actorUserId: only })).toBe("last_admin");
    expect(await suspendMember(fresh.db, { userId: only, actorUserId: only })).toBe("last_admin");
    expect((await getStaffRoles(only, fresh.db)).map((r) => r.role)).toEqual(["admin"]);

    const second = await makeUser(fresh.db, "Second");
    await fresh.db.insert(staffRoles).values({ userId: second, role: "admin", grantedBy: only });
    await fresh.db.insert(staffMemberships).values({ userId: second, organisationId: orgs[0]!.id, addedBy: only });
    expect(await updateStaffMember(fresh.db, { userId: only, roles: ["editor"], organisationIds: [orgs[0]!.id], actorUserId: only })).toBe("updated");
    expect(await updateStaffMember(fresh.db, { userId: second, roles: ["editor"], organisationIds: [orgs[0]!.id], actorUserId: second })).toBe("last_admin");
  });

  it("two admins removing each other at once cannot both succeed", async () => {
    const fresh = await createTestDb();
    const orgs = await fresh.db.select().from(organisations);
    const one = await makeUser(fresh.db, "One");
    const two = await makeUser(fresh.db, "Two");
    for (const id of [one, two]) {
      await fresh.db.insert(staffRoles).values({ userId: id, role: "admin", grantedBy: one });
      await fresh.db.insert(staffMemberships).values({ userId: id, organisationId: orgs[0]!.id, addedBy: one });
    }
    const results = await Promise.all([
      updateStaffMember(fresh.db, { userId: one, roles: ["editor"], organisationIds: [orgs[0]!.id], actorUserId: two }),
      updateStaffMember(fresh.db, { userId: two, roles: ["editor"], organisationIds: [orgs[0]!.id], actorUserId: one }),
    ]);
    expect(results.filter((r) => r === "updated")).toHaveLength(1);
    expect(results.filter((r) => r === "last_admin")).toHaveLength(1);
  });

  it("is not found for an unknown person", async () => {
    const boss = await makeUser(db);
    expect(await updateStaffMember(db, { userId: "nobody", roles: ["editor"], organisationIds: [tusu], actorUserId: boss })).toBe("not_found");
  });
});

describe("suspending a member", () => {
  it("revokes every role, ends sessions, keeps memberships and audits", async () => {
    const boss = await makeUser(db);
    await grant(boss, "admin", boss);
    const person = await makeUser(db, "Sam");
    await grant(person, "editor", boss, [tusu, tusc]);
    await grant(person, "officer", boss);
    await db.insert(session).values({ id: "s-sam", token: "t-sam", userId: person, expiresAt: new Date(Date.now() + 3_600_000) });
    expect(await suspendMember(db, { userId: person, actorUserId: boss })).toBe("suspended");
    expect(await getStaffRoles(person, db)).toEqual([]);
    expect(await db.select().from(session).where(eq(session.userId, person))).toEqual([]);
    expect(await getStaffOrganisationIds(person, db)).toHaveLength(2);
    const audit = await auditOf("staff_member.suspend", person);
    expect(audit).toHaveLength(1);
    expect(audit[0]?.before).toMatchObject({ roles: ["editor", "officer"] });
    expect((await getStaffMember(db, person))?.suspended).toBe(true);
    expect(await suspendMember(db, { userId: person, actorUserId: boss })).toBe("already_suspended");
  });

  it("a suspended member is reactivated by granting roles through the same update", async () => {
    const boss = await makeUser(db);
    await grant(boss, "admin", boss);
    const person = await makeUser(db);
    await grant(person, "editor", boss, [tusu]);
    await suspendMember(db, { userId: person, actorUserId: boss });
    expect(await updateStaffMember(db, { userId: person, roles: ["officer"], organisationIds: [tusu], actorUserId: boss })).toBe("updated");
    expect((await getStaffRoles(person, db)).map((r) => r.role)).toEqual(["officer"]);
  });
});

describe("granting to existing staff", () => {
  it("adds roles and memberships without removing any, auditing the change", async () => {
    const boss = await makeUser(db);
    const person = await makeUser(db, "Existing");
    await grant(person, "editor", boss, [tusu]);
    expect(await grantToStaffMember(db, { userId: person, roles: ["officer"], organisationIds: [tusc], actorUserId: boss })).toBe("updated");
    expect((await getStaffRoles(person, db)).map((r) => r.role).sort()).toEqual(["editor", "officer"]);
    expect(await getStaffOrganisationIds(person, db)).toHaveLength(2);
    expect(await grantToStaffMember(db, { userId: person, roles: ["officer"], organisationIds: [tusc], actorUserId: boss })).toBe("unchanged");
    const audit = await auditOf("staff_member.update", person);
    expect(audit).toHaveLength(1);
    expect(audit[0]?.after).toMatchObject({ viaInvite: true });
  });

  it("finds staff by email and ignores accounts that are not staff", async () => {
    const boss = await makeUser(db);
    const person = await makeUser(db);
    const outsider = await makeUser(db);
    await grant(person, "officer", boss);
    const [row] = await db.select({ email: user.email }).from(user).where(eq(user.id, person));
    const [other] = await db.select({ email: user.email }).from(user).where(eq(user.id, outsider));
    expect((await findStaffByEmail(db, row!.email))?.userId).toBe(person);
    expect(await findStaffByEmail(db, other!.email)).toBeNull();
  });
});

describe("member detail", () => {
  it("reports passkeys, last sign-in and recent audit rows about the person", async () => {
    const boss = await makeUser(db, "Boss");
    const person = await makeUser(db, "Detail");
    await grant(person, "officer", boss);
    await db.insert(passkey).values({ id: "pk1", publicKey: "k", userId: person, credentialID: "c1", counter: 0, deviceType: "singleDevice", backedUp: false, lastUsedAt: new Date("2026-02-01T00:00:00Z") });
    await updateStaffMember(db, { userId: person, roles: ["officer", "editor"], organisationIds: [tusu], actorUserId: boss });
    const detail = await getStaffMemberDetail(db, person);
    expect(detail?.passkeyCount).toBe(1);
    expect(detail?.lastSignInAt).toEqual(new Date("2026-02-01T00:00:00Z"));
    expect(detail?.recent.map((r) => r.action)).toContain("staff_member.update");
    expect(detail?.recent.length).toBeLessThanOrEqual(20);
    expect(await getStaffMemberDetail(db, "nobody")).toBeNull();
  });
});

describe("rate limiter", () => {
  it("allows up to the limit then refuses until the window passes", async () => {
    const rule = { windowSeconds: 60, max: 3 };
    const t0 = 1_700_000_000_000;
    for (let i = 0; i < 3; i += 1) expect((await consumeRateLimit(db, "k1", rule, t0 + i)).allowed).toBe(true);
    const blocked = await consumeRateLimit(db, "k1", rule, t0 + 10_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(50);
    expect((await consumeRateLimit(db, "k1", rule, t0 + 60_001)).allowed).toBe(true);
  });

  it("counts keys separately and survives concurrent hits", async () => {
    const rule = { windowSeconds: 60, max: 5 };
    const results = await Promise.all(Array.from({ length: 8 }, () => consumeRateLimit(db, "k2", rule, 1_700_000_100_000)));
    expect(results.filter((r) => r.allowed)).toHaveLength(5);
    expect((await consumeRateLimit(db, "k3", rule, 1_700_000_100_000)).allowed).toBe(true);
  });
});
