import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { contentPages, events, newsPosts, policies } from "@/lib/db/schema";
import { SECTIONS } from "@/lib/content/sections";
import { CATEGORIES, CONTENT_SECTIONS, POLICY_STATUSES } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { pick, type Locale, type LocaleString } from "@/lib/i18n/config";
import type { SortKey } from "./list-query";
import type { ContentTypeDef } from "./types";

/** A filter on one enum column of a type. */
export interface ListFacet {
  labelKey: AdminKey;
  column: AnyPgColumn;
  options: readonly FacetOption[];
}

/** One choice of a facet: a console string, or a bilingual label that lives elsewhere (the section names). */
export interface FacetOption {
  value: string;
  labelKey?: AdminKey;
  label?: LocaleString;
}

export function facetOptionLabel(option: FacetOption, locale: Locale): string {
  return option.label ? pick(option.label, locale) : a(option.labelKey!, locale);
}

/** What a type adds to the common list: a date column to sort by, and one facet. */
export interface ListExtras {
  date?: { column: AnyPgColumn; labelKey: AdminKey };
  facet?: ListFacet;
  /** Show the facet's value as a column (topic pages: the section). */
  sectionColumn?: boolean;
  /** A position column that can be sorted by. */
  order?: { column: AnyPgColumn; labelKey: AdminKey };
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

const SECTION_FACET: ListFacet = {
  labelKey: "clFilterSection",
  column: contentPages.section,
  options: CONTENT_SECTIONS.map((value) => ({ value, label: SECTIONS[value].label })),
};

const EXTRAS: Record<string, ListExtras> = {
  news: { date: { column: newsPosts.publishedAt, labelKey: "clColPublished" }, facet: CATEGORY_FACET(newsPosts.category) },
  events: { date: { column: events.startsAt, labelKey: "clColStarts" }, facet: CATEGORY_FACET(events.category) },
  topicPages: { facet: SECTION_FACET, sectionColumn: true, order: { column: contentPages.sortOrder, labelKey: "clColOrder" } },
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
  return [...(def.columns.title ? (["title"] as const) : []), "updated", ...(def.columns.status ? (["status"] as const) : []), ...(extras.date ? (["date"] as const) : []), ...(extras.order ? (["order"] as const) : [])];
}
