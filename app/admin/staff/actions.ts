"use server";

/**
 * Staff management. Every action starts with `requireStaff("admin")`: the
 * page being hidden from non-admins is a courtesy, this is the control. Any
 * admin may manage everyone, in either organisation.
 *
 * Invitation and recovery links are returned to the page to show on screen
 * (once; the database keeps only a hash). They are also emailed, but a failed
 * email never undoes the link.
 */

import { redirect } from "next/navigation";
import { getAdminLocale } from "@/lib/admin/locale";
import { getAuthBaseUrl } from "@/lib/auth";
import { isPlausibleEmail, normaliseEmail } from "@/lib/auth/email-address";
import { createInvite, INVITE_TTL_DAYS, InviteError, revokeInvite } from "@/lib/auth/invites";
import { issueRecoveryLink, RECOVERY_TTL_HOURS, RecoveryError } from "@/lib/auth/recovery";
import { STAFF_ROLES, type StaffRole } from "@/lib/auth/roles";
import { auditContextFor, requireStaff } from "@/lib/auth/session";
import { findStaffByEmail, grantToStaffMember, listOrganisations, suspendMember, updateStaffMember } from "@/lib/auth/staff";
import { getDb } from "@/lib/db";
import { isEmailConfigured, sendEmail, staffInvite, staffRecovery, type RenderedEmail } from "@/lib/email";
import type { EmailOutcome } from "@/components/admin/LinkReady";
import { a } from "@/lib/i18n/admin";

/** Sends `message`. Never throws: the link on screen is the delivery that counts. */
async function sendLink(to: string, category: "staff_invite" | "staff_recovery", message: () => RenderedEmail): Promise<EmailOutcome> {
  if (!isEmailConfigured()) return "not_configured";
  const result = await sendEmail({ to, ...message(), tags: [{ name: "category", value: category }] });
  return result.ok ? "sent" : "failed";
}

export interface InviteFormState {
  values: { email: string; organisations: string[]; roles: string[] };
  errors: { email?: string; organisations?: string; roles?: string; form?: string };
  /** The link just made, shown once. */
  created?: { email: string; link: string; days: number; emailed: EmailOutcome };
  /** The address already belonged to staff, so roles and organisations were added directly. */
  granted?: { userId: string; email: string; changed: boolean };
}

const parseRoles = (formData: FormData): StaffRole[] =>
  STAFF_ROLES.filter((role) => formData.getAll("roles").map(String).includes(role));

async function parseOrganisationIds(formData: FormData): Promise<{ raw: string[]; ids: number[] }> {
  const raw = formData.getAll("organisations").map(String);
  const known = new Set((await listOrganisations(getDb())).map((o) => o.id));
  const ids = [...new Set(raw.map(Number).filter((n) => Number.isInteger(n) && known.has(n)))].sort((x, y) => x - y);
  return { raw, ids };
}

export async function createStaffInvite(_prev: InviteFormState, formData: FormData): Promise<InviteFormState> {
  const locale = await getAdminLocale();
  const actor = await requireStaff("admin");

  const roles = parseRoles(formData);
  const { raw, ids: organisationIds } = await parseOrganisationIds(formData);
  const values = { email: normaliseEmail(String(formData.get("email") ?? "")), organisations: raw, roles };
  const errors: InviteFormState["errors"] = {};
  if (!values.email) errors.email = a("errInviteEmailRequired", locale);
  else if (!isPlausibleEmail(values.email)) errors.email = a("errEmailFormat", locale);
  if (organisationIds.length === 0) errors.organisations = a("errInviteOrgRequired", locale);
  if (roles.length === 0) errors.roles = a("errInviteRolesRequired", locale);
  if (Object.keys(errors).length > 0) return { values, errors };

  const context = await auditContextFor(actor, actor.organisations[0]?.id);
  const db = getDb();

  const existing = await findStaffByEmail(db, values.email);
  if (existing) {
    const result = await grantToStaffMember(db, { userId: existing.userId, roles, organisationIds, actorUserId: actor.user.id, context });
    if (result !== "updated" && result !== "unchanged") return { values, errors: { form: a("errInviteFailed", locale) } };
    return {
      values: { email: "", organisations: raw, roles: [] },
      errors: {},
      granted: { userId: existing.userId, email: existing.email, changed: result === "updated" },
    };
  }

  let created;
  try {
    created = await createInvite(db, { email: values.email, organisationIds, roles, invitedBy: actor.user.id, context });
  } catch (error) {
    if (error instanceof InviteError) return { values, errors: { form: a("errInviteFailed", locale) } };
    throw error;
  }

  const link = `${getAuthBaseUrl() ?? ""}/admin/invite/${created.token}`;
  const emailed = await sendLink(created.invite.email, "staff_invite", () =>
    staffInvite({
      inviterName: actor.user.name || actor.user.email,
      organisation: {
        th: created.organisations.map((o) => o.nameTh).join(" และ "),
        en: created.organisations.map((o) => o.nameEn).join(" and "),
      },
      acceptUrl: link,
      expiresInDays: INVITE_TTL_DAYS,
    }),
  );

  return {
    values: { email: "", organisations: raw, roles: [] },
    errors: {},
    created: { email: created.invite.email, link, days: INVITE_TTL_DAYS, emailed },
  };
}

export interface RecoveryFormState {
  error?: string;
  /** The link just made, shown once. */
  created?: { person: string; email: string; link: string; hours: number; emailed: EmailOutcome };
}

export async function issueRecovery(_prev: RecoveryFormState, formData: FormData): Promise<RecoveryFormState> {
  const locale = await getAdminLocale();
  const staff = await requireStaff("admin");
  const userId = String(formData.get("userId") ?? "");

  let issued;
  try {
    issued = await issueRecoveryLink(getDb(), {
      userId,
      issuedBy: staff.user.id,
      context: await auditContextFor(staff),
    });
  } catch (error) {
    if (error instanceof RecoveryError) {
      if (error.code === "last_admin") return { error: a("errRecoverySelf", locale) };
      if (error.code === "not_staff" || error.code === "unknown_user") {
        return { error: a("errRecoveryScope", locale) };
      }
      return { error: a("errRecoveryFailed", locale) };
    }
    throw error;
  }

  const link = `${getAuthBaseUrl() ?? ""}/admin/recover/${issued.token}`;
  const organisation = staff.organisations[0];
  const emailed = await sendLink(issued.person.email, "staff_recovery", () =>
    staffRecovery({
      organisation: { th: organisation?.nameTh ?? "", en: organisation?.nameEn ?? "" },
      recoverUrl: link,
      expiresInHours: RECOVERY_TTL_HOURS,
    }),
  );
  return { created: { person: issued.person.name || issued.person.email, email: issued.person.email, link, hours: RECOVERY_TTL_HOURS, emailed } };
}

const MEMBER_ERRORS: Record<string, string> = {
  last_admin: "last-admin",
  no_roles: "no-roles",
  no_organisation: "no-organisation",
  unknown_organisation: "no-organisation",
};

export async function updateMember(formData: FormData): Promise<void> {
  const staff = await requireStaff("admin");
  const userId = String(formData.get("userId") ?? "");
  const base = `/admin/staff/${encodeURIComponent(userId)}`;
  const { ids } = await parseOrganisationIds(formData);

  const result = await updateStaffMember(getDb(), {
    userId,
    roles: parseRoles(formData),
    organisationIds: ids,
    actorUserId: staff.user.id,
    context: await auditContextFor(staff, staff.organisations[0]?.id),
  });
  if (result === "not_found") redirect("/admin/staff?notice=gone");
  if (result === "updated" || result === "unchanged") redirect(`${base}?notice=${result === "updated" ? "saved" : "unchanged"}`);
  redirect(`${base}?error=${MEMBER_ERRORS[result] ?? "failed"}`);
}

export async function suspendMemberAction(formData: FormData): Promise<void> {
  const staff = await requireStaff("admin");
  const userId = String(formData.get("userId") ?? "");
  const base = `/admin/staff/${encodeURIComponent(userId)}`;

  const result = await suspendMember(getDb(), {
    userId,
    actorUserId: staff.user.id,
    context: await auditContextFor(staff, staff.organisations[0]?.id),
  });
  if (result === "not_found") redirect("/admin/staff?notice=gone");
  if (result === "last_admin") redirect(`${base}?error=last-admin`);
  redirect(`${base}?notice=${result === "suspended" ? "suspended" : "unchanged"}`);
}

export async function cancelInvite(formData: FormData): Promise<void> {
  const staff = await requireStaff("admin");
  const inviteId = Number(formData.get("inviteId"));
  if (!Number.isInteger(inviteId)) redirect("/admin/staff?notice=gone");

  const done = await revokeInvite(getDb(), {
    inviteId,
    context: await auditContextFor(staff),
  });
  redirect(done ? "/admin/staff?notice=invite-cancelled" : "/admin/staff?notice=gone");
}
