import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { acceptInvite, createInvite, InviteError } from "@/lib/auth/invites";
import { claimRecoveryLink, issueRecoveryLink, listPendingRecoveryUserIds } from "@/lib/auth/recovery";
import { memberState, revokeRole, suspendMember } from "@/lib/auth/staff";
import { tokenPending, tokenState } from "@/lib/auth/token-state";
import { auditLog, organisations, session, staffInvites, staffMemberships, staffRecoveryLinks, staffRoles } from "@/lib/db/schema";
import { createTestDb, makeUser } from "../db/harness";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

type TestDb = Awaited<ReturnType<typeof createTestDb>>["db"];
let db: TestDb;
let tusu: number;

beforeAll(async () => {
  ({ db } = await createTestDb());
  tusu = (await db.select().from(organisations)).find((o) => o.slug === "tusu")!.id;
});

const t0 = new Date("2026-06-01T12:00:00Z");

describe("tokenState", () => {
  it("is pending until spent, revoked or past its end", () => {
    const end = new Date(t0.getTime() + 1000);
    expect(tokenState({ revokedAt: null, expiresAt: end }, t0)).toBe("pending");
    expect(tokenState({ revokedAt: null, expiresAt: null }, t0)).toBe("pending");
    expect(tokenState({ consumedAt: t0, revokedAt: t0, expiresAt: t0 }, t0)).toBe("accepted");
    expect(tokenState({ revokedAt: t0, expiresAt: t0 }, t0)).toBe("revoked");
    expect(tokenState({ revokedAt: null, expiresAt: t0 }, t0)).toBe("expired");
  });

  it("matches its SQL twin at the boundary instant", async () => {
    const hour = 3_600_000;
    for (const offset of [-hour, -1, 0, 1, hour]) {
      const expiresAt = new Date(t0.getTime() + offset);
      const [row] = await db
        .insert(staffInvites)
        .values({ email: `p${offset}@x.test`, organisationIds: [tusu], roles: ["editor"], tokenHash: `h${offset}`, expiresAt })
        .returning();
      const matches = await db.select({ id: staffInvites.id }).from(staffInvites).where(
        tokenPending({ consumedAt: staffInvites.acceptedAt, revokedAt: staffInvites.revokedAt, expiresAt: staffInvites.expiresAt }, t0),
      );
      expect(matches.some((m) => m.id === row!.id)).toBe(tokenState({ revokedAt: null, expiresAt }, t0) === "pending");
    }
  });
});

describe("superseding", () => {
  it("does not mark an already expired invite or link as revoked", async () => {
    const boss = await makeUser(db, "Boss");
    await db.insert(staffRoles).values({ userId: boss, role: "admin", grantedBy: boss });
    const old = await createInvite(db, { email: "old@x.test", organisationIds: [tusu], roles: ["editor"], invitedBy: boss, now: t0 });
    await createInvite(db, { email: "old@x.test", organisationIds: [tusu], roles: ["editor"], invitedBy: boss, now: new Date(t0.getTime() + 30 * 86_400_000) });
    const [row] = await db.select().from(staffInvites).where(eq(staffInvites.id, old.invite.id));
    expect(row!.revokedAt).toBeNull();

    const person = await makeUser(db, "Person");
    await db.insert(staffRoles).values({ userId: person, role: "editor", grantedBy: boss });
    const first = await issueRecoveryLink(db, { userId: person, issuedBy: boss, now: t0 });
    await issueRecoveryLink(db, { userId: person, issuedBy: boss, now: new Date(t0.getTime() + 3 * 86_400_000) });
    const [link] = await db.select().from(staffRecoveryLinks).where(eq(staffRecoveryLinks.id, first.link.id));
    expect(link!.revokedAt).toBeNull();
  });
});

describe("a lost race", () => {
  it("reports the state the row is really in", async () => {
    const boss = await makeUser(db, "Boss2");
    const a = await makeUser(db, "Racer");
    const { token } = await createInvite(db, { email: "racer@x.test", organisationIds: [tusu], roles: ["editor"], invitedBy: boss, now: t0 });
    const input = { token, userId: a, userEmail: "racer@x.test", now: t0 };
    const results = await Promise.allSettled([acceptInvite(db, input), acceptInvite(db, input)]);
    const lost = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(lost).toHaveLength(1);
    expect(lost[0]!.reason).toBeInstanceOf(InviteError);
    expect((lost[0]!.reason as InviteError).code).toBe("already_accepted");
  });
});

describe("memberState", () => {
  it("is active with a role, suspended with only a body, none with neither", () => {
    expect(memberState({ roleCount: 1, organisationCount: 0 })).toBe("active");
    expect(memberState({ roleCount: 0, organisationCount: 1 })).toBe("suspended");
    expect(memberState({ roleCount: 0, organisationCount: 0 })).toBe("none");
  });
});

describe("revoking a role", () => {
  async function member(name: string, roles: Array<"admin" | "editor" | "officer">) {
    const id = await makeUser(db, name);
    const granted = [];
    for (const role of roles) {
      const [row] = await db.insert(staffRoles).values({ userId: id, role, grantedBy: id }).returning();
      granted.push(row!);
    }
    await db.insert(staffMemberships).values({ userId: id, organisationId: tusu, addedBy: id });
    await db.insert(session).values({ id: `s-${id}`, userId: id, token: `t-${id}`, expiresAt: new Date(Date.now() + 1e9), createdAt: new Date(), updatedAt: new Date() });
    return { id, granted };
  }

  it("ends sessions and revokes pending recovery links when the last role goes", async () => {
    const { id, granted } = await member("OneRole", ["editor"]);
    await issueRecoveryLink(db, { userId: id, issuedBy: null, now: new Date() });
    expect(await revokeRole(db, { roleId: granted[0]!.id })).toBe("revoked");
    expect(await db.select().from(session).where(eq(session.userId, id))).toHaveLength(0);
    expect((await listPendingRecoveryUserIds(db, [id])).size).toBe(0);
    const audit = (await db.select().from(auditLog)).find((r) => r.action === "staff_role.revoke" && r.entityId === String(granted[0]!.id));
    expect(audit?.after).toMatchObject({ endedSessions: 1, revokedRecoveryLinks: 1 });
  });

  it("keeps sessions and links while another role remains", async () => {
    const { id, granted } = await member("TwoRoles", ["editor", "officer"]);
    await issueRecoveryLink(db, { userId: id, issuedBy: null, now: new Date() });
    await revokeRole(db, { roleId: granted[0]!.id });
    expect(await db.select().from(session).where(eq(session.userId, id))).toHaveLength(1);
    expect((await listPendingRecoveryUserIds(db, [id])).has(id)).toBe(true);
  });

  it("suspending also revokes pending recovery links, so a suspended person cannot be recovered back in", async () => {
    const boss = await makeUser(db, "Boss3");
    await db.insert(staffRoles).values({ userId: boss, role: "admin", grantedBy: boss });
    const { id } = await member("Suspended", ["editor"]);
    const { token } = await issueRecoveryLink(db, { userId: id, issuedBy: boss });
    expect(await suspendMember(db, { userId: id, actorUserId: boss })).toBe("suspended");
    await expect(claimRecoveryLink(db, { token })).rejects.toMatchObject({ code: "revoked" });
  });
});
