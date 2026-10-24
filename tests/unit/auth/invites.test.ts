import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { runBootstrap, BootstrapError } from "@/lib/auth/bootstrap";
import {
  acceptInvite,
  createInvite,
  findInviteByToken,
  INVITE_TTL_DAYS,
  InviteError,
  inviteStatus,
  revokeInvite,
} from "@/lib/auth/invites";
import { getStaffRoles } from "@/lib/auth/roles";
import { hashToken } from "@/lib/auth/tokens";
import { auditLog, organisations, staffInvites, staffRoles, user } from "@/lib/db/schema";
import { createTestDb, makeUser } from "../db/harness";

// Each test may boot an in-memory Postgres and run every migration, which is slow on a busy machine.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

type TestDb = Awaited<ReturnType<typeof createTestDb>>["db"];

let db: TestDb;
let tusu: number;
let tusc: number;
let admin: string;
let n = 0;
const email = () => `person${++n}@example.org`;

beforeAll(async () => {
  ({ db } = await createTestDb());
  const orgs = await db.select().from(organisations);
  tusu = orgs.find((o) => o.slug === "tusu")!.id;
  tusc = orgs.find((o) => o.slug === "tusc")!.id;
  admin = await makeUser(db, "Admin");
});

async function auditActions(): Promise<string[]> {
  return (await db.select().from(auditLog)).map((r) => r.action);
}

describe("creating an invite", () => {
  it("stores only the hash of the token, and expires in 7 days", async () => {
    const now = new Date("2026-03-01T00:00:00Z");
    const { invite, token } = await createInvite(db, { email: email(), organisationId: tusu, roles: ["editor"], invitedBy: admin, now });
    expect(INVITE_TTL_DAYS).toBe(7);
    expect(invite.expiresAt).toEqual(new Date("2026-03-08T00:00:00Z"));
    expect(invite.tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(invite)).not.toContain(token);
    const stored = await db.select().from(staffInvites).where(eq(staffInvites.id, invite.id));
    expect(JSON.stringify(stored)).not.toContain(token);
  });

  it("normalises the address, dedupes and orders roles", async () => {
    const { invite } = await createInvite(db, {
      email: "  Mixed.Case@Example.ORG ",
      organisationId: tusc,
      roles: ["unit_lead", "admin", "admin"],
      invitedBy: admin,
    });
    expect(invite.email).toBe("mixed.case@example.org");
    expect(invite.roles).toEqual(["admin", "unit_lead"]);
  });

  it("writes an audit row that does not contain the token or its hash", async () => {
    const { invite, token } = await createInvite(db, { email: email(), organisationId: tusu, roles: ["lf_officer"], invitedBy: admin });
    const rows = (await db.select().from(auditLog)).filter((r) => r.action === "staff_invite.create" && r.entityId === String(invite.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.actorUserId).toBe(admin);
    expect(rows[0]?.actorOrganisationId).toBe(tusu);
    const text = JSON.stringify(rows[0]);
    expect(text).not.toContain(token);
    expect(text).not.toContain(invite.tokenHash);
  });

  it("rejects bad input without writing anything", async () => {
    const before = (await db.select().from(staffInvites)).length;
    await expect(createInvite(db, { email: "nope", organisationId: tusu, roles: ["editor"], invitedBy: admin })).rejects.toMatchObject({ code: "invalid_email" });
    await expect(createInvite(db, { email: email(), organisationId: tusu, roles: [], invitedBy: admin })).rejects.toMatchObject({ code: "no_roles" });
    await expect(createInvite(db, { email: email(), organisationId: tusu, roles: ["root"], invitedBy: admin })).rejects.toMatchObject({ code: "invalid_role" });
    await expect(createInvite(db, { email: email(), organisationId: 9999, roles: ["editor"], invitedBy: admin })).rejects.toMatchObject({ code: "unknown_organisation" });
    expect((await db.select().from(staffInvites)).length).toBe(before);
  });

  it("supersedes an earlier pending invite for the same address and organisation", async () => {
    const to = email();
    const first = await createInvite(db, { email: to, organisationId: tusu, roles: ["editor"], invitedBy: admin });
    const second = await createInvite(db, { email: to, organisationId: tusu, roles: ["editor"], invitedBy: admin });
    const [old] = await db.select().from(staffInvites).where(eq(staffInvites.id, first.invite.id));
    expect(old?.revokedAt).not.toBeNull();
    await expect(acceptInvite(db, { token: first.token, userId: admin, userEmail: to })).rejects.toMatchObject({ code: "revoked" });
    expect(second.invite.revokedAt).toBeNull();
  });
});

describe("accepting an invite", () => {
  it("grants every role in one audited transaction", async () => {
    const to = email();
    const person = await makeUser(db, "Person");
    const { invite, token } = await createInvite(db, { email: to, organisationId: tusc, roles: ["editor", "lf_officer"], invitedBy: admin });

    const result = await acceptInvite(db, { token, userId: person, userEmail: to.toUpperCase(), context: { ip: "203.0.113.5" } });
    expect(result).toEqual({ organisationId: tusc, roles: ["editor", "lf_officer"] });

    expect((await getStaffRoles(person, db)).map((r) => r.role).sort()).toEqual(["editor", "lf_officer"]);
    const grants = await db.select().from(staffRoles).where(eq(staffRoles.userId, person));
    expect(grants.every((g) => g.grantedBy === admin && g.organisationId === tusc)).toBe(true);

    const [after] = await db.select().from(staffInvites).where(eq(staffInvites.id, invite.id));
    expect(after?.acceptedAt).not.toBeNull();

    const rows = (await db.select().from(auditLog)).filter((r) => r.actorUserId === person);
    expect(rows.map((r) => r.action).sort()).toEqual(["staff_invite.accept", "staff_role.grant", "staff_role.grant"]);
    expect(rows.every((r) => r.ip === "203.0.113.5" && r.actorOrganisationId === tusc)).toBe(true);
  });

  it("cannot be used twice, even concurrently", async () => {
    const to = email();
    const a = await makeUser(db);
    const b = await makeUser(db);
    const { token } = await createInvite(db, { email: to, organisationId: tusu, roles: ["editor"], invitedBy: admin });
    const results = await Promise.allSettled([
      acceptInvite(db, { token, userId: a, userEmail: to }),
      acceptInvite(db, { token, userId: b, userEmail: to }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(InviteError);
    const granted = [...(await getStaffRoles(a, db)), ...(await getStaffRoles(b, db))];
    expect(granted).toHaveLength(1);
  });

  it("refuses an expired invite and grants nothing", async () => {
    const to = email();
    const person = await makeUser(db);
    const now = new Date("2026-03-01T00:00:00Z");
    const { token, invite } = await createInvite(db, { email: to, organisationId: tusu, roles: ["editor"], invitedBy: admin, now });
    const eightDaysOn = new Date(now.getTime() + 8 * 24 * 3600 * 1000);
    expect(inviteStatus(invite, eightDaysOn)).toBe("expired");
    await expect(acceptInvite(db, { token, userId: person, userEmail: to, now: eightDaysOn })).rejects.toMatchObject({ code: "expired" });
    expect(await getStaffRoles(person, db)).toEqual([]);
  });

  it("still accepts on the last day", async () => {
    const to = email();
    const person = await makeUser(db);
    const now = new Date("2026-03-01T00:00:00Z");
    const { token } = await createInvite(db, { email: to, organisationId: tusu, roles: ["editor"], invitedBy: admin, now });
    const sixDaysOn = new Date(now.getTime() + 6.9 * 24 * 3600 * 1000);
    await expect(acceptInvite(db, { token, userId: person, userEmail: to, now: sixDaysOn })).resolves.toBeTruthy();
  });

  it("refuses a revoked invite", async () => {
    const to = email();
    const person = await makeUser(db);
    const { token, invite } = await createInvite(db, { email: to, organisationId: tusu, roles: ["editor"], invitedBy: admin });
    expect(await revokeInvite(db, { inviteId: invite.id, context: { actorUserId: admin } })).toBe(true);
    await expect(acceptInvite(db, { token, userId: person, userEmail: to })).rejects.toMatchObject({ code: "revoked" });
    expect(await getStaffRoles(person, db)).toEqual([]);
  });

  it("refuses a wrong token, and a different person's address", async () => {
    const to = email();
    const person = await makeUser(db);
    const { token } = await createInvite(db, { email: to, organisationId: tusu, roles: ["editor"], invitedBy: admin });
    await expect(acceptInvite(db, { token: "not-a-token", userId: person, userEmail: to })).rejects.toMatchObject({ code: "not_found" });
    await expect(acceptInvite(db, { token, userId: person, userEmail: "someone.else@example.org" })).rejects.toMatchObject({ code: "email_mismatch" });
    expect(await getStaffRoles(person, db)).toEqual([]);
    // The failed attempts did not use the invite up.
    await expect(acceptInvite(db, { token, userId: person, userEmail: to })).resolves.toBeTruthy();
  });

  it("rolls everything back if a grant cannot be written", async () => {
    const to = email();
    const { token, invite } = await createInvite(db, { email: to, organisationId: tusu, roles: ["editor"], invitedBy: admin });
    const before = (await auditActions()).filter((a) => a === "staff_invite.accept").length;
    // No such user: the staff_roles foreign key fails after the invite was already claimed.
    await expect(acceptInvite(db, { token, userId: "ghost-user", userEmail: to })).rejects.toThrow();
    const [after] = await db.select().from(staffInvites).where(eq(staffInvites.id, invite.id));
    expect(after?.acceptedAt).toBeNull();
    expect((await auditActions()).filter((a) => a === "staff_invite.accept").length).toBe(before);
  });

  it("does not duplicate a role the person already holds", async () => {
    const to = email();
    const person = await makeUser(db);
    await db.insert(staffRoles).values({ userId: person, role: "editor", organisationId: tusu, grantedBy: admin });
    const { token } = await createInvite(db, { email: to, organisationId: tusu, roles: ["editor", "lf_officer"], invitedBy: admin });
    await acceptInvite(db, { token, userId: person, userEmail: to });
    expect(await getStaffRoles(person, db)).toHaveLength(2);
  });
});

describe("looking invites up", () => {
  it("finds by raw token, never by its hash", async () => {
    const to = email();
    const { token, invite } = await createInvite(db, { email: to, organisationId: tusu, roles: ["editor"], invitedBy: admin });
    expect((await findInviteByToken(db, token))?.invite.id).toBe(invite.id);
    expect(await findInviteByToken(db, invite.tokenHash)).toBeNull();
    await revokeInvite(db, { inviteId: invite.id });
    const revoked = await findInviteByToken(db, token);
    expect(revoked && inviteStatus(revoked.invite, new Date())).toBe("revoked");
  });
});

describe("revoking an invite", () => {
  it("is audited, only for pending invites, and only within allowed organisations", async () => {
    const { invite } = await createInvite(db, { email: email(), organisationId: tusu, roles: ["editor"], invitedBy: admin });
    expect(await revokeInvite(db, { inviteId: invite.id, allowedOrganisationIds: [tusc], context: { actorUserId: admin } })).toBe(false);
    expect(await revokeInvite(db, { inviteId: invite.id, allowedOrganisationIds: [tusu], context: { actorUserId: admin } })).toBe(true);
    expect(await revokeInvite(db, { inviteId: invite.id })).toBe(false);
    const rows = (await db.select().from(auditLog)).filter((r) => r.action === "staff_invite.revoke" && r.entityId === String(invite.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.actorUserId).toBe(admin);
  });
});

describe("first admin bootstrap", () => {
  it("makes an admin invite with no inviter, then refuses once an admin exists", async () => {
    const fresh = await createTestDb();
    const result = await runBootstrap(fresh.db, { email: "first@example.org", organisationSlug: "tusu", baseUrl: "https://example.org/" });
    expect(result.link).toMatch(/^https:\/\/example\.org\/admin\/invite\/[A-Za-z0-9_-]{43}$/);
    const [invite] = await fresh.db.select().from(staffInvites);
    expect(invite?.invitedBy).toBeNull();
    expect(invite?.roles).toEqual(["admin"]);
    expect(result.link).not.toContain(invite!.tokenHash);

    // The new admin accepts: they are recorded as granting their own role.
    const first = await makeUser(fresh.db, "First");
    await fresh.db.update(user).set({ email: "first@example.org" }).where(eq(user.id, first));
    const token = result.link.split("/").pop()!;
    await acceptInvite(fresh.db, { token, userId: first, userEmail: "first@example.org" });
    const [grant] = await fresh.db.select().from(staffRoles);
    expect(grant).toMatchObject({ userId: first, role: "admin", grantedBy: first });

    await expect(
      runBootstrap(fresh.db, { email: "second@example.org", organisationSlug: "tusc", baseUrl: "https://example.org" }),
    ).rejects.toThrow(BootstrapError);
    expect(await fresh.db.select().from(staffInvites)).toHaveLength(1);
  });

  it("refuses for the other organisation too, and for a revoked admin it allows a new start", async () => {
    const fresh = await createTestDb();
    const boss = await makeUser(fresh.db);
    const [tusuRow] = await fresh.db.select().from(organisations).where(eq(organisations.slug, "tusu"));
    const [grant] = await fresh.db
      .insert(staffRoles)
      .values({ userId: boss, role: "admin", organisationId: tusuRow!.id, grantedBy: boss })
      .returning();
    await expect(runBootstrap(fresh.db, { email: "x@example.org", organisationSlug: "tusc", baseUrl: "https://example.org" })).rejects.toThrow(/already exists/);
    await fresh.db.update(staffRoles).set({ revokedAt: new Date() }).where(eq(staffRoles.id, grant!.id));
    await expect(runBootstrap(fresh.db, { email: "x@example.org", organisationSlug: "tusc", baseUrl: "https://example.org" })).resolves.toBeTruthy();
  });

  it("explains an unknown organisation and records the invite in the audit log", async () => {
    const fresh = await createTestDb();
    await expect(runBootstrap(fresh.db, { email: "x@example.org", organisationSlug: "nope", baseUrl: "https://example.org" })).rejects.toThrow(/db:seed/);
    await runBootstrap(fresh.db, { email: "x@example.org", organisationSlug: "tusu", baseUrl: "https://example.org" });
    const rows = await fresh.db.select().from(auditLog);
    expect(rows.map((r) => r.action)).toEqual(["staff_invite.create"]);
    expect(rows[0]?.actorUserId).toBeNull();
  });
});
