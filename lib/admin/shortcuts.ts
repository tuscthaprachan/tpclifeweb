/**
 * The g-prefix keyboard shortcuts ("g" then a letter goes to a page). Derived
 * from the navigation the person was given, so a shortcut exists only for a
 * page they can open and never needs its own role check. Pure, so the client
 * handler, the help dialog and the tests all read one map.
 */

import type { ConsoleIconName } from "@/components/admin/icons";
import { flattenNav, type ResolvedNav } from "./nav-match";

export interface GoShortcut {
  /** The letter pressed after `g`. */
  key: string;
  href: string;
  label: string;
  icon: ConsoleIconName;
}

/** Letter, then the id of the nav item that owns it. Hidden items count: Team's pages have shortcuts too. */
const TARGETS: readonly { key: string; id: string }[] = [
  { key: "h", id: "home" },
  { key: "c", id: "inbox" },
  { key: "l", id: "loans" },
  { key: "n", id: "website" },
  { key: "p", id: "performance" },
  { key: "t", id: "team" },
  { key: "a", id: "audit" },
  { key: "s", id: "staff" },
];

export function deriveShortcuts(nav: ResolvedNav): GoShortcut[] {
  const items = flattenNav(nav.items).map((n) => n.item);
  const out: GoShortcut[] = [];
  for (const target of TARGETS) {
    const item = items.find((i) => i.id === target.id);
    if (item) out.push({ key: target.key, href: item.href, label: item.label, icon: item.icon });
  }
  return out;
}

/** How long after `g` the next key still counts. */
export const GO_TIMEOUT_MS = 1500;
