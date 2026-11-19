import { hasAnyRole } from "@/lib/auth/roles";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import type { ActiveRole } from "@/lib/auth/roles";
import { TabNav } from "./TabNav";

export type LoanTab = "today" | "calendar" | "inventory";

/** The tab strip under each borrowing page header. Inventory is for officers and admins; all loans opens the case inbox. */
export function LoanTabs({ current, roles, locale }: { current: LoanTab; roles: readonly ActiveRole[]; locale: Locale }) {
  const items = [
    { id: "today", label: a("dkLoanToday", locale), href: "/admin/borrowing" },
    { id: "calendar", label: a("dkLoanCalendar", locale), href: "/admin/borrowing/calendar" },
    ...(hasAnyRole(roles, ["officer", "admin"]) ? [{ id: "inventory", label: a("dkLoanInventory", locale), href: "/admin/borrowing/items" }] : []),
    { id: "all", label: a("dkLoanAll", locale), href: "/admin/cases?service=borrowing" },
  ];
  return <TabNav label={a("dkLoanTabs", locale)} items={items} current={current} />;
}
