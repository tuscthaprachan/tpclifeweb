/**
 * The g-prefix keyboard shortcuts ("g" then a letter goes to a page). Derived
 * from the navigation the person was given, so a shortcut exists only for a
 * page they can open and never needs its own role check. Pure, so the client
 * handler, the help dialog and the tests all read one map.
 */

import type { ConsoleIconName } from "@/components/admin/icons";
import type { ResolvedNav } from "./nav-match";

export interface GoShortcut {
  /** The letter pressed after `g`. */
  key: string;
  href: string;
  label: string;
  icon: ConsoleIconName;
}

/** Letter, then the nav item that owns it. `content` is the content hub, present when any content type is. */
const TARGETS: readonly { key: string; id: string }[] = [
  { key: "h", id: "dashboard" },
  { key: "c", id: "cases" },
  { key: "n", id: "content" },
  { key: "s", id: "staff" },
  { key: "a", id: "audit" },
  { key: "b", id: "borrowing-schedule" },
  { key: "p", id: "performance" },
];

export const CONTENT_HUB_HREF = "/admin/content";

export function deriveShortcuts(nav: ResolvedNav, labels: { content: string }): GoShortcut[] {
  const items = nav.groups.flatMap((g) => g.items);
  const out: GoShortcut[] = [];
  for (const target of TARGETS) {
    if (target.id === "content") {
      const first = items.find((i) => i.id.startsWith("content-"));
      if (first) out.push({ key: target.key, href: CONTENT_HUB_HREF, label: labels.content, icon: first.icon });
      continue;
    }
    const item = items.find((i) => i.id === target.id);
    if (item) out.push({ key: target.key, href: item.href, label: item.label, icon: item.icon });
  }
  return out;
}

/** How long after `g` the next key still counts. */
export const GO_TIMEOUT_MS = 1500;
