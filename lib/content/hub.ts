import type { SectionDef, SectionEntry } from "./sections";
import type { ContentPage } from "./types";

export type HubItem =
  | { kind: "topic"; order: number | undefined; page: ContentPage }
  | { kind: "entry"; order: number; entry: SectionEntry };

/**
 * One list for a section's hub: its topic pages and its tool entries, in
 * the order each carries. A page with no order goes after everything that
 * has one, in the order it arrived. A page and an entry with the same order
 * list the page first.
 */
export function mergeHubItems(section: Pick<SectionDef, "entries">, pages: readonly ContentPage[]): HubItem[] {
  const items: HubItem[] = [
    ...pages.map((page): HubItem => ({ kind: "topic", order: page.order, page })),
    ...section.entries.map((entry): HubItem => ({ kind: "entry", order: entry.order, entry })),
  ];
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const ao = a.item.order ?? Number.POSITIVE_INFINITY;
      const bo = b.item.order ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao < bo ? -1 : 1;
      if (a.item.kind !== b.item.kind) return a.item.kind === "topic" ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

export function hubItemKey(item: HubItem): string {
  return item.kind === "topic" ? `topic-${item.page._id}` : `entry-${item.entry.path}`;
}
