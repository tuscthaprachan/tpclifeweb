import type { ConsoleIconName } from "@/components/admin/icons";
import type { AdminKey } from "@/lib/i18n/admin";
import type { BorrowingCounts, CaseCounts, EditorCounts } from "./summary";

export type TodoId = "complaintsOverdue" | "escalated" | "loansOverdue" | "loansAwaiting" | "unassigned" | "collectToday" | "returnToday" | "drafts" | "alertsLive";

export interface TodoItem {
  id: TodoId;
  count: number;
  /** Where the line goes: the filtered inbox, a section of the loans page or the content hub. */
  href: string;
  icon: ConsoleIconName;
  /** A sentence with a `{count}` placeholder. */
  labelKey: AdminKey;
  /** An action is something to do; information is shown after the actions and is not counted as work. */
  kind: "action" | "info";
}

interface Spec extends Omit<TodoItem, "count"> {
  /** 1 is most urgent. */
  tier: number;
  count: number;
}

/**
 * The Home page's to-do list: only lines with something to do, most urgent
 * first. Overdue and escalated work comes first, then what waits for a
 * decision or an owner, then what is due today, then drafts. A live service
 * alert is information, not work, so it goes last and is marked as such.
 * Within a tier the order is fixed, so the list never shuffles between visits.
 */
export function buildTodo(input: { cases: CaseCounts | null; borrowing: BorrowingCounts | null; editor: EditorCounts | null }): TodoItem[] {
  const { cases, borrowing, editor } = input;
  const specs: Spec[] = [
    { id: "complaintsOverdue", tier: 1, count: cases?.complaints ? cases.overdue : 0, href: "/admin/cases?service=complaint&open=1&overdue=1", icon: "overdue", labelKey: "shTodoOverdue", kind: "action" },
    { id: "escalated", tier: 1, count: cases?.complaints ? cases.escalated : 0, href: "/admin/cases?escalated=1&open=1", icon: "escalated", labelKey: "shTodoEscalated", kind: "action" },
    { id: "loansOverdue", tier: 1, count: borrowing?.overdue ?? 0, href: "/admin/borrowing#br-overdue", icon: "overdue", labelKey: "shTodoLoansOverdue", kind: "action" },
    { id: "loansAwaiting", tier: 2, count: borrowing?.pending ?? 0, href: "/admin/borrowing#br-awaiting", icon: "borrowSchedule", labelKey: "shTodoLoansAwaiting", kind: "action" },
    { id: "unassigned", tier: 2, count: cases?.unassigned ?? 0, href: "/admin/cases?assignee=unassigned&open=1", icon: "cases", labelKey: "shTodoUnassigned", kind: "action" },
    { id: "collectToday", tier: 3, count: borrowing?.collectToday ?? 0, href: "/admin/borrowing#br-collect-today", icon: "borrowCalendar", labelKey: "shTodoCollectToday", kind: "action" },
    { id: "returnToday", tier: 3, count: borrowing?.dueToday ?? 0, href: "/admin/borrowing#br-return-today", icon: "borrowCalendar", labelKey: "shTodoReturnToday", kind: "action" },
    { id: "drafts", tier: 4, count: editor?.drafts ?? 0, href: "/admin/content", icon: "draft", labelKey: "shTodoDrafts", kind: "action" },
    { id: "alertsLive", tier: 5, count: editor?.liveAlerts ?? 0, href: "/admin/content/alerts", icon: "alerts", labelKey: "shTodoAlertsLive", kind: "info" },
  ];
  return specs
    .filter((s) => s.count > 0)
    .sort((x, y) => x.tier - y.tier)
    .map(({ tier: _tier, ...item }) => item);
}

/** How many lines are work to do (information lines are not counted). */
export function todoCount(items: readonly TodoItem[]): number {
  return items.filter((i) => i.kind === "action").reduce((sum, i) => sum + i.count, 0);
}
