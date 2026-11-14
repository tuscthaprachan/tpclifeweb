/**
 * Turns an audit entry into a sentence a staff member can read, with an icon
 * and (where the record has a console page) a link. An action with no sentence
 * falls back to its own name, so a new action is shown rather than hidden.
 * Content edits are recognised by the table name `saveContent` records.
 */

import { getTableName } from "drizzle-orm";
import type { ConsoleIconName } from "@/components/admin/icons";
import { CONTENT_TYPES, contentPath, type ContentTypeDef } from "@/lib/admin/content/types";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

interface ActionSentence {
  key: AdminKey;
  icon: ConsoleIconName;
}

const SENTENCES: Record<string, ActionSentence> = {
  "case.create": { key: "opActCaseCreate", icon: "cases" },
  "case.transition": { key: "opActCaseTransition", icon: "cases" },
  "case.assign": { key: "opActCaseAssign", icon: "cases" },
  "case.note": { key: "opActCaseNote", icon: "cases" },
  "case.public_update": { key: "opActCasePublicUpdate", icon: "cases" },
  "case.pii_purge": { key: "opActCasePurge", icon: "delete" },
  "case_link.issue": { key: "opActLinkIssue", icon: "cases" },
  "case_link.revoke": { key: "opActLinkRevoke", icon: "cases" },
  "case_contact.add": { key: "opActContactAdd", icon: "cases" },
  "case_contact.view": { key: "opActContactView", icon: "cases" },
  "complaint.create": { key: "opActComplaintCreate", icon: "cases" },
  "complaint.resolve": { key: "opActComplaintResolve", icon: "check" },
  "complaint.escalate": { key: "opActComplaintEscalate", icon: "escalated" },
  "complaint.reopen": { key: "opActComplaintReopen", icon: "cases" },
  "complaint.recategorise": { key: "opActComplaintRecategorise", icon: "cases" },
  "complaint.redirect": { key: "opActComplaintRedirect", icon: "cases" },
  "complaint.auto_close": { key: "opActComplaintAutoClose", icon: "check" },
  "complaint.survey": { key: "opActComplaintSurvey", icon: "cases" },
  "complaint.view_details": { key: "opActComplaintView", icon: "cases" },
  "lost_found.handover": { key: "opActLostFoundHandover", icon: "lostFound" },
  "lost_found.claim_decide": { key: "opActLostFoundClaimDecide", icon: "lostFound" },
  "lost_found.match_link": { key: "opActLostFoundMatch", icon: "lostFound" },
  "lost_found_item.report": { key: "opActLostFoundReport", icon: "lostFound" },
  "borrowing.create": { key: "opActBorrowCreate", icon: "borrowSchedule" },
  "borrowing.approve": { key: "opActBorrowApprove", icon: "borrowSchedule" },
  "borrowing.decline": { key: "opActBorrowDecline", icon: "borrowSchedule" },
  "borrowing.handover": { key: "opActBorrowHandover", icon: "borrowSchedule" },
  "borrowing.return": { key: "opActBorrowReturn", icon: "borrowSchedule" },
  "borrowing.settle": { key: "opActBorrowSettle", icon: "borrowSchedule" },
  "borrowing.cancel_by_staff": { key: "opActBorrowCancel", icon: "borrowSchedule" },
  "borrowing.not_collected": { key: "opActBorrowNotCollected", icon: "borrowSchedule" },
  "borrowing.item_create": { key: "opActBorrowItemCreate", icon: "borrowInventory" },
  "borrowing.item_update": { key: "opActBorrowItemUpdate", icon: "borrowInventory" },
  "staff_member.update": { key: "opActStaffUpdate", icon: "staff" },
  "staff_member.suspend": { key: "opActStaffSuspend", icon: "staff" },
  "staff_invite.create": { key: "opActStaffInvite", icon: "staff" },
  "staff_invite.accept": { key: "opActStaffInviteAccept", icon: "staff" },
  "staff_role.grant": { key: "opActRoleGrant", icon: "staff" },
  "staff_role.revoke": { key: "opActRoleRevoke", icon: "staff" },
  "staff_recovery.issue": { key: "opActRecoveryIssue", icon: "security" },
  "auth.sign_in": { key: "opActSignIn", icon: "security" },
  "auth.sign_out": { key: "opActSignOut", icon: "signOut" },
  "auth.passkey.register": { key: "opActPasskeyRegister", icon: "security" },
  "auth.passkey.remove": { key: "opActPasskeyRemove", icon: "security" },
  "account.update_name": { key: "opActAccountName", icon: "account" },
  "auth.session_revoke": { key: "opActSessionRevoke", icon: "security" },
  "auth.session_revoke_others": { key: "opActSessionRevokeOthers", icon: "security" },
  "audit.export": { key: "opActAuditExport", icon: "audit" },
  "cron.run": { key: "opActCronRun", icon: "health" },
};

const CONTENT_VERBS: Record<string, ActionSentence> = {
  create: { key: "opActContentCreate", icon: "add" },
  update: { key: "opActContentUpdate", icon: "edit" },
  publish: { key: "opActContentPublish", icon: "publish" },
  unpublish: { key: "opActContentUnpublish", icon: "draft" },
  delete: { key: "opActContentDelete", icon: "delete" },
};

const byTable = new Map<string, ContentTypeDef[]>();
for (const def of CONTENT_TYPES) {
  const name = getTableName(def.table);
  byTable.set(name, [...(byTable.get(name) ?? []), def]);
}

/** The table names `saveContent` records as `entityType` and uses as the action prefix. */
export const CONTENT_TABLE_NAMES: readonly string[] = [...byTable.keys()];

function contentOf(entityType: string): ContentTypeDef[] | undefined {
  return byTable.get(entityType);
}

export interface DescribedAction {
  text: string;
  icon: ConsoleIconName;
  /** True when a written sentence exists; false when the action name is shown as it is. */
  known: boolean;
}

/** `actor` and `entity` are already in the viewer's language (a name, a reference). */
export function describeAction(entry: { action: string; entityType: string }, locale: Locale, vars: { actor: string; entity: string }): DescribedAction {
  const direct = SENTENCES[entry.action];
  if (direct) return { text: a(direct.key, locale, vars), icon: direct.icon, known: true };

  const defs = contentOf(entry.entityType);
  const verb = entry.action.startsWith(`${entry.entityType}.`) ? entry.action.slice(entry.entityType.length + 1) : "";
  const sentence = CONTENT_VERBS[verb];
  if (defs && sentence) {
    const what = defs.length === 1 ? a(defs[0]!.oneKey, locale) : a("opContentPage", locale);
    return { text: a(sentence.key, locale, { actor: vars.actor, what }), icon: sentence.icon, known: true };
  }
  if (entry.action === "images.create" || entry.action === "images.update" || entry.action === "images.delete") {
    const s = CONTENT_VERBS[entry.action.slice("images.".length)]!;
    return { text: a(s.key, locale, { actor: vars.actor, what: a("opContentImage", locale) }), icon: s.icon, known: true };
  }
  return { text: a("opActFallback", locale, { actor: vars.actor, action: entry.action }), icon: "info", known: false };
}

/** The console page for a record, or null when it has none. */
export function entityHref(entityType: string, entityId: string): string | null {
  if (entityType === "case") return `/admin/cases/${entityId}`;
  if (entityType === "staff_member") return `/admin/staff/${encodeURIComponent(entityId)}`;
  const defs = contentOf(entityType);
  if (defs && defs.length === 1 && defs[0]!.kind === "collection") return contentPath(defs[0]!, entityId);
  return null;
}
