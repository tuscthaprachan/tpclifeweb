/**
 * Builds the Better Auth instance. A factory rather than a module-level
 * `betterAuth(...)` so that:
 *
 * - nothing reads an environment variable or opens a connection at import
 *   (`next build` works with no secrets; see lib/auth/index.ts), and
 * - tests can build one over PGlite with an in-memory email sender.
 *
 * What is and is not used, and why:
 *
 * - emailOTP: the only way in. Codes are 6 digits, expire in 10 minutes, are
 *   stored hashed and allow 3 wrong tries each.
 * - twoFactor (TOTP + backup codes) and passkey: the mandatory second factor
 *   for staff. Email and password is off. Better Auth's own 2FA challenge only
 *   hooks its password sign-in routes, so it never fires after an email code;
 *   instead each session carries `secondFactorAt`, set by the hooks below once
 *   a code, backup code or passkey has been verified, and `decideAccess`
 *   (lib/auth/access.ts) refuses staff pages until it is set.
 * - NOT the admin plugin. It keeps one `role` string on the user and mounts
 *   endpoints (set-role, create-user, impersonate-user) that would be a second,
 *   unaudited, organisation-blind way to grant power. `staff_roles` is the only
 *   source of truth for authorisation, so the plugin stays out.
 */

import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, twoFactor } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { signInCode, type EmailSender } from "@/lib/email";
import { recordAudit, type AuditContext, type AuditExecutor } from "@/lib/db/audit";
import * as authSchema from "@/lib/db/schema/auth";
import { isAllowedEmailDomain, normaliseEmail } from "./domains";
import {
  hasVerifiedSecondFactor,
  recentSecondFactorFailures,
  SECOND_FACTOR_FAILURE_LIMIT,
} from "./factors";
import { hasPendingInviteForEmail } from "./invites";
import { isEmailPermitted } from "./permitted";
import { ABSOLUTE_TIMEOUT_MS } from "./session-policy";

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_SECONDS = 10 * 60;
export const OTP_MAX_ATTEMPTS = 3;

export interface AuthDeps {
  db: AuditExecutor;
  secret: string;
  baseURL: string;
  allowedDomains: readonly string[];
  getEmailSender: () => EmailSender;
  /** Off in tests: the plugin imports next/headers. */
  useNextCookies?: boolean;
}

/** Paths that verify a second factor. */
const VERIFY_PATHS = new Set(["/two-factor/verify-totp", "/two-factor/verify-backup-code", "/passkey/verify-authentication"]);
/** What a session that has not passed its second factor may still call. */
const OPEN_TO_UNVERIFIED = new Set([...VERIFY_PATHS, "/passkey/generate-authenticate-options"]);

type HookContext = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

function requestMeta(ctx: HookContext): Pick<AuditContext, "ip" | "userAgent"> {
  const headers = ctx.headers ?? ctx.request?.headers;
  const forwarded = headers?.get("x-vercel-forwarded-for") ?? headers?.get("x-forwarded-for");
  return { ip: forwarded?.split(",")[0]?.trim() || null, userAgent: headers?.get("user-agent") ?? null };
}

export function createAuth(deps: AuthDeps) {
  const { db } = deps;

  async function audit(ctx: HookContext, entry: { action: string; entityType: string; entityId: string; actorUserId?: string | null; after?: unknown }) {
    try {
      await recordAudit(db, { ...requestMeta(ctx), ...entry });
    } catch (error) {
      // Never let a logging failure turn a correct sign-in into an error.
      console.error("[auth] could not write audit row", error);
    }
  }

  /** The session named by the request's own cookie, whatever this endpoint went on to do. */
  async function requestSession(ctx: HookContext) {
    const token = await ctx.getSignedCookie(ctx.context.authCookies.sessionToken.name, ctx.context.secret);
    if (!token) return null;
    return ctx.context.internalAdapter.findSession(token);
  }

  /**
   * Sessions whose first-ever passkey registration is in flight. Registering
   * the person's first factor proves they hold that authenticator, so that one
   * request also completes the second step; later registrations (which need
   * an already verified session) do not touch it. Entries live for one request.
   */
  const firstFactorEnrolment = new Set<string>();

  const before = createAuthMiddleware(async (ctx) => {
    const path = ctx.path;

    if (path === "/sign-out") {
      const current = await requestSession(ctx);
      if (current) {
        await audit(ctx, { action: "auth.sign_out", entityType: "user", entityId: current.user.id, actorUserId: current.user.id });
      }
      return;
    }

    if (!path.startsWith("/two-factor/") && !path.startsWith("/passkey/")) return;

    // Turning a factor off would let a hijacked session drop the requirement.
    if (path === "/two-factor/disable") throw new APIError("FORBIDDEN", { message: "Not available." });

    const current = await requestSession(ctx);

    if (VERIFY_PATHS.has(path)) {
      if (current) {
        const failures = await recentSecondFactorFailures(db, current.user.id);
        if (failures >= SECOND_FACTOR_FAILURE_LIMIT) {
          throw new APIError("TOO_MANY_REQUESTS", { message: "Too many wrong codes. Try again in 15 minutes." });
        }
      }
      return;
    }
    if (OPEN_TO_UNVERIFIED.has(path) || !current) return;

    // Everything else (enrol, list, remove, read the TOTP secret) needs either a
    // verified session, or a person with no factor yet who is setting one up.
    // Without this, anyone with a mailbox could add their own passkey to a
    // colleague's account and then pass the second-factor challenge with it.
    const session = current.session as typeof current.session & { secondFactorAt?: Date | null };
    if (!session.secondFactorAt) {
      if (await hasVerifiedSecondFactor(db, current.user.id)) {
        throw new APIError("FORBIDDEN", { message: "Verify your second factor first." });
      }
      if (path === "/passkey/verify-registration") firstFactorEnrolment.add(session.id);
    }
  });

  const after = createAuthMiddleware(async (ctx) => {
    const path = ctx.path;
    const returned = ctx.context.returned;
    const failed = isAPIError(returned);

    if (path === "/sign-in/email-otp") {
      if (failed) {
        const email = normaliseEmail(String((ctx.body as { email?: string } | undefined)?.email ?? ""));
        const found = email ? await ctx.context.internalAdapter.findUserByEmail(email) : null;
        await audit(ctx, {
          action: "auth.code.failed",
          entityType: "user",
          entityId: found?.user.id ?? "unknown",
          actorUserId: found?.user.id ?? null,
        });
      } else if (ctx.context.newSession) {
        const { user } = ctx.context.newSession;
        await audit(ctx, { action: "auth.sign_in", entityType: "user", entityId: user.id, actorUserId: user.id, after: { method: "email_code" } });
      }
      return;
    }

    if (VERIFY_PATHS.has(path)) {
      const method = path === "/two-factor/verify-totp" ? "totp" : path === "/two-factor/verify-backup-code" ? "backup_code" : "passkey";
      const prior = await requestSession(ctx);

      if (failed) {
        if (prior) {
          await audit(ctx, {
            action: "auth.second_factor.failed",
            entityType: "user",
            entityId: prior.user.id,
            actorUserId: prior.user.id,
            after: { method },
          });
        }
        return;
      }

      const fresh = ctx.context.newSession?.session ?? prior?.session;
      if (!fresh) return;

      if (method === "passkey") {
        // The passkey endpoint signs in as whoever owns the key. It is only a
        // second factor for the person who just entered the emailed code, so
        // it must belong to that same person; a stray passkey sign-in is undone.
        if (!prior || prior.user.id !== fresh.userId) {
          await ctx.context.internalAdapter.deleteSession(fresh.token);
          throw new APIError("UNAUTHORIZED", { message: "Enter the emailed code first." });
        }
        if (prior.session.id !== fresh.id) {
          // Keep the original absolute deadline: a passkey does not buy more time.
          await db
            .update(authSchema.session)
            .set({ expiresAt: prior.session.expiresAt })
            .where(eq(authSchema.session.id, fresh.id));
          await ctx.context.internalAdapter.deleteSession(prior.session.token);
        }
      }

      await db.update(authSchema.session).set({ secondFactorAt: new Date() }).where(eq(authSchema.session.id, fresh.id));
      await audit(ctx, {
        action: "auth.second_factor.verified",
        entityType: "user",
        entityId: fresh.userId,
        actorUserId: fresh.userId,
        after: { method },
      });
      return;
    }

    if (path === "/passkey/verify-registration") {
      const current = await requestSession(ctx);
      const enrolling = current ? firstFactorEnrolment.delete(current.session.id) : false;
      if (current && !failed && enrolling) {
        await db.update(authSchema.session).set({ secondFactorAt: new Date() }).where(eq(authSchema.session.id, current.session.id));
        await audit(ctx, {
          action: "auth.second_factor.verified",
          entityType: "user",
          entityId: current.user.id,
          actorUserId: current.user.id,
          after: { method: "passkey_enrolment" },
        });
      }
    }

    if (failed) return;

    if (path === "/passkey/verify-registration" || path === "/two-factor/enable" || path === "/passkey/delete-passkey") {
      const current = await requestSession(ctx);
      if (!current) return;
      const action =
        path === "/passkey/verify-registration"
          ? "auth.passkey.register"
          : path === "/passkey/delete-passkey"
            ? "auth.passkey.remove"
            : "auth.totp.setup_started";
      await audit(ctx, { action, entityType: "user", entityId: current.user.id, actorUserId: current.user.id });
    }
  });

  const origin = new URL(deps.baseURL);

  return betterAuth({
    appName: "TryTPC",
    baseURL: deps.baseURL,
    secret: deps.secret,
    trustedOrigins: [origin.origin],
    database: drizzleAdapter(db as unknown as Parameters<typeof drizzleAdapter>[0], {
      provider: "pg",
      schema: authSchema,
    }),
    emailAndPassword: { enabled: false },

    session: {
      // The absolute limit. The 30 minute idle limit is enforced in lib/auth/session.ts.
      expiresIn: ABSOLUTE_TIMEOUT_MS / 1000,
      disableSessionRefresh: true,
      additionalFields: {
        secondFactorAt: { type: "date", required: false, input: false },
      },
    },

    /*
     * Database storage, not memory: on serverless each request can land on a
     * fresh instance, so an in-memory counter would reset constantly and limit
     * nothing. Per-IP limits are generous because a campus NAT puts many
     * students behind one address; the strict per-address limits live in the
     * sign-in Server Actions (lib/auth/rate-limit.ts).
     */
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 10,
      max: 100,
      customRules: {
        "/email-otp/send-verification-otp": { window: 60, max: 10 },
        "/sign-in/email-otp": { window: 60, max: 10 },
      },
    },

    advanced: {
      cookiePrefix: "trytpc",
      ipAddress: { ipAddressHeaders: ["x-vercel-forwarded-for", "x-forwarded-for"] },
    },

    databaseHooks: {
      user: {
        create: {
          // Sign-up is just "first successful code", so this is where the domain rule bites.
          before: async (newUser) => {
            const email = normaliseEmail(newUser.email);
            const permitted =
              isAllowedEmailDomain(email, deps.allowedDomains) || (await hasPendingInviteForEmail(db, email));
            if (!permitted) throw new APIError("FORBIDDEN", { message: "This email address cannot sign in." });
          },
        },
      },
    },

    hooks: { before, after },

    plugins: [
      emailOTP({
        otpLength: OTP_LENGTH,
        expiresIn: OTP_EXPIRY_SECONDS,
        allowedAttempts: OTP_MAX_ATTEMPTS,
        storeOTP: "hashed",
        rateLimit: { window: 60, max: 10 },
        async sendVerificationOTP({ email, otp, type }) {
          if (type !== "sign-in") return;
          // The public endpoint accepts any address. Say nothing and send nothing
          // to ones that may not sign in, so it cannot be used to mail strangers.
          if (!(await isEmailPermitted(db, email, deps.allowedDomains))) return;
          const message = signInCode({ code: otp, expiresInMinutes: OTP_EXPIRY_SECONDS / 60 });
          await deps.getEmailSender().send({ to: normaliseEmail(email), ...message });
        },
      }),
      twoFactor({
        issuer: "TryTPC",
        // No password exists on these accounts; the session is the proof.
        allowPasswordless: true,
        backupCodeOptions: { amount: 8, length: 10 },
      }),
      passkey({
        rpID: origin.hostname,
        rpName: "TryTPC",
        origin: origin.origin,
        authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
      }),
      // Must stay last: it copies Set-Cookie into Next's cookie store.
      ...(deps.useNextCookies === false ? [] : [nextCookies()]),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
