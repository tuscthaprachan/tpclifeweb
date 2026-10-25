import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BootstrapError, runRecovery } from "@/lib/auth/bootstrap";
import {
  claimRecoveryLink,
  findRecoveryByToken,
  hasOtherActiveAdmin,
  issueRecoveryLink,
  RECOVERY_TTL_HOURS,
  RecoveryError,
  recoveryStatus,
} from "@/lib/auth/recovery";
import { consumeTokenAttempt, TOKEN_ATTEMPT_RULE } from "@/lib/auth/rate-limit";
import { hashToken } from "@/lib/auth/tokens";
import { auditLog, organisations, session, staffRecoveryLinks, staffRoles, user } from "@/lib/db/schema";
import { createTestDb, makeUser } from "../db/harness";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

type TestDb = Awaited<ReturnType<typeof createTestDb>>["db"];

let db: TestDb;
let tusu: number;
let tusc: number;
let admin: string;
let editor: string;
let otherOrgEditor: string;

async function grant(userId: string, role: "admin" | "editor", organisationId: number) {
  await db.insert(staffRoles).values({ userId, role, organisationId, grantedBy: userId });
}

async function code(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    return error instanceof RecoveryError ? error.code : String(error);
  }
  return undefined;
}

beforeEach(async () => {
  ({ db } = await createTestDb());
  const orgs = await db.select().from(organisations);
  tusu = orgs.find((o) => o.slug === "tusu")!.id;
  tusc = orgs.find((o) => o.slug === "tusc")!.id;
  admin = await makeUser(db, "Admin");
  editor = await makeUser(db, "Editor");
  otherOrgEditor = await makeUser(db, "Other");
  await grant(admin, "admin", tusu);
  await grant(editor, "editor", tusu);
  await grant(otherOrgEditor, "editor", tusc);
});

describe("issuing a recovery link", () => {
  it("expires in 24 hours and stores only the hash", async () => {
    const now = new Date("2026-03-01T00:00:00Z");
    const { link, token } = await issueRecoveryLink(db, { userId: editor, issuedBy: admin, allowedOrganisationIds: [tusu], now });
    expect(RECOVERY_TTL_HOURS).toBe(24);
    expect(link.expiresAt).toEqual(new Date("2026-03-02T00:00:00Z"));
    expect(link.tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(await db.select().from(staffRecoveryLinks))).not.toContain(token);
    expect((await findRecoveryByToken(db, token))?.link.id).toBe(link.id);
    expect(await findRecoveryByToken(db, link.tokenHash)).toBeNull();
    expect(await findRecoveryByToken(db, "")).toBeNull();
  });

  it("audits the issue without the token", async () => {
    const { token, link } = await issueRecoveryLink(db, { userId: editor, issuedBy: admin, allowedOrganisationIds: [tusu] });
    const rows = (await db.select().from(auditLog)).filter((r) => r.action === "staff_recovery.issue");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actorUserId: admin, entityId: String(link.id) });
    expect(JSON.stringify(rows)).not.toContain(token);
    expect(JSON.stringify(rows)).not.toContain(link.tokenHash);
  });

  it("only reaches staff in an organisation the admin administers", async () => {
    expect(await code(issueRecoveryLink(db, { userId: otherOrgEditor, issuedBy: admin, allowedOrganisationIds: [tusu] }))).toBe("out_of_scope");
    await expect(issueRecoveryLink(db, { userId: otherOrgEditor, issuedBy: admin, allowedOrganisationIds: [tusu, tusc] })).resolves.toBeTruthy();
  });

  it("refuses people who are not staff, and people who do not exist", async () => {
    const student = await makeUser(db, "Student");
    expect(await code(issueRecoveryLink(db, { userId: student, issuedBy: admin, allowedOrganisationIds: [tusu] }))).toBe("not_staff");
    expect(await code(issueRecoveryLink(db, { userId: "nobody", issuedBy: admin, allowedOrganisationIds: [tusu] }))).toBe("unknown_user");
    await db.update(staffRoles).set({ revokedAt: new Date() }).where(eq(staffRoles.userId, editor));
    expect(await code(issueRecoveryLink(db, { userId: editor, issuedBy: admin, allowedOrganisationIds: [tusu] }))).toBe("not_staff");
  });

  it("supersedes an earlier pending link", async () => {
    const first = await issueRecoveryLink(db, { userId: editor, issuedBy: admin, allowedOrganisationIds: [tusu] });
    await issueRecoveryLink(db, { userId: editor, issuedBy: admin, allowedOrganisationIds: [tusu] });
    const old = await findRecoveryByToken(db, first.token);
    expect(recoveryStatus(old!.link, new Date())).toBe("revoked");
    expect(await code(claimRecoveryLink(db, { token: first.token }))).toBe("revoked");
    expect((await db.select().from(auditLog)).map((r) => r.action)).toContain("staff_recovery.supersede");
  });

  describe("the lockout rule", () => {
    it("stops the only admin recovering themselves", async () => {
      expect(await hasOtherActiveAdmin(db, admin)).toBe(false);
      expect(await code(issueRecoveryLink(db, { userId: admin, issuedBy: admin, allowedOrganisationIds: [tusu] }))).toBe("last_admin");
      expect(await db.select().from(staffRecoveryLinks)).toHaveLength(0);
    });

    it("allows it once another admin exists, in any organisation", async () => {
      await grant(otherOrgEditor, "admin", tusc);
      expect(await hasOtherActiveAdmin(db, admin)).toBe(true);
      await expect(issueRecoveryLink(db, { userId: admin, issuedBy: admin, allowedOrganisationIds: [tusu] })).resolves.toBeTruthy();
    });

    it("ignores a revoked admin when counting", async () => {
      await grant(otherOrgEditor, "admin", tusc);
      await db.update(staffRoles).set({ revokedAt: new Date() }).where(eq(staffRoles.userId, otherOrgEditor));
      expect(await hasOtherActiveAdmin(db, admin)).toBe(false);
    });

    it("lets one admin recover another", async () => {
      const second = await makeUser(db, "Second");
      await grant(second, "admin", tusu);
      await expect(issueRecoveryLink(db, { userId: second, issuedBy: admin, allowedOrganisationIds: [tusu] })).resolves.toBeTruthy();
    });
  });
});

describe("using a recovery link", () => {
  it("is single use, even when claimed twice at once", async () => {
    const { token } = await issueRecoveryLink(db, { userId: editor, issuedBy: admin, allowedOrganisationIds: [tusu] });
    const results = await Promise.allSettled([claimRecoveryLink(db, { token }), claimRecoveryLink(db, { token })]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await code(claimRecoveryLink(db, { token }))).toBe("already_used");
  });

  it("expires", async () => {
    const now = new Date("2026-03-01T00:00:00Z");
    const { token } = await issueRecoveryLink(db, { userId: editor, issuedBy: admin, allowedOrganisationIds: [tusu], now });
    expect(await code(claimRecoveryLink(db, { token, now: new Date(now.getTime() + RECOVERY_TTL_HOURS * 3_600_000) }))).toBe("expired");
    await expect(claimRecoveryLink(db, { token, now: new Date(now.getTime() + RECOVERY_TTL_HOURS * 3_600_000 - 1) })).resolves.toMatchObject({ userId: editor });
  });

  it("knows nothing of unknown tokens", async () => {
    expect(await code(claimRecoveryLink(db, { token: "nonsense" }))).toBe("not_found");
  });

  it("ends the person's sessions and nobody else's, and audits the use", async () => {
    const make = (userId: string, id: string) =>
      db.insert(session).values({ id, userId, token: `tok_${id}`, expiresAt: new Date(Date.now() + 3_600_000) });
    await make(editor, "s1");
    await make(editor, "s2");
    await make(admin, "s3");
    const { token, link } = await issueRecoveryLink(db, { userId: editor, issuedBy: admin, allowedOrganisationIds: [tusu] });
    expect(await claimRecoveryLink(db, { token })).toEqual({ userId: editor, endedSessions: 2 });
    expect((await db.select().from(session)).map((s) => s.id)).toEqual(["s3"]);
    const used = (await db.select().from(auditLog)).filter((r) => r.action === "staff_recovery.use");
    expect(used).toHaveLength(1);
    expect(used[0]).toMatchObject({ actorUserId: editor, entityId: String(link.id) });
    expect(JSON.stringify(used)).not.toContain(token);
  });
});

describe("the break-glass command", () => {
  it("issues a recovery link for an existing admin, with no issuing user", async () => {
    await db.update(user).set({ email: "admin@example.org" }).where(eq(user.id, admin));
    const result = await runRecovery(db, { email: " Admin@Example.org ", baseUrl: "https://example.org/" });
    expect(result.link).toMatch(/^https:\/\/example\.org\/admin\/recover\/[\w-]{43}$/);
    const token = result.link.split("/").pop()!;
    const found = await findRecoveryByToken(db, token);
    expect(found?.person.id).toBe(admin);
    expect(found?.link.issuedBy).toBeNull();
    expect(result.expiresAt).toEqual(found?.link.expiresAt);
    const row = (await db.select().from(auditLog)).find((r) => r.action === "staff_recovery.issue");
    expect(row?.actorUserId).toBeNull();
    expect(row?.after).toMatchObject({ viaCommandLine: true });
  });

  it("works for the only admin, which is the whole point", async () => {
    await db.update(user).set({ email: "admin@example.org" }).where(eq(user.id, admin));
    expect(await hasOtherActiveAdmin(db, admin)).toBe(false);
    await expect(runRecovery(db, { email: "admin@example.org", baseUrl: "https://example.org" })).resolves.toBeTruthy();
  });

  it("refuses an unknown address and anyone who is not an admin, in plain words", async () => {
    await db.update(user).set({ email: "editor@example.org" }).where(eq(user.id, editor));
    await expect(runRecovery(db, { email: "nobody@example.org", baseUrl: "https://example.org" })).rejects.toThrow(BootstrapError);
    await expect(runRecovery(db, { email: "editor@example.org", baseUrl: "https://example.org" })).rejects.toThrow(/not an administrator/);
    expect(await db.select().from(staffRecoveryLinks)).toHaveLength(0);
  });
});

describe("token attempt limit", () => {
  it("allows a generous number from one address, then blocks it, without affecting others", async () => {
    const now = Date.now();
    for (let i = 0; i < TOKEN_ATTEMPT_RULE.max; i += 1) {
      expect((await consumeTokenAttempt(db, "198.51.100.1")).allowed).toBe(true);
    }
    const blocked = await consumeTokenAttempt(db, "198.51.100.1");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect((await consumeTokenAttempt(db, "198.51.100.2")).allowed).toBe(true);
    expect(Date.now() - now).toBeLessThan(30_000);
  });
});
