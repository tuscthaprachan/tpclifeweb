import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { events, newsPosts, policies } from "@/lib/db/schema";
import { CATEGORIES, POLICY_STATUSES } from "@/lib/db/schema/content/enums";
import type { AdminKey } from "@/lib/i18n/admin";
import type { SortKey } from "./list-query";
import type { ContentTypeDef } from "./types";

/** A filter on one enum column of a type. */
export interface ListFacet {
  labelKey: AdminKey;
  column: AnyPgColumn;
  options: readonly { value: string; labelKey: AdminKey }[];
}

/** What a type adds to the common list: a date column to sort by, and one facet. */
export interface ListExtras {
  date?: { column: AnyPgColumn; labelKey: AdminKey };
  facet?: ListFacet;
}

const CATEGORY_FACET = (column: AnyPgColumn): ListFacet => ({
  labelKey: "clFilterCategory",
  column,
  options: CATEGORIES.map((value) => ({
    value,
    labelKey: ({ transport: "clCatTransport", welfare: "clCatWelfare", activity: "clCatActivity", governance: "clCatGovernance" } as const)[value],
  })),
});

const POLICY_LABELS = {
  notStarted: "clPolNotStarted",
  inProgress: "clPolInProgress",
  delivered: "clPolDelivered",
  blocked: "clPolBlocked",
  dropped: "clPolDropped",
} as const satisfies Record<(typeof POLICY_STATUSES)[number], AdminKey>;

const EXTRAS: Record<string, ListExtras> = {
  news: { date: { column: newsPosts.publishedAt, labelKey: "clColPublished" }, facet: CATEGORY_FACET(newsPosts.category) },
  events: { date: { column: events.startsAt, labelKey: "clColStarts" }, facet: CATEGORY_FACET(events.category) },
  policies: {
    facet: {
      labelKey: "clFilterPolicyStatus",
      column: policies.policyStatus,
      options: POLICY_STATUSES.map((value) => ({ value, labelKey: POLICY_LABELS[value] })),
    },
  },
};

export function listExtras(def: Pick<ContentTypeDef, "key">): ListExtras {
  return EXTRAS[def.key] ?? {};
}

/** The sort keys a type offers. */
export function sortableKeys(def: ContentTypeDef): SortKey[] {
  const extras = listExtras(def);
  return [...(def.columns.title ? (["title"] as const) : []), "updated", ...(def.columns.status ? (["status"] as const) : []), ...(extras.date ? (["date"] as const) : [])];
}
