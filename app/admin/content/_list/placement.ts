import "server-only";

import type { ConsoleIconName } from "@/components/admin/icons";
import { placementOf, type ContentSectionId } from "@/lib/admin/nav";
import { getContentType, type ContentTypeDef } from "@/lib/admin/content/types";
import type { AdminKey } from "@/lib/i18n/admin";

export interface ContentPlacement {
  group: ContentSectionId | null;
  groupLabelKey: AdminKey | null;
  groupIcon: ConsoleIconName | null;
  icon: ConsoleIconName;
  rootLabelKey: AdminKey;
  rootHref: string;
}

/** Which website hub section a content type sits in, its icon and whether Post or Website holds it, from the nav's table so the hub, lists and edit pages always agree. */
export function contentPlacement(def: Pick<ContentTypeDef, "key">): ContentPlacement {
  const place = placementOf(def.key);
  return { group: place.section, groupLabelKey: place.sectionLabelKey, groupIcon: place.sectionIcon, icon: place.icon, rootLabelKey: place.rootLabelKey, rootHref: place.rootHref };
}

export function contentTypeBySegment(segment: string): ContentTypeDef {
  const def = getContentType(segment);
  if (!def) throw new Error(`Unknown content type ${segment}`);
  return def;
}
