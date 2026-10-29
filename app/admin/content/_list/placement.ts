import "server-only";

import type { ConsoleIconName } from "@/components/admin/icons";
import { buildConsoleNav, type ConsoleGroupId } from "@/lib/admin/nav";
import { getContentType, type ContentTypeDef } from "@/lib/admin/content/types";
import type { AdminKey } from "@/lib/i18n/admin";

export interface ContentPlacement {
  group: ConsoleGroupId;
  groupLabelKey: AdminKey;
  groupIcon: ConsoleIconName;
  icon: ConsoleIconName;
}

let cache: Map<string, ContentPlacement> | undefined;

/** Where each content type sits in the sidebar (group and icon), read from the nav so the hub, lists and edit pages always agree with it. */
function placements(): Map<string, ContentPlacement> {
  if (cache) return cache;
  const nav = buildConsoleNav([{ role: "admin", organisationId: 0 }]);
  const map = new Map<string, ContentPlacement>();
  for (const group of nav.groups) {
    for (const item of group.items) {
      if (!item.id.startsWith("content-")) continue;
      map.set(item.id.slice("content-".length), { group: group.id, groupLabelKey: group.labelKey, groupIcon: group.icon, icon: item.icon });
    }
  }
  cache = map;
  return map;
}

const FALLBACK: ContentPlacement = { group: "information", groupLabelKey: "csGroupInformation", groupIcon: "groupInformation", icon: "info" };

export function contentPlacement(def: Pick<ContentTypeDef, "key">): ContentPlacement {
  return placements().get(def.key) ?? FALLBACK;
}

export function contentTypeBySegment(segment: string): ContentTypeDef {
  const def = getContentType(segment);
  if (!def) throw new Error(`Unknown content type ${segment}`);
  return def;
}
