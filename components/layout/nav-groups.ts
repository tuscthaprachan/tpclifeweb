/**
 * Which primary navigation items stay on the desktop row and which fold into
 * the "More" disclosure: the first PINNED_NAV_COUNT items in the order the
 * admin console stores them, then the rest under More.
 */

import type { NavItem } from "@/lib/content/types";

export const PINNED_NAV_COUNT = 4;

export function splitPrimaryNav(items: NavItem[]): { pinned: NavItem[]; more: NavItem[] } {
  return { pinned: items.slice(0, PINNED_NAV_COUNT), more: items.slice(PINNED_NAV_COUNT) };
}
