import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { getStaffRoles } from "@/lib/auth/roles";
import { listPendingInvites, listStaff, revokeRole } from "@/lib/auth/staff";
import { createInvite } from "@/lib/auth/invites";
import { auditLog, organisations, staffRoles } from "@/lib/db/schema";
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

async function grant(userId: string, role: "admin" | "editor", organisationId: number, by: string) {
  const [row] = await db.insert(staffRoles).values({ userId, role, organisationId, grantedBy: by }).returning();
  return row!;
}

describe("staff list", () => {
  it("lists only people with active roles in the given organisations", async () => {
    const boss = await makeUser(db, "Boss");
    const a = await makeUser(db, "Ann");
    const b = await makeUser(db, "Bob");
    await grant(boss, "admin", tusu, boss);
    const annRole = await grant(a, "editor", tusu, boss);
    await grant(b, "editor", tusc, boss);
    const listed = await listStaff(db, [tusu]);
    const ids = listed.map((m) => m.userId);
    expect(ids).toContain(a);
    expect(ids).not.toContain(b);
    expect(listed.find((m) => m.userId === a)?.grants[0]?.id).toBe(annRole.id);
    expect(await listStaff(db, [])).toEqual([]);
  });

  it("lists pending invites only", async () => {
    const boss = await makeUser(db);
    const live = await createInvite(db, { email: "live@example.org", organisationId: tusu, roles: ["editor"], invitedBy: boss });
    const old = await createInvite(db, { email: "old@example.org", organisationId: tusu, roles: ["editor"], invitedBy: boss, now: new Date("2020-01-01") });
    const ids = (await listPendingInvites(db, [tusu])).map((i) => i.id);
    expect(ids).toContain(live.invite.id);
    expect(ids).not.toContain(old.invite.id);
  });
});

describe("revoking a role", () => {
  it("revokes, keeps the history row, and audits before and after", async () => {
    const boss = await makeUser(db);
    const person = await makeUser(db);
    const g = await grant(person, "editor", tusu, boss);
    expect(await revokeRole(db, { roleId: g.id, allowedOrganisationIds: [tusu], context: { actorUserId: boss, ip: "198.51.100.1" } })).toBe("revoked");
    expect(await getStaffRoles(person, db)).toEqual([]);
    const [row] = await db.select().from(staffRoles).where(eq(staffRoles.id, g.id));
    expect(row?.revokedAt).not.toBeNull();
    const audit = (await db.select().from(auditLog)).filter((r) => r.action === "staff_role.revoke" && r.entityId === String(g.id));
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ actorUserId: boss, ip: "198.51.100.1", actorOrganisationId: tusu });
    expect(audit[0]?.before).toMatchObject({ userId: person, role: "editor" });
  });

  it("will not touch a grant outside the actor's organisations, or one already revoked", async () => {
    const boss = await makeUser(db);
    const person = await makeUser(db);
    const g = await grant(person, "editor", tusc, boss);
    expect(await revokeRole(db, { roleId: g.id, allowedOrganisationIds: [tusu] })).toBe("not_found");
    expect(await revokeRole(db, { roleId: g.id, allowedOrganisationIds: [tusc] })).toBe("revoked");
    expect(await revokeRole(db, { roleId: g.id, allowedOrganisationIds: [tusc] })).toBe("not_found");
  });

  it("refuses to remove the last admin, but allows it once another exists", async () => {
    const fresh = await createTestDb();
    const [org] = await fresh.db.select().from(organisations);
    const one = await makeUser(fresh.db);
    const two = await makeUser(fresh.db);
    const [g1] = await fresh.db.insert(staffRoles).values({ userId: one, role: "admin", organisationId: org!.id, grantedBy: one }).returning();
    expect(await revokeRole(fresh.db, { roleId: g1!.id, allowedOrganisationIds: [org!.id] })).toBe("last_admin");
    await fresh.db.insert(staffRoles).values({ userId: two, role: "admin", organisationId: org!.id, grantedBy: one });
    expect(await revokeRole(fresh.db, { roleId: g1!.id, allowedOrganisationIds: [org!.id] })).toBe("revoked");
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
