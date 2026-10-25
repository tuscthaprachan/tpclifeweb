"use server";

/**
 * Staff management. Every action starts with `requireStaff("admin", ...)`: the
 * page being hidden from non-admins is a courtesy, this is the control. An
 * admin acts only on the organisations where they hold the admin role.
 *
 * Invitation and recovery links are returned to the page to show on screen
 * (once; the database keeps only a hash). If email is configured they are also
 * sent, but a failed email never undoes the link.
 */

import { redirect } from "next/navigation";
import { getAdminLocale } from "@/lib/admin/locale";
import { getAuthBaseUrl } from "@/lib/auth";
import { isPlausibleEmail, normaliseEmail } from "@/lib/auth/email-address";
import { createInvite, INVITE_TTL_DAYS, InviteError, revokeInvite } from "@/lib/auth/invites";
import { issueRecoveryLink, RECOVERY_TTL_HOURS, RecoveryError } from "@/lib/auth/recovery";
import { organisationsWithRole, STAFF_ROLES } from "@/lib/auth/roles";
import { auditContextFor, requireStaff } from "@/lib/auth/session";
import { revokeRole } from "@/lib/auth/staff";
import { getDb } from "@/lib/db";
import { getEmailSender, isEmailConfigured, staffInvite, staffRecovery, type RenderedEmail } from "@/lib/email";
import type { EmailOutcome } from "@/components/admin/LinkReady";
import { a } from "@/lib/i18n/admin";

/** Sends `message` when email is configured. Never throws: the link on screen is the delivery that counts. */
async function sendIfConfigured(to: string, message: () => RenderedEmail): Promise<EmailOutcome> {
  if (!isEmailConfigured()) return "not_configured";
  try {
    await getEmailSender().send({ to, ...message() });
    return "sent";
  } catch (error) {
    console.error("[staff] could not send email", error);
    return "failed";
  }
}

export interface InviteFormState {
  values: { email: string; organisation: string; roles: string[] };
  errors: { email?: string; organisation?: string; roles?: string; form?: string };
  /** The link just made, shown once. */
  created?: { email: string; link: string; days: number; emailed: EmailOutcome };
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
  const context = await auditContextFor(actor, organisationId);

  let created;
  try {
    created = await createInvite(getDb(), { email: values.email, organisationId, roles: values.roles, invitedBy: actor.user.id, context });
  } catch (error) {
    if (error instanceof InviteError) return { values, errors: { form: a("errInviteFailed", locale) } };
    throw error;
  }

  const link = `${getAuthBaseUrl() ?? ""}/admin/invite/${created.token}`;
  const emailed = await sendIfConfigured(created.invite.email, () =>
    staffInvite({
      inviterName: actor.user.name || actor.user.email,
      organisation: { th: created.organisation.nameTh, en: created.organisation.nameEn },
      acceptUrl: link,
      expiresInDays: INVITE_TTL_DAYS,
    }),
  );

  return {
    values: { email: "", organisation: values.organisation, roles: [] },
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
      allowedOrganisationIds: organisationsWithRole(staff.roles, "admin"),
      context: await auditContextFor(staff),
    });
  } catch (error) {
    if (error instanceof RecoveryError) {
      if (error.code === "last_admin") return { error: a("errRecoverySelf", locale) };
      if (error.code === "out_of_scope" || error.code === "not_staff" || error.code === "unknown_user") {
        return { error: a("errRecoveryScope", locale) };
      }
      return { error: a("errRecoveryFailed", locale) };
    }
    throw error;
  }

  const link = `${getAuthBaseUrl() ?? ""}/admin/recover/${issued.token}`;
  const organisationId = organisationsWithRole(staff.roles, "admin")[0];
  const organisation = staff.organisations.find((o) => o.id === organisationId) ?? staff.organisations[0];
  const emailed = await sendIfConfigured(issued.person.email, () =>
    staffRecovery({
      organisation: { th: organisation?.nameTh ?? "", en: organisation?.nameEn ?? "" },
      recoverUrl: link,
      expiresInHours: RECOVERY_TTL_HOURS,
    }),
  );
  return { created: { person: issued.person.name || issued.person.email, email: issued.person.email, link, hours: RECOVERY_TTL_HOURS, emailed } };
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
