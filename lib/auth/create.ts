/**
 * Builds the Better Auth instance. A factory rather than a module-level
 * `betterAuth(...)` so that:
 *
 * - nothing reads an environment variable or opens a connection at import
 *   (`next build` works with no secrets; see lib/auth/index.ts), and
 * - tests can build one over PGlite.
 *
 * Staff accounts are passkey-only. There is no password and no email code:
 *
 * - Accounts are created from an invite. The person opens the invite link,
 *   gives their name and registers a passkey; the invite token is the proof
 *   (lib/auth/enrolment.ts). The passkey plugin runs with `requireSession:
 *   false`, and `resolveUser` / `afterVerification` below tie each ceremony to
 *   a token. With no token and no session, nothing can be registered.
 * - Recovery works the same way with a recovery link (lib/auth/recovery.ts).
 * - Signing in is a discoverable-credential passkey ceremony. A passkey sign-in
 *   counts as the strong factor, so each session it creates carries
 *   `secondFactorAt`, which `decideAccess` (lib/auth/access.ts) requires.
 * - Registration demands user verification (fingerprint, face or PIN), so a
 *   stolen unlocked key alone is not enough.
 * - Better Auth's own passkey delete and rename endpoints are closed; the My
 *   security page uses lib/auth/passkeys.ts so the last passkey cannot be removed.
 * - NOT the admin plugin. It keeps one `role` string on the user and mounts
 *   endpoints (set-role, create-user, impersonate-user) that would be a second,
 *   unaudited, organisation-blind way to grant power. `staff_roles` is the only
 *   source of truth for authorisation, so the plugin stays out.
 */

import { getAuthenticatorName, passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { recordAudit, type AuditContext, type AuditExecutor } from "@/lib/db/audit";
import * as authSchema from "@/lib/db/schema/auth";
import { parseCeremonyContext } from "./ceremony";
import { createStaffAccount, newUserId, userExistsWithEmail } from "./enrolment";
import { findInviteByToken, InviteError, inviteStatus } from "./invites";
import { recordPasskeyUse } from "./passkeys";
import { consumeTokenAttempt } from "./rate-limit";
import { claimRecoveryLink, findRecoveryByToken, RecoveryError, recoveryStatus } from "./recovery";
import { ABSOLUTE_TIMEOUT_MS } from "./session-policy";

export interface AuthDeps {
  db: AuditExecutor;
  secret: string;
  baseURL: string;
  /** Off in tests: the plugin imports next/headers. */
  useNextCookies?: boolean;
}

/** Closed off: removal and renaming go through lib/auth/passkeys.ts. */
const CLOSED_PATHS = new Set(["/passkey/delete-passkey", "/passkey/update-passkey"]);
const REGISTRATION_PATHS = new Set(["/passkey/generate-register-options", "/passkey/verify-registration"]);

interface HeaderSource {
  headers?: Headers | null;
  request?: Request | null;
}

type HookContext = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

function requestMeta(ctx: HeaderSource): Pick<AuditContext, "ip" | "userAgent"> {
  const headers = ctx.headers ?? ctx.request?.headers;
  const forwarded = headers?.get("x-vercel-forwarded-for") ?? headers?.get("x-forwarded-for");
  return { ip: forwarded?.split(",")[0]?.trim() || null, userAgent: headers?.get("user-agent") ?? null };
}

/** Link problems reach the browser as these short codes, which the pages turn into plain sentences. */
function refuse(code: string, status: "BAD_REQUEST" | "TOO_MANY_REQUESTS" | "FORBIDDEN" = "BAD_REQUEST"): never {
  throw new APIError(status, { message: code });
}

function describeAuthenticator(aaguid: string | undefined, now: Date): string {
  return `${getAuthenticatorName(aaguid) ?? "Passkey"} ${now.toISOString().slice(0, 10)}`;
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

  const before = createAuthMiddleware(async (ctx) => {
    const path = ctx.path;

    if (path === "/sign-out") {
      const current = await requestSession(ctx);
      if (current) {
        await audit(ctx, { action: "auth.sign_out", entityType: "user", entityId: current.user.id, actorUserId: current.user.id });
      }
      return;
    }

    if (CLOSED_PATHS.has(path)) throw new APIError("FORBIDDEN", { message: "Use the My security page." });

    if (REGISTRATION_PATHS.has(path)) {
      // Adding a passkey while signed in needs a session that came from a passkey. With no
      // session, the ceremony must carry a link (checked in resolveUser).
      const current = await requestSession(ctx);
      const marker = current && (current.session as typeof current.session & { secondFactorAt?: Date | null }).secondFactorAt;
      if (current && !marker) throw new APIError("FORBIDDEN", { message: "Sign in with a passkey first." });
    }
  });

  const after = createAuthMiddleware(async (ctx) => {
    const path = ctx.path;
    const returned = ctx.context.returned;
    const failed = isAPIError(returned);

    if (path === "/passkey/verify-authentication") {
      if (failed) {
        await audit(ctx, { action: "auth.sign_in.failed", entityType: "user", entityId: "unknown", after: { method: "passkey" } });
        return;
      }
      const fresh = ctx.context.newSession;
      if (!fresh) return;
      // A passkey sign-in is the strong factor, so the session says so.
      await db.update(authSchema.session).set({ secondFactorAt: new Date() }).where(eq(authSchema.session.id, fresh.session.id));
      const credentialId = (ctx.body as { response?: { id?: string } } | undefined)?.response?.id;
      if (credentialId) await recordPasskeyUse(db, credentialId).catch((error) => console.error("[auth] could not record passkey use", error));
      await audit(ctx, { action: "auth.sign_in", entityType: "user", entityId: fresh.user.id, actorUserId: fresh.user.id, after: { method: "passkey" } });
      return;
    }

    if (path === "/passkey/verify-registration" && !failed) {
      const fresh = ctx.context.newSession;
      const userId = fresh?.user.id ?? (await requestSession(ctx))?.user.id;
      if (!userId) return;
      if (fresh) {
        await db.update(authSchema.session).set({ secondFactorAt: new Date() }).where(eq(authSchema.session.id, fresh.session.id));
      }
      const passkeyId = (returned as { id?: string } | undefined)?.id;
      await audit(ctx, { action: "auth.passkey.register", entityType: "passkey", entityId: passkeyId ?? "unknown", actorUserId: userId });
      if (fresh) {
        await audit(ctx, { action: "auth.sign_in", entityType: "user", entityId: userId, actorUserId: userId, after: { method: "passkey_registration" } });
      }
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
     * students behind one address. Attempts at invite and recovery tokens are
     * also counted in resolveUser (lib/auth/rate-limit.ts).
     */
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 10,
      max: 100,
      customRules: {
        "/passkey/generate-authenticate-options": { window: 60, max: 20 },
        "/passkey/verify-authentication": { window: 60, max: 10 },
        "/passkey/generate-register-options": { window: 60, max: 20 },
        "/passkey/verify-registration": { window: 60, max: 10 },
      },
    },

    advanced: {
      cookiePrefix: "trytpc",
      ipAddress: { ipAddressHeaders: ["x-vercel-forwarded-for", "x-forwarded-for"] },
    },

    databaseHooks: {
      user: {
        create: {
          // Accounts are made only by lib/auth/enrolment.ts, from an invite. Nothing
          // reachable through Better Auth's own routes may create one.
          before: async () => {
            throw new APIError("FORBIDDEN", { message: "Accounts are created from an invitation." });
          },
        },
      },
    },

    hooks: { before, after },

    plugins: [
      passkey({
        rpID: origin.hostname,
        rpName: "TryTPC",
        origin: origin.origin,
        // Discoverable credentials, so sign-in needs no email address; and the authenticator must verify the person.
        authenticatorSelection: { residentKey: "required", userVerification: "required" },
        registration: {
          requireSession: false,
          async resolveUser({ ctx, context }) {
            const parsed = parseCeremonyContext(context);
            if (!parsed) refuse("link_required");
            const attempt = await consumeTokenAttempt(db, requestMeta(ctx).ip ?? null);
            if (!attempt.allowed) refuse("too_many_attempts", "TOO_MANY_REQUESTS");
            const now = new Date();

            if (parsed.kind === "invite") {
              const found = await findInviteByToken(db, parsed.token);
              if (!found || inviteStatus(found.invite, now) !== "pending") refuse("link_unusable");
              if (!parsed.name.trim()) refuse("name_required");
              if (await userExistsWithEmail(db, found.invite.email)) refuse("account_exists");
              return { id: newUserId(), name: found.invite.email, displayName: parsed.name.trim() };
            }

            const found = await findRecoveryByToken(db, parsed.token);
            if (!found || recoveryStatus(found.link, now) !== "pending") refuse("link_unusable");
            return { id: found.person.id, name: found.person.email, displayName: found.person.name || found.person.email };
          },
          async afterVerification({ ctx, verification, user, context }) {
            const info = verification.registrationInfo;
            if (!info?.userVerified) refuse("user_verification_required");
            const now = new Date();
            const name = describeAuthenticator(info.aaguid, now);
            const parsed = parseCeremonyContext(context);
            // No link: this is a signed-in person adding a passkey to their own account.
            if (!parsed) return { name };

            const meta = requestMeta(ctx);
            try {
              if (parsed.kind === "invite") {
                // A session means the plugin resolved the signed-in person, not a new account.
                const [existing] = await db.select({ id: authSchema.user.id }).from(authSchema.user).where(eq(authSchema.user.id, user.id)).limit(1);
                if (existing) refuse("sign_out_first");
                const created = await createStaffAccount(db, { token: parsed.token, userId: user.id, name: user.displayName ?? "", context: meta, now });
                return { userId: created.userId, name };
              }
              const found = await findRecoveryByToken(db, parsed.token);
              if (!found || found.person.id !== user.id) refuse(found ? "sign_out_first" : "link_unusable");
              const claimed = await claimRecoveryLink(db, { token: parsed.token, context: meta, now });
              return { userId: claimed.userId, name };
            } catch (error) {
              if (error instanceof InviteError || error instanceof RecoveryError) refuse(error.code === "account_exists" ? "account_exists" : "link_unusable");
              throw error;
            }
          },
        },
      }),
      // Must stay last: it copies Set-Cookie into Next's cookie store.
      ...(deps.useNextCookies === false ? [] : [nextCookies()]),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
