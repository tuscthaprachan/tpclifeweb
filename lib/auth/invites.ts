/**
 * Staff invitations. The invite is the authorisation: an admin names an email
 * address, an organisation and the roles, and whoever proves they own that
 * address by entering the emailed code, from the emailed link, receives those
 * roles. Nothing here trusts the caller to be an admin; the Server Actions
 * check that (`requireStaff("admin", organisationId)`) before calling in.
 *
 * Every function takes the database as a parameter and imports nothing
 * server-only, so the same code runs under Next, under the bootstrap script
 * (tsx) and under PGlite in tests. Writes and their audit rows share one
 * transaction (`withAudit`).
 */

import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { withAudit, type AuditContext, type AuditExecutor } from "@/lib/db/audit";
import { organisations, type Organisation } from "@/lib/db/schema/organisations";
import { staffInvites, type StaffInvite } from "@/lib/db/schema/staff-invites";
import { staffRoles, STAFF_ROLES, type StaffRole } from "@/lib/db/schema/staff-roles";
import { isPlausibleEmail, normaliseEmail } from "./domains";
import { generateToken, hashToken } from "./tokens";

export const INVITE_TTL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export type InviteErrorCode =
  | "invalid_email"
  | "no_roles"
  | "invalid_role"
  | "unknown_organisation"
  | "not_found"
  | "expired"
  | "revoked"
  | "already_accepted"
  | "email_mismatch"
  | "admin_exists";

export class InviteError extends Error {
  constructor(readonly code: InviteErrorCode) {
    super(code);
    this.name = "InviteError";
  }
}

export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

export function inviteStatus(invite: Pick<StaffInvite, "acceptedAt" | "revokedAt" | "expiresAt">, now: Date): InviteStatus {
  if (invite.acceptedAt) return "accepted";
  if (invite.revokedAt) return "revoked";
  if (invite.expiresAt <= now) return "expired";
  return "pending";
}

export interface CreateInviteInput {
  email: string;
  organisationId: number;
  roles: readonly string[];
  /** Null only for the bootstrap invite. */
  invitedBy: string | null;
  context?: AuditContext;
  now?: Date;
}

/** Keeps only known roles, in the canonical order, without duplicates. */
function cleanRoles(roles: readonly string[]): StaffRole[] {
  if (roles.length === 0) throw new InviteError("no_roles");
  if (roles.some((r) => !(STAFF_ROLES as readonly string[]).includes(r))) throw new InviteError("invalid_role");
  return STAFF_ROLES.filter((r) => roles.includes(r));
}

/**
 * Creates an invite and returns the raw token (never stored). Any earlier
 * pending invite for the same address and organisation is superseded, so
 * re-inviting is also how an admin "resends" one.
 */
export async function createInvite(
  db: AuditExecutor,
  input: CreateInviteInput,
): Promise<{ invite: StaffInvite; token: string; organisation: Organisation }> {
  const email = normaliseEmail(input.email);
  if (!isPlausibleEmail(email)) throw new InviteError("invalid_email");
  const roles = cleanRoles(input.roles);
  const now = input.now ?? new Date();
  const token = generateToken();

  return withAudit(
    db,
    { ...input.context, actorUserId: input.invitedBy ?? input.context?.actorUserId ?? null },
    async (tx, audit) => {
      const [organisation] = await tx.select().from(organisations).where(eq(organisations.id, input.organisationId));
      if (!organisation) throw new InviteError("unknown_organisation");

      const superseded = await tx
        .update(staffInvites)
        .set({ revokedAt: now })
        .where(
          and(
            eq(staffInvites.email, email),
            eq(staffInvites.organisationId, organisation.id),
            isNull(staffInvites.acceptedAt),
            isNull(staffInvites.revokedAt),
          ),
        )
        .returning({ id: staffInvites.id });
      for (const row of superseded) {
        await audit({ action: "staff_invite.supersede", entityType: "staff_invite", entityId: row.id });
      }

      const [invite] = await tx
        .insert(staffInvites)
        .values({
          email,
          organisationId: organisation.id,
          roles,
          tokenHash: hashToken(token),
          invitedBy: input.invitedBy,
          expiresAt: new Date(now.getTime() + INVITE_TTL_DAYS * DAY_MS),
        })
        .returning();
      if (!invite) throw new Error("Invite insert returned no row.");
      await audit({
        action: "staff_invite.create",
        entityType: "staff_invite",
        entityId: invite.id,
        actorOrganisationId: organisation.id,
        // The token hash is deliberately left out of the log.
        after: { email, organisationId: organisation.id, roles, expiresAt: invite.expiresAt },
      });
      return { invite, token, organisation };
    },
  );
}

/** Looks an invite up by the raw token from the link. Null when no such invite exists. */
export async function findInviteByToken(
  db: AuditExecutor,
  token: string,
): Promise<{ invite: StaffInvite; organisation: Organisation } | null> {
  if (!token || token.length > 200) return null;
  const [row] = await db
    .select({ invite: staffInvites, organisation: organisations })
    .from(staffInvites)
    .innerJoin(organisations, eq(organisations.id, staffInvites.organisationId))
    .where(eq(staffInvites.tokenHash, hashToken(token)));
  return row ?? null;
}

/** True when this address has an invite that could still be accepted. */
export async function hasPendingInviteForEmail(db: AuditExecutor, email: string, now: Date = new Date()): Promise<boolean> {
  const [row] = await db
    .select({ id: staffInvites.id })
    .from(staffInvites)
    .where(
      and(
        eq(staffInvites.email, normaliseEmail(email)),
        isNull(staffInvites.acceptedAt),
        isNull(staffInvites.revokedAt),
        gt(staffInvites.expiresAt, now),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export interface AcceptInviteInput {
  token: string;
  /** The signed-in user who proved they own the invited address. */
  userId: string;
  userEmail: string;
  context?: AuditContext;
  now?: Date;
}

/**
 * Accepts an invite and grants its roles in one audited transaction. The
 * invite is claimed with a conditional UPDATE, so two simultaneous accepts
 * cannot both succeed.
 */
export async function acceptInvite(
  db: AuditExecutor,
  input: AcceptInviteInput,
): Promise<{ organisationId: number; roles: StaffRole[] }> {
  const now = input.now ?? new Date();
  const found = await findInviteByToken(db, input.token);
  if (!found) throw new InviteError("not_found");
  const { invite } = found;
  const status = inviteStatus(invite, now);
  if (status === "accepted") throw new InviteError("already_accepted");
  if (status === "revoked") throw new InviteError("revoked");
  if (status === "expired") throw new InviteError("expired");
  if (normaliseEmail(input.userEmail) !== invite.email) throw new InviteError("email_mismatch");

  return withAudit(
    db,
    { ...input.context, actorUserId: input.userId, actorOrganisationId: invite.organisationId },
    async (tx, audit) => {
      const claimed = await tx
        .update(staffInvites)
        .set({ acceptedAt: now })
        .where(
          and(
            eq(staffInvites.id, invite.id),
            isNull(staffInvites.acceptedAt),
            isNull(staffInvites.revokedAt),
            gt(staffInvites.expiresAt, now),
          ),
        )
        .returning({ id: staffInvites.id });
      if (claimed.length === 0) throw new InviteError("already_accepted");
      await audit({ action: "staff_invite.accept", entityType: "staff_invite", entityId: invite.id });

      // A bootstrap invite has no inviter, so the new admin is recorded as granting it.
      const grantedBy = invite.invitedBy ?? input.userId;
      for (const role of invite.roles) {
        const [grant] = await tx
          .insert(staffRoles)
          .values({ userId: input.userId, role, organisationId: invite.organisationId, grantedBy })
          .onConflictDoNothing()
          .returning();
        // Already held: nothing changed, so nothing to log.
        if (!grant) continue;
        await audit({
          action: "staff_role.grant",
          entityType: "staff_role",
          entityId: grant.id,
          after: {
            userId: input.userId,
            role,
            organisationId: invite.organisationId,
            grantedBy,
            viaInvite: invite.id,
            bootstrap: invite.invitedBy === null,
          },
        });
      }
      return { organisationId: invite.organisationId, roles: [...invite.roles] };
    },
  );
}

/** Revokes a pending invite. Returns false when it was not pending. */
export async function revokeInvite(
  db: AuditExecutor,
  input: { inviteId: number; allowedOrganisationIds?: readonly number[]; context?: AuditContext; now?: Date },
): Promise<boolean> {
  const now = input.now ?? new Date();
  return withAudit(db, input.context ?? {}, async (tx, audit) => {
    const conditions = [
      eq(staffInvites.id, input.inviteId),
      isNull(staffInvites.acceptedAt),
      isNull(staffInvites.revokedAt),
    ];
    if (input.allowedOrganisationIds) conditions.push(inArray(staffInvites.organisationId, [...input.allowedOrganisationIds]));
    const rows = await tx
      .update(staffInvites)
      .set({ revokedAt: now })
      .where(and(...conditions))
      .returning();
    const revoked = rows[0];
    if (!revoked) return false;
    await audit({
      action: "staff_invite.revoke",
      entityType: "staff_invite",
      entityId: revoked.id,
      actorOrganisationId: revoked.organisationId,
      before: { email: revoked.email, roles: revoked.roles },
    });
    return true;
  });
}

/**
 * The one-off invite for the very first admin (`npm run auth:bootstrap`).
 * Refuses as soon as any admin grant is active: from then on admins invite
 * each other from the console, and this path must not become a back door.
 */
export async function createBootstrapInvite(
  db: AuditExecutor,
  input: { email: string; organisationSlug: string; now?: Date },
): Promise<{ invite: StaffInvite; token: string; organisation: Organisation }> {
  const [org] = await db.select().from(organisations).where(eq(organisations.slug, input.organisationSlug));
  if (!org) throw new InviteError("unknown_organisation");
  const [admins] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(staffRoles)
    .where(and(eq(staffRoles.role, "admin"), isNull(staffRoles.revokedAt)));
  if ((admins?.count ?? 0) > 0) throw new InviteError("admin_exists");
  return createInvite(db, {
    email: input.email,
    organisationId: org.id,
    roles: ["admin"],
    invitedBy: null,
    context: { actorUserId: null },
    now: input.now,
  });
}
