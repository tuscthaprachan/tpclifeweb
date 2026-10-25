/**
 * Better Auth wired to PGlite with a software authenticator: account creation
 * from an invite, passkey sign-in, adding a passkey, recovery, and the audit
 * trail. The passkey plugin's own verification runs unmocked; only the
 * authenticator is simulated (virtual-authenticator.ts).
 */

import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { decideAccess } from "@/lib/auth/access";
import { encodeCeremonyContext } from "@/lib/auth/ceremony";
import { createAuth } from "@/lib/auth/create";
import { createInvite, revokeInvite } from "@/lib/auth/invites";
import { issueRecoveryLink } from "@/lib/auth/recovery";
import { getStaffRoles } from "@/lib/auth/roles";
import { auditLog, organisations, passkey, session, staffInvites, staffRecoveryLinks, staffRoles, user } from "@/lib/db/schema";
import { createTestDb } from "../db/harness";
import { VirtualAuthenticator } from "./virtual-authenticator";

// Each test may boot an in-memory Postgres and run every migration, which is slow on a busy machine.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const SECRET = "test-secret-test-secret-test-secret-0123456789";
const ORIGIN = "http://localhost:3000";

async function setup() {
  const { db } = await createTestDb();
  const auth = createAuth({ db, secret: SECRET, baseURL: ORIGIN, useNextCookies: false });
  const [tusu] = await db.select().from(organisations).where(eq(organisations.slug, "tusu"));
  return { db, auth, org: tusu! };
}

type Ctx = Awaited<ReturnType<typeof setup>>;

/** Cookie header from a Better Auth response's Set-Cookie list. */
function cookieFrom(headers: Headers, previous = ""): string {
  const jar = new Map(previous.split("; ").filter(Boolean).map((c) => [c.split("=")[0]!, c] as const));
  for (const line of headers.getSetCookie()) {
    const pair = line.split(";")[0]!;
    jar.set(pair.split("=")[0]!, pair);
  }
  return [...jar.values()].join("; ");
}

/** Everything the browser does for `addPasskey`, against the server API. */
async function register(ctx: Ctx, authenticator: VirtualAuthenticator, opts: { context?: unknown; cookie?: string; createSession?: boolean }) {
  const headers = new Headers({ origin: ORIGIN, "x-forwarded-for": "203.0.113.7" });
  if (opts.cookie) headers.set("cookie", opts.cookie);
  const generated = await ctx.auth.api.generatePasskeyRegistrationOptions({
    headers,
    query: opts.context ? { context: encodeCeremonyContext(opts.context as never) } : {},
    returnHeaders: true,
  });
  const cookie = cookieFrom(generated.headers, opts.cookie);
  const verified = await ctx.auth.api.verifyPasskeyRegistration({
    headers: new Headers({ origin: ORIGIN, cookie, "x-forwarded-for": "203.0.113.7" }),
    body: { response: authenticator.register(generated.response as never), ...(opts.createSession === false ? {} : { createSession: true }) },
    returnHeaders: true,
  });
  return { cookie: cookieFrom(verified.headers, cookie), passkey: verified.response as { id: string; userId: string; name?: string } };
}

/** Discoverable sign-in: no email, no session. */
async function signIn(ctx: Ctx, authenticator: VirtualAuthenticator) {
  const generated = await ctx.auth.api.generatePasskeyAuthenticationOptions({ headers: new Headers({ origin: ORIGIN }), returnHeaders: true });
  const cookie = cookieFrom(generated.headers);
  const verified = await ctx.auth.api.verifyPasskeyAuthentication({
    headers: new Headers({ origin: ORIGIN, cookie }),
    body: { response: authenticator.assert(generated.response as never) as never },
    returnHeaders: true,
  });
  return { cookie: cookieFrom(verified.headers, cookie), userId: (verified.response as { user: { id: string } }).user.id };
}

async function inviteFor(ctx: Ctx, email: string, roles: string[] = ["editor"]) {
  return createInvite(ctx.db, { email, organisationId: ctx.org.id, roles, invitedBy: null });
}

async function enrol(ctx: Ctx, token: string, name = "Somchai Jaidee", authenticator = new VirtualAuthenticator(ORIGIN)) {
  const result = await register(ctx, authenticator, { context: { kind: "invite", token, name } });
  return { ...result, authenticator };
}

async function actions(ctx: Ctx): Promise<string[]> {
  return (await ctx.db.select().from(auditLog)).map((r) => r.action);
}

describe("creating an account from an invite", () => {
  let ctx: Ctx;
  beforeEach(async () => {
    ctx = await setup();
  });

  it("creates the account, grants the roles and signs the person in, all from a passkey", async () => {
    const { token, invite } = await inviteFor(ctx, "New.Person@Example.org", ["editor", "lf_officer"]);
    const { cookie, passkey: created } = await enrol(ctx, token);

    const [account] = await ctx.db.select().from(user).where(eq(user.email, "new.person@example.org"));
    expect(account).toMatchObject({ name: "Somchai Jaidee", emailVerified: false });
    expect(created.userId).toBe(account!.id);
    expect(await getStaffRoles(account!.id, ctx.db)).toHaveLength(2);
    const [spent] = await ctx.db.select().from(staffInvites).where(eq(staffInvites.id, invite.id));
    expect(spent?.acceptedAt).toBeTruthy();
    const [key] = await ctx.db.select().from(passkey).where(eq(passkey.userId, account!.id));
    expect(key?.name).toMatch(/^Passkey \d{4}-\d{2}-\d{2}$/);

    // The registration itself signed them in, with the marker the console needs.
    const current = await ctx.auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(current?.user.id).toBe(account!.id);
    const marker = (current?.session as { secondFactorAt?: Date | null }).secondFactorAt;
    expect(marker).toBeTruthy();
    const roles = await getStaffRoles(account!.id, ctx.db);
    const decision = decideAccess({
      session: { updatedAt: new Date(current!.session.updatedAt), expiresAt: new Date(current!.session.expiresAt), secondFactorAt: new Date(marker!) },
      now: new Date(),
      roles,
    });
    expect(decision.kind).toBe("ok");
  });

  it("audits the account creation, the invite, the roles, the passkey and the sign-in", async () => {
    const { token } = await inviteFor(ctx, "a@example.org");
    await enrol(ctx, token);
    expect(await actions(ctx)).toEqual(
      expect.arrayContaining(["staff_invite.create", "staff_account.create", "staff_invite.accept", "staff_role.grant", "auth.passkey.register", "auth.sign_in"]),
    );
    const [created] = await ctx.db.select().from(auditLog).where(eq(auditLog.action, "staff_account.create"));
    expect(JSON.stringify(created)).not.toContain(token);
  });

  it("works once: the same link cannot make a second account or passkey", async () => {
    const { token } = await inviteFor(ctx, "a@example.org");
    await enrol(ctx, token);
    await expect(enrol(ctx, token, "Someone Else")).rejects.toMatchObject({ body: { message: "link_unusable" } });
    expect(await ctx.db.select().from(user)).toHaveLength(1);
    expect(await ctx.db.select().from(passkey)).toHaveLength(1);
  });

  it("refuses an expired, cancelled or unknown link without creating anything", async () => {
    const expired = await inviteFor(ctx, "old@example.org");
    await ctx.db.update(staffInvites).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(staffInvites.id, expired.invite.id));
    const cancelled = await inviteFor(ctx, "cancelled@example.org");
    await revokeInvite(ctx.db, { inviteId: cancelled.invite.id });
    for (const token of [expired.token, cancelled.token, "not-a-real-token"]) {
      await expect(enrol(ctx, token)).rejects.toMatchObject({ body: { message: "link_unusable" } });
    }
    expect(await ctx.db.select().from(user)).toHaveLength(0);
  });

  it("needs a link: with no link and no session nothing can be registered", async () => {
    await expect(register(ctx, new VirtualAuthenticator(ORIGIN), {})).rejects.toMatchObject({ body: { message: "link_required" } });
    await expect(register(ctx, new VirtualAuthenticator(ORIGIN), { context: { kind: "recover", token: "nope" } })).rejects.toMatchObject({
      body: { message: "link_unusable" },
    });
  });

  it("needs a name", async () => {
    const { token } = await inviteFor(ctx, "a@example.org");
    await expect(enrol(ctx, token, "   ")).rejects.toMatchObject({ body: { message: "name_required" } });
  });

  it("insists the authenticator verified the person, and leaves the invite unspent when it did not", async () => {
    const { token, invite } = await inviteFor(ctx, "a@example.org");
    await expect(enrol(ctx, token, "Somchai", new VirtualAuthenticator(ORIGIN, { userVerified: false }))).rejects.toMatchObject({
      body: { message: "user_verification_required" },
    });
    expect(await ctx.db.select().from(user)).toHaveLength(0);
    const [still] = await ctx.db.select().from(staffInvites).where(eq(staffInvites.id, invite.id));
    expect(still?.acceptedAt).toBeNull();
    await expect(enrol(ctx, token)).resolves.toBeTruthy();
  });

  it("will not let an invite attach a passkey to an account that already exists", async () => {
    const first = await inviteFor(ctx, "a@example.org");
    const { authenticator } = await enrol(ctx, first.token);
    const second = await inviteFor(ctx, "A@example.org", ["admin"]);
    await expect(enrol(ctx, second.token, "Attacker")).rejects.toMatchObject({ body: { message: "account_exists" } });
    expect(await ctx.db.select().from(passkey)).toHaveLength(1);
    const [pending] = await ctx.db.select().from(staffInvites).where(eq(staffInvites.id, second.invite.id));
    expect(pending?.acceptedAt).toBeNull();
    expect(authenticator.id).toBeTruthy();
  });

  it("stores no raw token anywhere in the database", async () => {
    const { token } = await inviteFor(ctx, "a@example.org");
    await enrol(ctx, token);
    const everything = JSON.stringify([await ctx.db.select().from(staffInvites), await ctx.db.select().from(auditLog)]);
    expect(everything).not.toContain(token);
  });
});

describe("signing in with a passkey", () => {
  let ctx: Ctx;
  let authenticator: VirtualAuthenticator;
  let userId: string;
  beforeEach(async () => {
    ctx = await setup();
    const { token } = await inviteFor(ctx, "staff@example.org");
    const made = await enrol(ctx, token);
    authenticator = made.authenticator;
    userId = made.passkey.userId;
    await ctx.db.delete(session);
  });

  it("signs in with no email typed, and marks the session as having passed its second factor", async () => {
    const { cookie, userId: who } = await signIn(ctx, authenticator);
    expect(who).toBe(userId);
    const current = await ctx.auth.api.getSession({ headers: new Headers({ cookie }) });
    expect((current?.session as { secondFactorAt?: Date | null }).secondFactorAt).toBeTruthy();
    const roles = await getStaffRoles(userId, ctx.db);
    expect(
      decideAccess({
        session: {
          updatedAt: new Date(current!.session.updatedAt),
          expiresAt: new Date(current!.session.expiresAt),
          secondFactorAt: new Date((current!.session as { secondFactorAt: Date }).secondFactorAt),
        },
        now: new Date(),
        roles,
      }).kind,
    ).toBe("ok");
  });

  it("records when the passkey was last used and audits the sign-in", async () => {
    const [before] = await ctx.db.select().from(passkey);
    expect(before?.lastUsedAt).toBeNull();
    await signIn(ctx, authenticator);
    const [after] = await ctx.db.select().from(passkey);
    expect(after?.lastUsedAt).toBeInstanceOf(Date);
    const row = (await ctx.db.select().from(auditLog)).filter((r) => r.action === "auth.sign_in").at(-1);
    expect(row?.actorUserId).toBe(userId);
    expect(row?.after).toMatchObject({ method: "passkey" });
  });

  it("refuses a passkey the server has never seen, creates no session and audits the failure", async () => {
    await expect(signIn(ctx, new VirtualAuthenticator(ORIGIN))).rejects.toThrow();
    expect(await ctx.db.select().from(session)).toHaveLength(0);
    expect(await actions(ctx)).toContain("auth.sign_in.failed");
  });

  it("refuses a replayed challenge", async () => {
    const generated = await ctx.auth.api.generatePasskeyAuthenticationOptions({ headers: new Headers({ origin: ORIGIN }), returnHeaders: true });
    const cookie = cookieFrom(generated.headers);
    const body = { response: authenticator.assert(generated.response as never) as never };
    const headers = () => new Headers({ origin: ORIGIN, cookie });
    await ctx.auth.api.verifyPasskeyAuthentication({ headers: headers(), body });
    await expect(ctx.auth.api.verifyPasskeyAuthentication({ headers: headers(), body })).rejects.toThrow();
  });

  it("audits sign-out", async () => {
    const { cookie } = await signIn(ctx, authenticator);
    await ctx.auth.api.signOut({ headers: new Headers({ cookie }) });
    const rows = await ctx.db.select().from(auditLog).where(eq(auditLog.action, "auth.sign_out"));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.actorUserId).toBe(userId);
  });
});

describe("passkeys on an existing account", () => {
  let ctx: Ctx;
  let cookie: string;
  let userId: string;
  beforeEach(async () => {
    ctx = await setup();
    const { token } = await inviteFor(ctx, "staff@example.org");
    const made = await enrol(ctx, token);
    cookie = made.cookie;
    userId = made.passkey.userId;
  });

  it("lets a signed-in person add a second passkey, named and audited", async () => {
    const phone = new VirtualAuthenticator(ORIGIN);
    const added = await register(ctx, phone, { cookie, createSession: false });
    expect(added.passkey.userId).toBe(userId);
    expect(await ctx.db.select().from(passkey).where(eq(passkey.userId, userId))).toHaveLength(2);
    expect(await actions(ctx).then((a) => a.filter((x) => x === "auth.passkey.register"))).toHaveLength(2);
    // And it signs in on its own.
    await expect(signIn(ctx, phone)).resolves.toMatchObject({ userId });
  });

  it("will not register the same authenticator twice for one account", async () => {
    const [first] = await ctx.db.select().from(passkey);
    expect(first).toBeTruthy();
    const generated = await ctx.auth.api.generatePasskeyRegistrationOptions({ headers: new Headers({ origin: ORIGIN, cookie }) });
    expect((generated as { excludeCredentials?: Array<{ id: string }> }).excludeCredentials?.map((c) => c.id)).toContain(first!.credentialID);
  });

  it("asks for resident keys and user verification", async () => {
    const generated = (await ctx.auth.api.generatePasskeyRegistrationOptions({ headers: new Headers({ origin: ORIGIN, cookie }) })) as {
      authenticatorSelection?: { residentKey?: string; userVerification?: string };
      rp: { id: string };
    };
    expect(generated.authenticatorSelection).toMatchObject({ residentKey: "required", userVerification: "required" });
    expect(generated.rp.id).toBe("localhost");
  });

  it("closes Better Auth's own delete and rename, so the last-passkey rule cannot be bypassed", async () => {
    const [key] = await ctx.db.select().from(passkey);
    const headers = new Headers({ cookie, origin: ORIGIN });
    await expect(ctx.auth.api.deletePasskey({ headers, body: { id: key!.id } })).rejects.toMatchObject({ status: "FORBIDDEN" });
    await expect(ctx.auth.api.updatePasskey({ headers, body: { id: key!.id, name: "x" } })).rejects.toMatchObject({ status: "FORBIDDEN" });
    expect(await ctx.db.select().from(passkey)).toHaveLength(1);
  });

  it("refuses to add a passkey from a session that did not come from a passkey", async () => {
    await ctx.db.update(session).set({ secondFactorAt: null }).where(eq(session.userId, userId));
    await expect(ctx.auth.api.generatePasskeyRegistrationOptions({ headers: new Headers({ origin: ORIGIN, cookie }) })).rejects.toMatchObject({
      status: "FORBIDDEN",
    });
  });

  it("cannot create users through Better Auth's own routes", async () => {
    await expect(ctx.auth.api.signUpEmail({ body: { email: "x@example.org", password: "password1234", name: "X" } })).rejects.toThrow();
    expect(await ctx.db.select().from(user)).toHaveLength(1);
  });
});

describe("recovering an account", () => {
  let ctx: Ctx;
  let adminId: string;
  let staffId: string;
  let oldKey: VirtualAuthenticator;
  let adminCookie: string;
  beforeEach(async () => {
    ctx = await setup();
    const admin = await enrol(ctx, (await inviteFor(ctx, "admin@example.org", ["admin"])).token, "Admin");
    adminId = admin.passkey.userId;
    adminCookie = admin.cookie;
    const staff = await enrol(ctx, (await inviteFor(ctx, "staff@example.org")).token, "Staff");
    staffId = staff.passkey.userId;
    oldKey = staff.authenticator;
  });

  async function recoveryToken() {
    return (await issueRecoveryLink(ctx.db, { userId: staffId, issuedBy: adminId, allowedOrganisationIds: [ctx.org.id] })).token;
  }

  it("registers a new passkey on the existing account and signs the person in", async () => {
    const token = await recoveryToken();
    const fresh = new VirtualAuthenticator(ORIGIN);
    const { cookie, passkey: added } = await register(ctx, fresh, { context: { kind: "recover", token } });
    expect(added.userId).toBe(staffId);
    expect(await ctx.db.select().from(user).where(eq(user.email, "staff@example.org"))).toHaveLength(1);
    const current = await ctx.auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(current?.user.id).toBe(staffId);
    expect((current?.session as { secondFactorAt?: Date | null }).secondFactorAt).toBeTruthy();
    expect(await ctx.db.select().from(passkey).where(eq(passkey.userId, staffId))).toHaveLength(2);
    // Their roles are untouched.
    expect(await getStaffRoles(staffId, ctx.db)).toHaveLength(1);
  });

  it("ends every other session, and audits the use", async () => {
    await signIn(ctx, oldKey);
    await signIn(ctx, oldKey);
    const before = await ctx.db.select().from(session).where(eq(session.userId, staffId));
    expect(before.length).toBeGreaterThanOrEqual(2);
    const { cookie } = await register(ctx, new VirtualAuthenticator(ORIGIN), { context: { kind: "recover", token: await recoveryToken() } });
    const after = await ctx.db.select().from(session).where(eq(session.userId, staffId));
    expect(after).toHaveLength(1);
    expect(before.map((s) => s.id)).not.toContain(after[0]!.id);
    expect((await ctx.auth.api.getSession({ headers: new Headers({ cookie }) }))?.user.id).toBe(staffId);
    const use = (await ctx.db.select().from(auditLog)).find((r) => r.action === "staff_recovery.use");
    expect(use?.after).toMatchObject({ userId: staffId });
    expect(await actions(ctx)).toContain("auth.passkey.register");
    // Someone else's sessions are not touched.
    expect(await ctx.db.select().from(session).where(eq(session.userId, adminId))).not.toHaveLength(0);
  });

  it("works once", async () => {
    const token = await recoveryToken();
    await register(ctx, new VirtualAuthenticator(ORIGIN), { context: { kind: "recover", token } });
    await expect(register(ctx, new VirtualAuthenticator(ORIGIN), { context: { kind: "recover", token } })).rejects.toMatchObject({
      body: { message: "link_unusable" },
    });
    expect(await ctx.db.select().from(passkey).where(eq(passkey.userId, staffId))).toHaveLength(2);
  });

  it("stops working after it expires", async () => {
    const token = await recoveryToken();
    await ctx.db.update(staffRecoveryLinks).set({ expiresAt: new Date(Date.now() - 1000) });
    await expect(register(ctx, new VirtualAuthenticator(ORIGIN), { context: { kind: "recover", token } })).rejects.toMatchObject({
      body: { message: "link_unusable" },
    });
    expect(await ctx.db.select().from(passkey).where(eq(passkey.userId, staffId))).toHaveLength(1);
  });

  it("is replaced when a newer link is issued", async () => {
    const first = await recoveryToken();
    const second = await recoveryToken();
    await expect(register(ctx, new VirtualAuthenticator(ORIGIN), { context: { kind: "recover", token: first } })).rejects.toMatchObject({
      body: { message: "link_unusable" },
    });
    await expect(register(ctx, new VirtualAuthenticator(ORIGIN), { context: { kind: "recover", token: second } })).resolves.toBeTruthy();
  });

  it("does not spend the link when the authenticator did not verify the person", async () => {
    const token = await recoveryToken();
    await expect(
      register(ctx, new VirtualAuthenticator(ORIGIN, { userVerified: false }), { context: { kind: "recover", token } }),
    ).rejects.toMatchObject({ body: { message: "user_verification_required" } });
    await expect(register(ctx, new VirtualAuthenticator(ORIGIN), { context: { kind: "recover", token } })).resolves.toBeTruthy();
  });

  it("does not spend the link for someone signed in as a different person", async () => {
    const token = await recoveryToken();
    await expect(
      register(ctx, new VirtualAuthenticator(ORIGIN), { context: { kind: "recover", token }, cookie: adminCookie }),
    ).rejects.toMatchObject({ body: { message: "sign_out_first" } });
    const [link] = await ctx.db.select().from(staffRecoveryLinks).where(eq(staffRecoveryLinks.userId, staffId));
    expect(link?.usedAt).toBeNull();
    expect(await ctx.db.select().from(passkey).where(eq(passkey.userId, adminId))).toHaveLength(1);
  });

  it("does not let a signed-in person use an invite to attach a passkey to themselves", async () => {
    const { token, invite } = await inviteFor(ctx, "third@example.org");
    await expect(register(ctx, new VirtualAuthenticator(ORIGIN), { context: { kind: "invite", token, name: "Third" }, cookie: adminCookie })).rejects.toMatchObject({
      body: { message: "sign_out_first" },
    });
    const [pending] = await ctx.db.select().from(staffInvites).where(eq(staffInvites.id, invite.id));
    expect(pending?.acceptedAt).toBeNull();
  });

  it("keeps the audit log free of the raw token", async () => {
    const token = await recoveryToken();
    await register(ctx, new VirtualAuthenticator(ORIGIN), { context: { kind: "recover", token } });
    expect(JSON.stringify(await ctx.db.select().from(auditLog))).not.toContain(token);
    expect(JSON.stringify(await ctx.db.select().from(staffRecoveryLinks))).not.toContain(token);
    expect(await ctx.db.select().from(staffRoles)).toHaveLength(2);
  });
});
