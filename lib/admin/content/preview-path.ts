import { PREVIEW_ROUTE } from "./capabilities";
import { getContentType, viewPathOf } from "./types";

/** The public path (no language prefix) a draft is previewed on, or null when the type has no preview or the row has no address. */
export function previewPath(segment: string, row: { slug?: string | null; section?: string | null }): string | null {
  const def = getContentType(segment);
  if (def?.viewPathFor) return viewPathOf(def, row);
  const route = PREVIEW_ROUTE[segment];
  return route && row.slug ? `${route}/${row.slug}` : null;
}
