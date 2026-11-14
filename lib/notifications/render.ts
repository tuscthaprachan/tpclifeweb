import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import type { NotificationKind, NotificationRow } from "@/lib/db/schema/notifications";

export const NOTIFICATION_KIND_LABEL = {
  case_assigned: "ntKindCaseAssigned",
  case_mention: "ntKindCaseMention",
  complaint_escalated: "ntKindComplaintEscalated",
  borrowing_overdue: "ntKindBorrowingOverdue",
  invite_accepted: "ntKindInviteAccepted",
} as const satisfies Record<NotificationKind, AdminKey>;

/** The title and body in the reader's language, from the stored values. Unknown kinds fall back to a neutral line. */
export function renderNotification(row: Pick<NotificationRow, "kind" | "params">, locale: Locale): { title: string; body: string } {
  const p = row.params ?? {};
  const text = (key: string) => String(p[key] ?? "");
  switch (row.kind) {
    case "case_assigned":
      return { title: a("ntKindCaseAssigned", locale), body: a("ntBodyCaseAssigned", locale, { actor: text("actor"), reference: text("reference") }) };
    case "case_mention":
      return { title: a("ntKindCaseMention", locale), body: a("ntBodyCaseMention", locale, { actor: text("actor"), reference: text("reference") }) };
    case "complaint_escalated":
      return {
        title: a("ntKindComplaintEscalated", locale),
        body: a(p.reason === "acknowledge" ? "ntBodyEscalatedAcknowledge" : "ntBodyEscalatedResolve", locale, { reference: text("reference") }),
      };
    case "borrowing_overdue":
      return { title: a("ntKindBorrowingOverdue", locale), body: a("ntBodyBorrowingOverdue", locale, { reference: text("reference"), date: p.dueAt ? formatDate(String(p.dueAt), locale) : "" }) };
    case "invite_accepted":
      return { title: a("ntKindInviteAccepted", locale), body: a("ntBodyInviteAccepted", locale, { name: text("name") }) };
    default:
      return { title: a("ntKindOther", locale), body: "" };
  }
}
