/**
 * The pure half of the console navigation: shapes and path matching with no
 * imports beyond types, so client components can use it without pulling in the
 * database schema that `nav.ts` reads.
 */

import type { ConsoleIconName } from "@/components/admin/icons";

export type ConsoleGroupId =
  | "work"
  | "announcements"
  | "information"
  | "directory"
  | "canteen"
  | "lostFound"
  | "borrowing"
  | "media"
  | "settings";

/** A nav item with its label already resolved to the staff member's language. Safe to pass to client components. */
export interface ResolvedNavItem {
  id: string;
  href: string;
  label: string;
  icon: ConsoleIconName;
  matchPrefix: string;
  exact?: boolean;
}

export interface ResolvedNavGroup {
  id: ConsoleGroupId;
  label: string;
  icon: ConsoleIconName;
  items: ResolvedNavItem[];
}

export interface ResolvedQuickCreate {
  id: string;
  href: string;
  /** For example "Add news post". */
  label: string;
  icon: ConsoleIconName;
  groupId: ConsoleGroupId;
  groupLabel: string;
}

export interface ResolvedNav {
  groups: ResolvedNavGroup[];
  quickCreate: ResolvedQuickCreate[];
}

interface MatchableItem {
  href: string;
  matchPrefix: string;
  exact?: boolean;
}

/** True when `pathname` is the item's prefix or sits beneath it (so `/admin/cases` does not match `/admin/cases-old`). */
export function pathMatches(pathname: string, item: MatchableItem): boolean {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (item.exact) return path === item.matchPrefix;
  return path === item.matchPrefix || path.startsWith(`${item.matchPrefix}/`);
}

/**
 * The nav item and group that own `pathname`, by longest prefix, or null on a
 * page the nav does not list. Works on resolved and unresolved navs alike.
 */
export function findActive<G extends { items: readonly MatchableItem[] }>(
  groups: readonly G[],
  pathname: string,
): { group: G; item: G["items"][number] } | null {
  let best: { group: G; item: G["items"][number] } | null = null;
  for (const group of groups) {
    for (const item of group.items) {
      if (!pathMatches(pathname, item)) continue;
      if (!best || item.matchPrefix.length > best.item.matchPrefix.length) best = { group, item };
    }
  }
  return best;
}
