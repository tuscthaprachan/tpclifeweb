/**
 * Which primary navigation items stay on the desktop row and which fold into
 * the "More" disclosure.
 *
 * Pinning is decided by PATH, not by position in the stored list, so an editor
 * can reorder `primaryNav` in the admin console (or add and remove other items)
 * without the desktop row changing shape. The array order is the order the
 * pinned items appear in, whatever order they are stored in. A pinned path
 * that is missing from the list is simply skipped.
 */

import type { NavItem } from "@/lib/content/types";

export const PINNED_NAV_PATHS: readonly string[] = ["/eat", "/welfare"];

export function splitPrimaryNav(items: NavItem[]): { pinned: NavItem[]; more: NavItem[] } {
  const pinned = PINNED_NAV_PATHS.flatMap((path) => items.filter((item) => item.path === path));
  const more = items.filter((item) => !PINNED_NAV_PATHS.includes(item.path));
  return { pinned, more };
}
