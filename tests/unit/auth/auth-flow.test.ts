/**
 * Better Auth wired to PGlite with an in-memory mailbox: the whole code
 * sign-in, the second factor, the domain rule and the audit trail, with no
 * network and no real email.
 */

import { base32 } from "@better-auth/utils/base32";
import { createOTP } from "@better-auth/utils/otp";
import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAuth } from "@/lib/auth/create";
import { createInvite } from "@/lib/auth/invites";
import { captureSendFailure } from "@/lib/auth/send-outcome";
import { MemoryEmailSender } from "@/lib/email";
import { auditLog, session, user } from "@/lib/db/schema";
import { createTestDb } from "../db/harness";

// Each test may boot an in-memory Postgres and run every migration, which is slow on a busy machine.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const SECRET = "test-secret-test-secret-test-secret-0123456789";

async function setup() {
  const { db } = await createTestDb();
  const mailbox = new MemoryEmailSender();
  const auth = createAuth({
    db,
    secret: SECRET,
    baseURL: "http://localhost:3000",
    allowedDomains: ["tu.ac.th", "dome.tu.ac.th"],
    getEmailSender: () => mailbox,
    useNextCookies: false,
  });
  return { db, mailbox, auth };
}

type Ctx = Awaited<ReturnType<typeof setup>>;

/** Cookie header from a Better Auth response's Set-Cookie list. */
function cookieFrom(headers: Headers): string {
  return headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

/** `enableTwoFactor` returns a union; the TOTP branch is the one these tests use. */
function totpUriOf(result: { method: string } & Partial<{ totpURI: string }>): string {
  if (!result.totpURI) throw new Error("No TOTP URI returned");
  return result.totpURI;
}

/** The plain secret behind an otpauth URI, which carries it base32 encoded. */
function secretFromUri(uri: string): string {
  return new TextDecoder().decode(base32.decode(new URL(uri).searchParams.get("secret")!));
}

function codeFrom(mailbox: MemoryEmailSender): string {
  const last = mailbox.outbox.at(-1);
  const match = last?.text.match(/\b(\d{6})\b/);
  if (!match?.[1]) throw new Error("No code in the last email");
  return match[1];
}

async function signIn({ auth, mailbox }: Ctx, email: string) {
  await auth.api.sendVerificationOTP({ body: { email, type: "sign-in" } });
  const { headers, response } = await auth.api.signInEmailOTP({
    body: { email, otp: codeFrom(mailbox) },
    returnHeaders: true,
  });
  return { cookie: cookieFrom(headers), userId: response.user.id };
}

describe("email code sign-in", () => {
  let ctx: Ctx;
  beforeEach(async () => {
    ctx = await setup();
  });

  it("sends a six digit code and signs a permitted address in", async () => {
    await ctx.auth.api.sendVerificationOTP({ body: { email: "Student@Dome.TU.ac.th", type: "sign-in" } });
    expect(ctx.mailbox.outbox).toHaveLength(1);
    expect(ctx.mailbox.outbox[0]?.to).toBe("student@dome.tu.ac.th");
    expect(codeFrom(ctx.mailbox)).toMatch(/^\d{6}$/);

    const { cookie, userId } = await signIn(ctx, "student@dome.tu.ac.th");
    const current = await ctx.auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(current?.user.id).toBe(userId);
    expect((current?.session as { secondFactorAt?: unknown }).secondFactorAt ?? null).toBeNull();
  });

  it("does not store the code in the clear", async () => {
    await ctx.auth.api.sendVerificationOTP({ body: { email: "a@tu.ac.th", type: "sign-in" } });
    const rows = await ctx.db.query.verification.findMany();
    expect(rows.some((r) => r.value.includes(codeFrom(ctx.mailbox)))).toBe(false);
  });

  it("reports a failed send to the caller even though Better Auth swallows it", async () => {
    const failing = createAuth({
      db: ctx.db,
      secret: SECRET,
      baseURL: "http://localhost:3000",
      allowedDomains: ["tu.ac.th"],
      getEmailSender: () => ({ send: () => Promise.reject(new Error("smtp down")) }),
      useNextCookies: false,
    });
    const { error } = await captureSendFailure(() =>
      failing.api.sendVerificationOTP({ body: { email: "a@tu.ac.th", type: "sign-in" } }),
    );
    expect(error).toBeInstanceOf(Error);
    const ok = await captureSendFailure(() =>
      ctx.auth.api.sendVerificationOTP({ body: { email: "a@tu.ac.th", type: "sign-in" } }),
    );
    expect(ok.error).toBeUndefined();
  });

  it("sends nothing to an address outside the allowed domains", async () => {
    await ctx.auth.api.sendVerificationOTP({ body: { email: "stranger@gmail.com", type: "sign-in" } });
    expect(ctx.mailbox.outbox).toHaveLength(0);
  });

  it("refuses to create an account for a disallowed domain even with a guessed code", async () => {
    await expect(
      ctx.auth.api.signInEmailOTP({ body: { email: "stranger@gmail.com", otp: "123456" } }),
    ).rejects.toThrow();
    expect(await ctx.db.select().from(user).where(eq(user.email, "stranger@gmail.com"))).toHaveLength(0);
  });

  it("lets an invited address on another domain sign in", async () => {
    const org = (await ctx.db.query.organisations.findFirst())!;
    await createInvite(ctx.db, { email: "outsider@example.org", organisationId: org.id, roles: ["editor"], invitedBy: null });
    const { userId } = await signIn(ctx, "outsider@example.org");
    expect(userId).toBeTruthy();
  });

  it("audits a successful sign-in and a wrong code", async () => {
    await ctx.auth.api.sendVerificationOTP({ body: { email: "a@tu.ac.th", type: "sign-in" } });
    await expect(ctx.auth.api.signInEmailOTP({ body: { email: "a@tu.ac.th", otp: "000000" } })).rejects.toThrow();
    const { userId } = await signIn(ctx, "a@tu.ac.th");

    const rows = await ctx.db.select().from(auditLog);
    const actions = rows.map((r) => r.action);
    expect(actions).toContain("auth.code.failed");
    expect(actions).toContain("auth.sign_in");
    expect(rows.find((r) => r.action === "auth.sign_in")?.actorUserId).toBe(userId);
  });

  it("invalidates a code after three wrong tries", async () => {
    await ctx.auth.api.sendVerificationOTP({ body: { email: "a@tu.ac.th", type: "sign-in" } });
    const good = codeFrom(ctx.mailbox);
    for (let i = 0; i < 3; i += 1) {
      await expect(ctx.auth.api.signInEmailOTP({ body: { email: "a@tu.ac.th", otp: "000000" } })).rejects.toThrow();
    }
    await expect(ctx.auth.api.signInEmailOTP({ body: { email: "a@tu.ac.th", otp: good } })).rejects.toThrow();
  });

  it("audits sign-out", async () => {
    const { cookie, userId } = await signIn(ctx, "a@tu.ac.th");
    await ctx.auth.api.signOut({ headers: new Headers({ cookie }) });
    const rows = await ctx.db.select().from(auditLog).where(eq(auditLog.action, "auth.sign_out"));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.actorUserId).toBe(userId);
  });
});

describe("second factor", () => {
  let ctx: Ctx;
  beforeEach(async () => {
    ctx = await setup();
  });

  async function enrolAuthenticator(email: string) {
    const first = await signIn(ctx, email);
    const headers = new Headers({ cookie: first.cookie });
    const enabled = await ctx.auth.api.enableTwoFactor({ headers, body: { method: "totp" } });
    const secret = secretFromUri(totpUriOf(enabled));
    const code = await createOTP(secret).totp();
    const verified = await ctx.auth.api.verifyTOTP({ headers, body: { code }, returnHeaders: true });
    return { first, secret, cookie: cookieFrom(verified.headers) || first.cookie };
  }

  it("marks the session verified once an authenticator code is accepted", async () => {
    const { first } = await enrolAuthenticator("a@tu.ac.th");
    const rows = await ctx.db.select().from(session).where(eq(session.userId, first.userId));
    expect(rows.some((r) => r.secondFactorAt !== null)).toBe(true);
    const events = (await ctx.db.select().from(auditLog)).map((r) => r.action);
    expect(events).toContain("auth.second_factor.verified");
  });

  it("does not mark a session verified on a wrong code, and counts the failure", async () => {
    const { secret } = await enrolAuthenticator("a@tu.ac.th");
    // A second sign-in produces a session that has not passed its second factor.
    const again = await signIn(ctx, "a@tu.ac.th");
    const headers = new Headers({ cookie: again.cookie });
    await expect(ctx.auth.api.verifyTOTP({ headers, body: { code: "000000" } })).rejects.toThrow();
    const rows = await ctx.db.select().from(session).where(eq(session.userId, again.userId));
    // The enrolment session is verified; the new one must still not be.
    expect(rows.filter((r) => r.secondFactorAt === null)).toHaveLength(1);
    const failed = await ctx.db.select().from(auditLog).where(eq(auditLog.action, "auth.second_factor.failed"));
    expect(failed.length).toBe(1);
    expect(secret).toBeTruthy();
  });

  it("locks verification after five wrong codes, even for the right one", async () => {
    const { secret } = await enrolAuthenticator("a@tu.ac.th");
    const again = await signIn(ctx, "a@tu.ac.th");
    const headers = new Headers({ cookie: again.cookie });
    for (let i = 0; i < 5; i += 1) {
      await expect(ctx.auth.api.verifyTOTP({ headers, body: { code: "000000" } })).rejects.toThrow();
    }
    const right = await createOTP(secret).totp();
    await expect(ctx.auth.api.verifyTOTP({ headers, body: { code: right } })).rejects.toMatchObject({ status: "TOO_MANY_REQUESTS" });
  });

  it("stops an unverified session adding a factor to an account that already has one", async () => {
    await enrolAuthenticator("a@tu.ac.th");
    const attacker = await signIn(ctx, "a@tu.ac.th");
    const headers = new Headers({ cookie: attacker.cookie });
    await expect(ctx.auth.api.generatePasskeyRegistrationOptions({ headers })).rejects.toMatchObject({ status: "FORBIDDEN" });
    await expect(ctx.auth.api.getTOTPURI({ headers, body: {} })).rejects.toMatchObject({ status: "FORBIDDEN" });
    await expect(ctx.auth.api.enableTwoFactor({ headers, body: { method: "totp" } })).rejects.toMatchObject({ status: "FORBIDDEN" });
  });

  it("never allows a factor to be switched off", async () => {
    const { cookie } = await enrolAuthenticator("a@tu.ac.th");
    await expect(
      ctx.auth.api.disableTwoFactor({ headers: new Headers({ cookie }), body: {} }),
    ).rejects.toMatchObject({ status: "FORBIDDEN" });
  });

  it("lets a person with no factor yet start setting one up", async () => {
    const first = await signIn(ctx, "new@tu.ac.th");
    const enabled = await ctx.auth.api.enableTwoFactor({ headers: new Headers({ cookie: first.cookie }), body: { method: "totp" } });
    expect(totpUriOf(enabled)).toContain("otpauth://totp/");
    const rows = await ctx.db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.action, "auth.totp.setup_started"), eq(auditLog.actorUserId, first.userId)));
    expect(rows).toHaveLength(1);
  });
});
