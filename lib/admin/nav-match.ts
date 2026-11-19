/**
 * The pure half of the console navigation: shapes and path matching with no
 * imports beyond types, so client components can use it without pulling in the
 * database schema that `nav.ts` reads.
 *
 * The nav is a short list of top-level entries, some with children. A child
 * can be `hidden`: the sidebar does not list it, but breadcrumbs, the command
 * palette and the keyboard shortcuts still resolve it, and the sidebar marks
 * its visible parent as the current page.
 */

import type { ConsoleIconName } from "@/components/admin/icons";

/** A nav item with its label already resolved to the staff member's language. Safe to pass to client components. */
export interface ResolvedNavItem {
  id: string;
  href: string;
  label: string;
  icon: ConsoleIconName;
  /** The item is active on any of these paths and anything beneath them. */
  match: string[];
  /** Active on the exact path only (Home, which is the prefix of everything). */
  exact?: boolean;
  /** Left out of the sidebar but still found by breadcrumbs, the palette and shortcuts. */
  hidden?: boolean;
  children: ResolvedNavItem[];
}

export interface ResolvedQuickCreate {
  id: string;
  href: string;
  /** For example "Add news post". */
  label: string;
  icon: ConsoleIconName;
  /** The part of the console it belongs to, for the palette ("Post" or "Website"). */
  groupLabel: string;
}

export interface ResolvedNav {
  items: ResolvedNavItem[];
  quickCreate: ResolvedQuickCreate[];
}

export interface NavNode<T> {
  id: string;
  match: readonly string[];
  exact?: boolean;
  hidden?: boolean;
  children?: readonly T[];
}

/** True when `pathname` is one of the item's prefixes or sits beneath it (so `/admin/cases` does not match `/admin/cases-old`). */
export function pathMatches(pathname: string, item: { match: readonly string[]; exact?: boolean }): boolean {
  return matchLength(pathname, item) > 0;
}

function matchLength(pathname: string, item: { match: readonly string[]; exact?: boolean }): number {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  let best = 0;
  for (const prefix of item.match) {
    const hit = item.exact ? path === prefix : path === prefix || path.startsWith(`${prefix}/`);
    if (hit && prefix.length > best) best = prefix.length;
  }
  return best;
}

export interface ActiveNav<T> {
  /** The most specific item for the path; may be hidden. */
  item: T;
  /** The top-level entry that holds `item`, or null when `item` is itself top level. */
  parent: T | null;
  /** The item the sidebar marks as the current page: `item` when listed, otherwise its parent. Null when neither is listed. */
  current: T | null;
}

/**
 * The nav item that owns `pathname`: the longest matching prefix wins, a child
 * beats the entry that holds it on a tie, and null means the nav does not list
 * the page. Works on resolved and unresolved navs alike.
 */
export function findActive<T extends NavNode<T>>(items: readonly T[], pathname: string): ActiveNav<T> | null {
  let best: { item: T; parent: T | null; length: number } | null = null;
  const consider = (item: T, parent: T | null) => {
    const length = matchLength(pathname, item);
    if (length > 0 && (!best || length > best.length || (length === best.length && parent && !best.parent))) best = { item, parent, length };
  };
  for (const top of items) {
    consider(top, null);
    for (const child of top.children ?? []) consider(child, top);
  }
  const found = best as { item: T; parent: T | null } | null;
  if (!found) return null;
  const { item, parent } = found;
  const current = !item.hidden ? item : parent && !parent.hidden ? parent : null;
  return { item, parent, current };
}

/** Every item, each top-level entry followed by its children. */
export function flattenNav<T extends NavNode<T>>(items: readonly T[]): { item: T; parent: T | null }[] {
  return items.flatMap((top) => [{ item: top, parent: null as T | null }, ...(top.children ?? []).map((child) => ({ item: child, parent: top as T | null }))]);
}
