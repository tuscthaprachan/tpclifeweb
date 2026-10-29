/**
 * The shape of the primary navigation, decided in code rather than by the
 * stored list's order.
 *
 * SERVICES FIRST. The three services a student does something in (report an
 * issue, borrow equipment, lost and found) lead the navigation, in that order,
 * on every page and whatever order `primaryNav` is stored in. An editor's own
 * label for one is kept; a missing one is added with the label below.
 *
 * RETIRED. Forms is no longer a navigation item: the services replace the
 * Google Forms it pointed to, and the forms index stays reachable from the
 * home page and search. A stored entry for it is dropped.
 *
 * HIGHLIGHTED. Reporting an issue is the one item drawn as a filled pill, so
 * someone with a problem finds it first.
 *
 * PINNED. Which items stay on the desktop row; everything else folds into
 * "More". The array order is the order they appear in.
 */

import type { NavItem } from "@/lib/content/types";

export const SERVICE_NAV: readonly NavItem[] = [
  { label: { th: "แจ้งปัญหา", en: "Report an issue" }, path: "/complaints" },
  { label: { th: "ยืมอุปกรณ์", en: "Borrow equipment" }, path: "/borrow" },
  { label: { th: "ของหายและของเก็บได้", en: "Lost and found" }, path: "/lost-and-found" },
];

export const RETIRED_NAV_PATHS: readonly string[] = ["/forms"];

export const HIGHLIGHTED_NAV_PATHS: readonly string[] = ["/complaints"];

export const PINNED_NAV_PATHS: readonly string[] = ["/complaints", "/borrow", "/lost-and-found", "/getting-around", "/eat"];

/** Services first, then the stored items in their own order, without retired ones. */
export function servicesFirst(items: readonly NavItem[]): NavItem[] {
  const servicePaths = SERVICE_NAV.map((s) => s.path);
  const services = SERVICE_NAV.map((s) => items.find((item) => item.path === s.path) ?? s);
  const rest = items.filter((item) => !servicePaths.includes(item.path) && !RETIRED_NAV_PATHS.includes(item.path));
  return [...services, ...rest];
}

export function isHighlightedNav(path: string): boolean {
  return HIGHLIGHTED_NAV_PATHS.includes(path);
}

export function splitPrimaryNav(items: NavItem[]): { pinned: NavItem[]; more: NavItem[] } {
  const pinned = PINNED_NAV_PATHS.flatMap((path) => items.filter((item) => item.path === path));
  const more = items.filter((item) => !PINNED_NAV_PATHS.includes(item.path));
  return { pinned, more };
}
