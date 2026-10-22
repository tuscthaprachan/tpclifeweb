"use server";

/**
 * Staff management. Every action starts with `requireStaff("admin", ...)`: the
 * page being hidden from non-admins is a courtesy, this is the control. An
 * admin acts only on the organisations where they hold the admin role.
 */

import { redirect } from "next/navigation";
import { getAdminLocale } from "@/lib/admin/locale";
import { getAuthBaseUrl } from "@/lib/auth";
import { isPlausibleEmail, normaliseEmail } from "@/lib/auth/domains";
import { createInvite, INVITE_TTL_DAYS, InviteError, revokeInvite } from "@/lib/auth/invites";
import { organisationsWithRole, STAFF_ROLES } from "@/lib/auth/roles";
import { auditContextFor, requireStaff } from "@/lib/auth/session";
import { revokeRole } from "@/lib/auth/staff";
import { getDb } from "@/lib/db";
import { getEmailSender, staffInvite } from "@/lib/email";
import { a } from "@/lib/i18n/admin";

export interface InviteFormState {
  values: { email: string; organisation: string; roles: string[] };
  errors: { email?: string; organisation?: string; roles?: string; form?: string };
}

export async function createStaffInvite(_prev: InviteFormState, formData: FormData): Promise<InviteFormState> {
  const locale = await getAdminLocale();
  const staff = await requireStaff("admin");
  const adminOrgs = organisationsWithRole(staff.roles, "admin");

  const values = {
    email: normaliseEmail(String(formData.get("email") ?? "")),
    organisation: String(formData.get("organisation") ?? ""),
    roles: formData.getAll("roles").map(String).filter((r) => (STAFF_ROLES as readonly string[]).includes(r)),
  };
  const errors: InviteFormState["errors"] = {};
  if (!values.email) errors.email = a("errInviteEmailRequired", locale);
  else if (!isPlausibleEmail(values.email)) errors.email = a("errEmailFormat", locale);

  const organisationId = Number(values.organisation);
  if (!Number.isInteger(organisationId) || !adminOrgs.includes(organisationId)) {
    errors.organisation = a("errInviteOrgRequired", locale);
  }
  if (values.roles.length === 0) errors.roles = a("errInviteRolesRequired", locale);
  if (Object.keys(errors).length > 0) return { values, errors };

  // Checked again against this specific organisation, not just "is an admin somewhere".
  const actor = await requireStaff("admin", organisationId);
  const db = getDb();
  const context = await auditContextFor(actor, organisationId);

  let created;
  try {
    created = await createInvite(db, { email: values.email, organisationId, roles: values.roles, invitedBy: actor.user.id, context });
  } catch (error) {
    if (error instanceof InviteError) return { values, errors: { form: a("errInviteSendFailed", locale) } };
    throw error;
  }

  const baseUrl = getAuthBaseUrl() ?? "";
  try {
    const message = staffInvite({
      inviterName: actor.user.name || actor.user.email,
      organisation: { th: created.organisation.nameTh, en: created.organisation.nameEn },
      acceptUrl: `${baseUrl}/admin/invite/${created.token}`,
      expiresInDays: INVITE_TTL_DAYS,
    });
    await getEmailSender().send({ to: created.invite.email, ...message });
  } catch (error) {
    console.error("[staff] could not send invitation", error);
    // An invitation nobody received is worse than none: take it back.
    await revokeInvite(db, { inviteId: created.invite.id, context });
    return { values, errors: { form: a("errInviteSendFailed", locale) } };
  }

  redirect(`/admin/staff?notice=invited&email=${encodeURIComponent(created.invite.email)}`);
}

export async function removeRole(formData: FormData): Promise<void> {
  const staff = await requireStaff("admin");
  const roleId = Number(formData.get("roleId"));
  if (!Number.isInteger(roleId)) redirect("/admin/staff?notice=gone");

  const result = await revokeRole(getDb(), {
    roleId,
    allowedOrganisationIds: organisationsWithRole(staff.roles, "admin"),
    context: await auditContextFor(staff),
  });
  if (result === "last_admin") redirect(`/admin/staff/roles/${roleId}/remove?error=last-admin`);
  redirect(result === "revoked" ? "/admin/staff?notice=role-removed" : "/admin/staff?notice=gone");
}

export async function cancelInvite(formData: FormData): Promise<void> {
  const staff = await requireStaff("admin");
  const inviteId = Number(formData.get("inviteId"));
  if (!Number.isInteger(inviteId)) redirect("/admin/staff?notice=gone");

  const done = await revokeInvite(getDb(), {
    inviteId,
    allowedOrganisationIds: organisationsWithRole(staff.roles, "admin"),
    context: await auditContextFor(staff),
  });
  redirect(done ? "/admin/staff?notice=invite-cancelled" : "/admin/staff?notice=gone");
}
