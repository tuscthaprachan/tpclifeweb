import { describe, expect, it } from "vitest";
import { buildTodo, todoCount } from "@/lib/admin/dashboard/todo";
import type { BorrowingCounts, CaseCounts, EditorCounts } from "@/lib/admin/dashboard/summary";
import { A } from "@/lib/i18n/admin";

const cases = (over: Partial<CaseCounts> = {}): CaseCounts => ({ open: 0, overdue: 0, escalated: 0, unassigned: 0, mine: 0, complaints: true, ...over });
const loans = (over: Partial<BorrowingCounts> = {}): BorrowingCounts => ({ pending: 0, collectToday: 0, dueToday: 0, overdue: 0, ...over });
const editor = (over: Partial<EditorCounts> = {}): EditorCounts => ({ drafts: 0, expired: 0, liveAlerts: 0, ...over });

describe("home to-do list", () => {
  it("is empty when every count is zero or the person has no counts", () => {
    expect(buildTodo({ cases: cases(), borrowing: loans(), editor: editor() })).toEqual([]);
    expect(buildTodo({ cases: null, borrowing: null, editor: null })).toEqual([]);
  });

  it("lists only non-zero lines, most urgent first", () => {
    const todo = buildTodo({
      cases: cases({ overdue: 3, escalated: 2, unassigned: 4 }),
      borrowing: loans({ pending: 1, overdue: 1, collectToday: 2, dueToday: 5 }),
      editor: editor({ drafts: 5, liveAlerts: 1 }),
    });
    expect(todo.map((t) => t.id)).toEqual(["complaintsOverdue", "escalated", "loansOverdue", "loansAwaiting", "unassigned", "collectToday", "returnToday", "drafts", "alertsLive"]);
    expect(todo.map((t) => t.count)).toEqual([3, 2, 1, 1, 4, 2, 5, 5, 1]);
  });

  it("puts overdue and escalated before awaiting, due today before drafts", () => {
    const ids = buildTodo({ cases: cases({ unassigned: 1 }), borrowing: loans({ dueToday: 1, overdue: 1 }), editor: editor({ drafts: 2 }) }).map((t) => t.id);
    expect(ids).toEqual(["loansOverdue", "unassigned", "returnToday", "drafts"]);
  });

  it("links each line to where the work is", () => {
    const byId = Object.fromEntries(
      buildTodo({ cases: cases({ overdue: 1, escalated: 1, unassigned: 1 }), borrowing: loans({ pending: 1, overdue: 1, collectToday: 1, dueToday: 1 }), editor: editor({ drafts: 1, liveAlerts: 1 }) }).map((t) => [t.id, t.href]),
    );
    expect(byId).toEqual({
      complaintsOverdue: "/admin/cases?service=complaint&open=1&overdue=1",
      escalated: "/admin/cases?escalated=1&open=1",
      unassigned: "/admin/cases?assignee=unassigned&open=1",
      loansAwaiting: "/admin/borrowing#br-awaiting",
      loansOverdue: "/admin/borrowing#br-overdue",
      collectToday: "/admin/borrowing#br-collect-today",
      returnToday: "/admin/borrowing#br-return-today",
      drafts: "/admin/content",
      alertsLive: "/admin/content/alerts",
    });
  });

  it("ignores overdue and escalated for staff who do not work complaints", () => {
    expect(buildTodo({ cases: cases({ complaints: false, overdue: 4, escalated: 4, unassigned: 2 }), borrowing: null, editor: null }).map((t) => t.id)).toEqual(["unassigned"]);
  });

  it("treats a live alert as information and leaves it out of the count of things to do", () => {
    const todo = buildTodo({ cases: null, borrowing: null, editor: editor({ liveAlerts: 2 }) });
    expect(todo).toEqual([expect.objectContaining({ id: "alertsLive", kind: "info" })]);
    expect(todoCount(todo)).toBe(0);
    expect(todoCount(buildTodo({ cases: cases({ overdue: 3 }), borrowing: loans({ pending: 1 }), editor: editor({ liveAlerts: 2 }) }))).toBe(4);
  });

  it("has a sentence with a count in both languages for every line", () => {
    const all = buildTodo({ cases: cases({ overdue: 1, escalated: 1, unassigned: 1 }), borrowing: loans({ pending: 1, overdue: 1, collectToday: 1, dueToday: 1 }), editor: editor({ drafts: 1, liveAlerts: 1 }) });
    expect(all).toHaveLength(9);
    for (const item of all) {
      expect(A[item.labelKey].en).toContain("{count}");
      expect(A[item.labelKey].th).toContain("{count}");
    }
  });
});
