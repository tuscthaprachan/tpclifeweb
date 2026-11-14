/**
 * Reading and changing who is staff, which roles they hold and which bodies
 * they belong to. Like invites.ts, these take the database as a parameter and
 * the caller has already authorised the actor as an administrator.
 *
 * Every path that could remove an administrator first locks all active admin
 * grants (`SELECT ... FOR UPDATE`) and only then counts them, so two
 * administrators removing each other at once cannot both pass the check and
 * leave the console with none.
 */

import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { withAudit, type AuditContext, type AuditEntry, type AuditExecutor } from "@/lib/db/audit";
import { auditLog } from "@/lib/db/schema/audit-log";
import { passkey, session, user } from "@/lib/db/schema/auth";
import { organisations } from "@/lib/db/schema/organisations";
import { staffInvites, type StaffInvite } from "@/lib/db/schema/staff-invites";
import { staffMemberships } from "@/lib/db/schema/staff-memberships";
import { staffRoles, STAFF_ROLES, type StaffRole } from "@/lib/db/schema/staff-roles";

export interface StaffMember {
  userId: string;
  name: string;
  email: string;
  roles: Array<{ id: number; role: StaffRole; grantedAt: Date }>;
  organisationIds: number[];
  /** Belongs to a body but holds no role: signed out and locked out until roles are granted again. */
  suspended: boolean;
}

async function loadMembers(db: AuditExecutor, only?: string): Promise<StaffMember[]> {
  const roleRows = await db
    .select({ id: staffRoles.id, userId: staffRoles.userId, role: staffRoles.role, grantedAt: staffRoles.grantedAt })
    .from(staffRoles)
    .where(only ? and(isNull(staffRoles.revokedAt), eq(staffRoles.userId, only)) : isNull(staffRoles.revokedAt))
    .orderBy(asc(staffRoles.id));
  const membershipRows = await db
    .select({ userId: staffMemberships.userId, organisationId: staffMemberships.organisationId })
    .from(staffMemberships)
    .where(only ? eq(staffMemberships.userId, only) : undefined)
    .orderBy(asc(staffMemberships.organisationId));
  const ids = [...new Set([...roleRows.map((r) => r.userId), ...membershipRows.map((m) => m.userId)])];
  if (ids.length === 0) return [];
  const people = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(inArray(user.id, ids))
    .orderBy(asc(user.email));
  return people.map((p) => {
    const roles = roleRows.filter((r) => r.userId === p.id).map((r) => ({ id: r.id, role: r.role, grantedAt: r.grantedAt }));
    roles.sort((x, y) => STAFF_ROLES.indexOf(x.role) - STAFF_ROLES.indexOf(y.role));
    return {
      userId: p.id,
      name: p.name,
      email: p.email,
      roles,
      organisationIds: membershipRows.filter((m) => m.userId === p.id).map((m) => m.organisationId),
      suspended: roles.length === 0,
    };
  });
}

/** Everyone who holds an active role or belongs to a body, by email address. */
export async function listStaff(db: AuditExecutor): Promise<StaffMember[]> {
  return loadMembers(db);
}

/** One member of staff, or null when the person holds no role and belongs to no body. */
export async function getStaffMember(db: AuditExecutor, userId: string): Promise<StaffMember | null> {
  const [member] = await loadMembers(db, userId);
  return member ?? null;
}

export interface StaffMemberDetail extends StaffMember {
  passkeyCount: number;
  lastSignInAt: Date | null;
  joinedAt: Date;
  recent: Array<{ id: number; at: Date; action: string; entityType: string; entityId: string; actorUserId: string | null; actorName: string | null }>;
}

/** The member page's facts: the member plus passkeys, last sign-in, join date and the latest audit rows about them. */
export async function getStaffMemberDetail(db: AuditExecutor, userId: string): Promise<StaffMemberDetail | null> {
  const member = await getStaffMember(db, userId);
  if (!member) return null;
  const [person] = await db.select({ createdAt: user.createdAt }).from(user).where(eq(user.id, userId));
  const [keys] = await db
    .select({ count: sql<number>`count(*)::int`, lastUsed: sql<Date | null>`max(${passkey.lastUsedAt})` })
    .from(passkey)
    .where(eq(passkey.userId, userId));
  const [sessions] = await db.select({ last: sql<Date | null>`max(${session.createdAt})` }).from(session).where(eq(session.userId, userId));
  const candidates = [keys?.lastUsed, sessions?.last].filter((d): d is Date => d != null).map((d) => new Date(d));
  const lastSignInAt = candidates.length > 0 ? new Date(Math.max(...candidates.map((d) => d.getTime()))) : null;
  const recent = await db
    .select({
      id: auditLog.id,
      at: auditLog.occurredAt,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      actorUserId: auditLog.actorUserId,
      actorName: user.name,
    })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorUserId))
    .where(or(eq(auditLog.actorUserId, userId), and(eq(auditLog.entityType, "staff_member"), eq(auditLog.entityId, userId)), and(eq(auditLog.entityType, "user"), eq(auditLog.entityId, userId))))
    .orderBy(desc(auditLog.id))
    .limit(20);
  return { ...member, passkeyCount: keys?.count ?? 0, lastSignInAt, joinedAt: person?.createdAt ?? new Date(0), recent };
}

/** Invites that can still be accepted, newest first. */
export async function listPendingInvites(db: AuditExecutor, now: Date = new Date()): Promise<StaffInvite[]> {
  return db
    .select()
    .from(staffInvites)
    .where(and(isNull(staffInvites.acceptedAt), isNull(staffInvites.revokedAt), sql`${staffInvites.expiresAt} > ${now}`))
    .orderBy(desc(staffInvites.createdAt));
}

export async function listOrganisations(db: AuditExecutor) {
  return db.select().from(organisations).orderBy(asc(organisations.id));
}

/** Locks every active admin grant and returns the holders. Call before counting admins. */
async function lockActiveAdmins(tx: AuditExecutor): Promise<string[]> {
  const rows = await tx
    .select({ userId: staffRoles.userId })
    .from(staffRoles)
    .where(and(eq(staffRoles.role, "admin"), isNull(staffRoles.revokedAt)))
    .orderBy(asc(staffRoles.id))
    .for("update");
  return rows.map((r) => r.userId);
}

export type RevokeRoleResult = "revoked" | "not_found" | "last_admin";

/**
 * Revokes one active grant. Refuses to remove the last active admin, so the
 * console can never be locked out of its own staff page. Takes effect on the
 * person's very next request, because `requireStaff` reads roles fresh.
 */
export async function revokeRole(
  db: AuditExecutor,
  input: { roleId: number; context?: AuditContext; now?: Date },
): Promise<RevokeRoleResult> {
  const now = input.now ?? new Date();
  return withAudit(db, input.context ?? {}, async (tx, audit) => {
    const admins = await lockActiveAdmins(tx);
    const [grant] = await tx
      .select()
      .from(staffRoles)
      .where(and(eq(staffRoles.id, input.roleId), isNull(staffRoles.revokedAt)));
    if (!grant) return "not_found";

    if (grant.role === "admin" && admins.filter((id) => id !== grant.userId).length === 0) return "last_admin";

    await tx.update(staffRoles).set({ revokedAt: now }).where(eq(staffRoles.id, grant.id));
    await audit({
      action: "staff_role.revoke",
      entityType: "staff_role",
      entityId: grant.id,
      before: { userId: grant.userId, role: grant.role },
      after: { revokedAt: now },
    });
    return "revoked";
  });
}

export type UpdateMemberResult = "updated" | "unchanged" | "not_found" | "last_admin" | "no_organisation" | "no_roles" | "unknown_organisation";

export interface StaffMemberState {
  roles: StaffRole[];
  organisationIds: number[];
}

const sorted = (values: Iterable<number>): number[] => [...new Set(values)].sort((x, y) => x - y);

async function currentState(tx: AuditExecutor, userId: string): Promise<StaffMemberState & { grants: Array<{ id: number; role: StaffRole }> }> {
  const grants = await tx
    .select({ id: staffRoles.id, role: staffRoles.role })
    .from(staffRoles)
    .where(and(eq(staffRoles.userId, userId), isNull(staffRoles.revokedAt)))
    .orderBy(asc(staffRoles.id))
    .for("update");
  const memberships = await tx
    .select({ organisationId: staffMemberships.organisationId })
    .from(staffMemberships)
    .where(eq(staffMemberships.userId, userId));
  return {
    grants,
    roles: STAFF_ROLES.filter((r) => grants.some((g) => g.role === r)),
    organisationIds: sorted(memberships.map((m) => m.organisationId)),
  };
}

async function applyMemberState(
  tx: AuditExecutor,
  audit: (entry: AuditEntry) => Promise<void>,
  input: { userId: string; roles: readonly StaffRole[]; organisationIds: readonly number[]; actorUserId: string; extra?: Record<string, unknown>; now: Date },
): Promise<UpdateMemberResult> {
  const admins = await lockActiveAdmins(tx);
  const [person] = await tx.select({ id: user.id }).from(user).where(eq(user.id, input.userId));
  if (!person) return "not_found";

  const wantedRoles = STAFF_ROLES.filter((r) => input.roles.includes(r));
  const wantedOrganisations = sorted(input.organisationIds);
  if (wantedRoles.length === 0) return "no_roles";
  if (wantedOrganisations.length === 0) return "no_organisation";
  const known = await tx.select({ id: organisations.id }).from(organisations).where(inArray(organisations.id, wantedOrganisations));
  if (known.length !== wantedOrganisations.length) return "unknown_organisation";

  const before = await currentState(tx, input.userId);
  if (before.roles.includes("admin") && !wantedRoles.includes("admin") && admins.filter((id) => id !== input.userId).length === 0) return "last_admin";

  const addRoles = wantedRoles.filter((r) => !before.roles.includes(r));
  const dropRoles = before.grants.filter((g) => !wantedRoles.includes(g.role));
  const addOrganisations = wantedOrganisations.filter((o) => !before.organisationIds.includes(o));
  const dropOrganisations = before.organisationIds.filter((o) => !wantedOrganisations.includes(o));
  if (addRoles.length + dropRoles.length + addOrganisations.length + dropOrganisations.length === 0) return "unchanged";

  if (dropRoles.length > 0) {
    await tx.update(staffRoles).set({ revokedAt: input.now }).where(inArray(staffRoles.id, dropRoles.map((g) => g.id)));
  }
  if (addRoles.length > 0) {
    await tx.insert(staffRoles).values(addRoles.map((role) => ({ userId: input.userId, role, grantedBy: input.actorUserId })));
  }
  if (dropOrganisations.length > 0) {
    await tx.delete(staffMemberships).where(and(eq(staffMemberships.userId, input.userId), inArray(staffMemberships.organisationId, dropOrganisations)));
  }
  if (addOrganisations.length > 0) {
    await tx
      .insert(staffMemberships)
      .values(addOrganisations.map((organisationId) => ({ userId: input.userId, organisationId, addedBy: input.actorUserId })));
  }
  await audit({
    action: "staff_member.update",
    entityType: "staff_member",
    entityId: input.userId,
    before: { roles: before.roles, organisationIds: before.organisationIds },
    after: { roles: wantedRoles, organisationIds: wantedOrganisations, ...input.extra },
  });
  return "updated";
}

export interface UpdateMemberInput {
  userId: string;
  roles: readonly StaffRole[];
  organisationIds: readonly number[];
  actorUserId: string;
  context?: AuditContext;
  now?: Date;
}

/**
 * Sets a person's roles and bodies to exactly the given sets, as a diff: new
 * roles are granted, removed ones revoked (history kept), memberships added and
 * removed, all in one transaction with one `staff_member.update` audit row.
 * Needs at least one role (use `suspendMember` to remove them all) and at
 * least one organisation, and refuses to drop the last administrator.
 */
export async function updateStaffMember(db: AuditExecutor, input: UpdateMemberInput): Promise<UpdateMemberResult> {
  const now = input.now ?? new Date();
  return withAudit(db, { ...input.context, actorUserId: input.actorUserId }, (tx, audit) => applyMemberState(tx, audit, { ...input, now }));
}

/**
 * Adds roles and bodies to a person who is already staff (or suspended),
 * keeping everything they have. What inviting an existing address does.
 */
export async function grantToStaffMember(
  db: AuditExecutor,
  input: { userId: string; roles: readonly StaffRole[]; organisationIds: readonly number[]; actorUserId: string; context?: AuditContext; now?: Date },
): Promise<UpdateMemberResult> {
  const now = input.now ?? new Date();
  return withAudit(db, { ...input.context, actorUserId: input.actorUserId }, async (tx, audit) => {
    const current = await currentState(tx, input.userId);
    return applyMemberState(tx, audit, {
      userId: input.userId,
      roles: [...current.roles, ...input.roles],
      organisationIds: [...current.organisationIds, ...input.organisationIds],
      actorUserId: input.actorUserId,
      extra: { viaInvite: true },
      now,
    });
  });
}

export type SuspendResult = "suspended" | "not_found" | "last_admin" | "already_suspended";

/**
 * Revokes every role the person holds and ends their sessions. Memberships are
 * kept, so reactivating is granting roles again. Refuses to leave no administrator.
 */
export async function suspendMember(
  db: AuditExecutor,
  input: { userId: string; actorUserId: string; context?: AuditContext; now?: Date },
): Promise<SuspendResult> {
  const now = input.now ?? new Date();
  return withAudit(db, { ...input.context, actorUserId: input.actorUserId }, async (tx, audit) => {
    const admins = await lockActiveAdmins(tx);
    const [person] = await tx.select({ id: user.id }).from(user).where(eq(user.id, input.userId));
    if (!person) return "not_found";
    const before = await currentState(tx, input.userId);
    if (before.roles.length === 0) return before.organisationIds.length === 0 ? "not_found" : "already_suspended";
    if (before.roles.includes("admin") && admins.filter((id) => id !== input.userId).length === 0) return "last_admin";

    await tx.update(staffRoles).set({ revokedAt: now }).where(inArray(staffRoles.id, before.grants.map((g) => g.id)));
    const ended = await tx.delete(session).where(eq(session.userId, input.userId)).returning({ id: session.id });
    await audit({
      action: "staff_member.suspend",
      entityType: "staff_member",
      entityId: input.userId,
      before: { roles: before.roles, organisationIds: before.organisationIds },
      after: { roles: [], organisationIds: before.organisationIds, endedSessions: ended.length },
    });
    return "suspended";
  });
}

/** The user behind an email address, if staff (holds a role or belongs to a body). */
export async function findStaffByEmail(db: AuditExecutor, email: string): Promise<StaffMember | null> {
  const [person] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  return person ? getStaffMember(db, person.id) : null;
}
