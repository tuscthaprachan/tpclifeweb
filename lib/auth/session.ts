import "server-only";

/**
 * Who is making this request, and are they allowed here? Every /admin page
 * and Server Action starts with `requireStaff(...)`. The proxy is not relied
 * on for authorisation (and does not run for /admin at all).
 *
 * Roles are read from the database on every request, never cached in the
 * session, so revoking a role takes effect on the person's very next click.
 */

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import type { AuditContext } from "@/lib/db/audit";
import { session as sessionTable } from "@/lib/db/schema/auth";
import { organisations, type Organisation } from "@/lib/db/schema/organisations";
import { decideAccess, type AccessState } from "./access";
import { getAuth, isAuthConfigured } from "./index";
import { getStaffRoles, type ActiveRole, type StaffRole } from "./roles";
import { ACTIVITY_TOUCH_MS, isSessionLive, sessionDeadlines, type SessionDeadlines, type SessionTimes } from "./session-policy";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
}

export interface AccessContext {
  user: AdminUser;
  sessionId: string;
  secondFactorAt: Date | null;
  times: SessionTimes;
  deadlines: SessionDeadlines;
  roles: ActiveRole[];
  /** Organisations the person holds at least one role in. */
  organisations: Organisation[];
}

/** First hop of the client's address, as the platform reports it. */
export async function getRequestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  const forwarded = h.get("x-vercel-forwarded-for") ?? h.get("x-forwarded-for");
  return { ip: forwarded?.split(",")[0]?.trim() || null, userAgent: h.get("user-agent") };
}

/** The audit context for an action taken by `staff`. */
export async function auditContextFor(staff?: Pick<AccessContext, "user"> | null, organisationId?: number): Promise<AuditContext> {
  return { ...(await getRequestMeta()), actorUserId: staff?.user.id ?? null, actorOrganisationId: organisationId ?? null };
}

/**
 * Reads the session, applies the idle limit and records activity. Returns the
 * facts `decideAccess` needs. Memoised per request.
 */
const loadAccess = cache(async (): Promise<{ state: "none" } | { state: "timed_out" } | { state: "live"; ctx: AccessContext }> => {
  if (!isAuthConfigured()) return { state: "none" };
  const found = await getAuth().api.getSession({ headers: await headers() });
  if (!found) return { state: "none" };

  const db = getDb();
  const now = new Date();
  const s = found.session as typeof found.session & { secondFactorAt?: Date | string | null };
  const times = { updatedAt: new Date(s.updatedAt), expiresAt: new Date(s.expiresAt) };

  if (!isSessionLive(times, now)) {
    // Idle too long: end the session on the server so the old cookie is useless.
    await db.delete(sessionTable).where(eq(sessionTable.id, s.id));
    return { state: "timed_out" };
  }

  if (now.getTime() - times.updatedAt.getTime() > ACTIVITY_TOUCH_MS) {
    times.updatedAt = now;
    await db.update(sessionTable).set({ updatedAt: now }).where(eq(sessionTable.id, s.id));
  }

  const roles = await getStaffRoles(found.user.id, db);
  const orgIds = [...new Set(roles.map((r) => r.organisationId))];
  const orgs = orgIds.length ? await db.select().from(organisations).where(inArray(organisations.id, orgIds)) : [];

  return {
    state: "live",
    ctx: {
      user: { id: found.user.id, name: found.user.name, email: found.user.email },
      sessionId: s.id,
      secondFactorAt: s.secondFactorAt ? new Date(s.secondFactorAt) : null,
      times,
      deadlines: sessionDeadlines(times),
      roles,
      organisations: orgs,
    },
  };
});

/** The session facts without enforcing anything, or null when signed out. For mid-journey pages and the shell. */
export async function getAdminSession(): Promise<AccessContext | null> {
  const loaded = await loadAccess();
  return loaded.state === "live" ? loaded.ctx : null;
}

/** Where each failed decision sends the person. */
export function redirectFor(state: Exclude<AccessState, { kind: "ok" }>): string {
  switch (state.kind) {
    case "unauthenticated":
      return "/admin/sign-in";
    case "timed_out":
      return "/admin/signed-out?reason=timeout";
    case "not_staff":
      return "/admin/no-access";
    case "passkey_required":
      return "/admin/sign-in";
    case "forbidden":
      return "/admin/no-access?reason=role";
  }
}

/**
 * Gate for every staff page and action. Redirects unless the person is signed
 * in with a passkey, within their time limits, holds at least one staff role,
 * and (when given) holds `role` (or any one of the roles,
 * if a list is given), on behalf of `organisationId` if that is given too.
 */
export async function requireStaff(role?: StaffRole | readonly StaffRole[], organisationId?: number): Promise<AccessContext> {
  const loaded = await loadAccess();
  if (loaded.state === "timed_out") redirect(redirectFor({ kind: "timed_out" }));
  if (loaded.state === "none") redirect(redirectFor({ kind: "unauthenticated" }));
  const { ctx } = loaded;
  const state = decideAccess({
    session: { ...ctx.times, secondFactorAt: ctx.secondFactorAt },
    now: new Date(),
    roles: ctx.roles,
    required: { role, organisationId },
  });
  if (state.kind !== "ok") redirect(redirectFor(state));
  return ctx;
}

/**
 * For pages that need a live session but not a staff role ("no access", the
 * timeout extender). Like `requireStaff` it refuses a session that did not
 * come from a passkey.
 */
export async function requireSignedIn(): Promise<AccessContext> {
  const loaded = await loadAccess();
  if (loaded.state === "timed_out") redirect(redirectFor({ kind: "timed_out" }));
  if (loaded.state === "none" || !loaded.ctx.secondFactorAt) redirect(redirectFor({ kind: "unauthenticated" }));
  return loaded.ctx;
}
