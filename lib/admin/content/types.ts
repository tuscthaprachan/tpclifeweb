import { eq, type SQL } from "drizzle-orm";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";
import type { ContentEntityType } from "@/lib/content/revalidate";
import {
  canteenDishes,
  canteenSettings,
  canteenStalls,
  canonicalDishes,
  contentPages,
  directoryOrganisations,
  events,
  faculties,
  faqs,
  forms,
  images,
  lostFoundItems,
  newsPosts,
  openDataDocuments,
  places,
  policies,
  serviceAlerts,
  shuttleRoutes,
  siteSettings,
} from "@/lib/db/schema";
import type { AdminKey } from "@/lib/i18n/admin";

/**
 * Every editable kind of content. The admin navigation, the dashboard and the
 * content hub read this list; `/admin/content/<segment>` is where each lives.
 * Set `available: true` when the type's pages exist, which also turns its
 * hub card into a link. To add a type, copy app/admin/content/news.
 */
export interface ContentTypeDef {
  /** Stable key, also the registry lookup. */
  key: string;
  /** Path segment under /admin/content. */
  segment: string;
  /** Plural name, e.g. "News posts". */
  labelKey: AdminKey;
  /** Singular name, e.g. "news post", used in "Add news post". */
  oneKey: AdminKey;
  /** One line for the hub. */
  descriptionKey: AdminKey;
  /** Passed to `saveContent`/`revalidateFor`. */
  entityType: ContentEntityType;
  table: AnyPgTable;
  /** A singleton has one row and no list page: its page edits that row directly. */
  kind: "collection" | "singleton";
  /** Several types can share a table (welfare and guide pages); this picks the rows of this one. */
  where?: SQL;
  /** Columns the list and counts read. */
  columns: {
    id: AnyPgColumn;
    /** Thai and English title columns. Null for singletons. */
    title: [AnyPgColumn, AnyPgColumn] | null;
    status: AnyPgColumn | null;
    updatedAt: AnyPgColumn;
  };
  /** Public route of the detail page; the page is `<viewPath>/<slug>` in the staff member's language. */
  viewPath?: string;
  /** Whether the admin pages for this type have been built. */
  available: boolean;
}

const std = (t: { id: AnyPgColumn; status: AnyPgColumn; updatedAt: AnyPgColumn }, title: [AnyPgColumn, AnyPgColumn]) => ({
  id: t.id,
  title,
  status: t.status,
  updatedAt: t.updatedAt,
});

export const CONTENT_TYPES: readonly ContentTypeDef[] = [
  {
    key: "serviceAlerts",
    segment: "alerts",
    labelKey: "typeAlerts",
    oneKey: "typeAlertsOne",
    descriptionKey: "typeAlertsDesc",
    entityType: "serviceAlert",
    table: serviceAlerts,
    kind: "collection",
    columns: std(serviceAlerts, [serviceAlerts.titleTh, serviceAlerts.titleEn]),
    available: true,
  },
  {
    key: "openDataDocuments",
    segment: "open-data",
    labelKey: "typeOpenData",
    oneKey: "typeOpenDataOne",
    descriptionKey: "typeOpenDataDesc",
    entityType: "openDataDocument",
    table: openDataDocuments,
    kind: "collection",
    columns: std(openDataDocuments, [openDataDocuments.titleTh, openDataDocuments.titleEn]),
    available: true,
  },
  {
    key: "news",
    segment: "news",
    labelKey: "typeNews",
    oneKey: "typeNewsOne",
    descriptionKey: "typeNewsDesc",
    entityType: "newsPost",
    table: newsPosts,
    kind: "collection",
    columns: std(newsPosts, [newsPosts.titleTh, newsPosts.titleEn]),
    viewPath: "/news",
    available: true,
  },
  {
    key: "events",
    segment: "events",
    labelKey: "typeEvents",
    oneKey: "typeEventsOne",
    descriptionKey: "typeEventsDesc",
    entityType: "event",
    table: events,
    kind: "collection",
    columns: std(events, [events.titleTh, events.titleEn]),
    viewPath: "/events",
    available: true,
  },
  {
    key: "policies",
    segment: "policies",
    labelKey: "typePolicies",
    oneKey: "typePoliciesOne",
    descriptionKey: "typePoliciesDesc",
    entityType: "policy",
    table: policies,
    kind: "collection",
    columns: std(policies, [policies.titleTh, policies.titleEn]),
    viewPath: "/policy",
    available: true,
  },
  {
    key: "guidePages",
    segment: "guides",
    labelKey: "typeGuides",
    oneKey: "typeGuidesOne",
    descriptionKey: "typeGuidesDesc",
    entityType: "guidePage",
    table: contentPages,
    where: eq(contentPages.kind, "guide"),
    kind: "collection",
    columns: std(contentPages, [contentPages.titleTh, contentPages.titleEn]),
    viewPath: "/guide",
    available: true,
  },
  {
    key: "welfarePages",
    segment: "welfare",
    labelKey: "typeWelfare",
    oneKey: "typeWelfareOne",
    descriptionKey: "typeWelfareDesc",
    entityType: "welfarePage",
    table: contentPages,
    where: eq(contentPages.kind, "welfare"),
    kind: "collection",
    columns: std(contentPages, [contentPages.titleTh, contentPages.titleEn]),
    viewPath: "/welfare",
    available: true,
  },
  {
    key: "faqs",
    segment: "faqs",
    labelKey: "typeFaqs",
    oneKey: "typeFaqsOne",
    descriptionKey: "typeFaqsDesc",
    entityType: "faq",
    table: faqs,
    kind: "collection",
    columns: std(faqs, [faqs.questionTh, faqs.questionEn]),
    available: true,
  },
  {
    key: "forms",
    segment: "forms",
    labelKey: "typeForms",
    oneKey: "typeFormsOne",
    descriptionKey: "typeFormsDesc",
    entityType: "form",
    table: forms,
    kind: "collection",
    columns: std(forms, [forms.titleTh, forms.titleEn]),
    viewPath: "/forms",
    available: true,
  },
  {
    key: "organisations",
    segment: "organisations",
    labelKey: "typeOrganisations",
    oneKey: "typeOrganisationsOne",
    descriptionKey: "typeOrganisationsDesc",
    entityType: "organisation",
    table: directoryOrganisations,
    kind: "collection",
    columns: std(directoryOrganisations, [directoryOrganisations.nameTh, directoryOrganisations.nameEn]),
    available: true,
  },
  {
    key: "faculties",
    segment: "faculties",
    labelKey: "typeFaculties",
    oneKey: "typeFacultiesOne",
    descriptionKey: "typeFacultiesDesc",
    entityType: "faculty",
    table: faculties,
    kind: "collection",
    columns: std(faculties, [faculties.nameTh, faculties.nameEn]),
    available: true,
  },
  {
    key: "places",
    segment: "places",
    labelKey: "typePlaces",
    oneKey: "typePlacesOne",
    descriptionKey: "typePlacesDesc",
    entityType: "place",
    table: places,
    kind: "collection",
    columns: std(places, [places.nameTh, places.nameEn]),
    available: true,
  },
  {
    key: "shuttleRoutes",
    segment: "shuttle",
    labelKey: "typeShuttle",
    oneKey: "typeShuttleOne",
    descriptionKey: "typeShuttleDesc",
    entityType: "shuttleRoute",
    table: shuttleRoutes,
    kind: "collection",
    columns: std(shuttleRoutes, [shuttleRoutes.nameTh, shuttleRoutes.nameEn]),
    available: true,
  },
  {
    key: "siteSettings",
    segment: "site-settings",
    labelKey: "typeSiteSettings",
    oneKey: "typeSiteSettingsOne",
    descriptionKey: "typeSiteSettingsDesc",
    entityType: "siteSettings",
    table: siteSettings,
    kind: "singleton",
    columns: { id: siteSettings.id, title: null, status: siteSettings.status, updatedAt: siteSettings.updatedAt },
    available: true,
  },
  {
    key: "lostFound",
    segment: "lost-and-found",
    labelKey: "typeLostFound",
    oneKey: "typeLostFoundOne",
    descriptionKey: "typeLostFoundDesc",
    entityType: "lostFoundItem",
    table: lostFoundItems,
    kind: "collection",
    columns: std(lostFoundItems, [lostFoundItems.titleTh, lostFoundItems.titleEn]),
    viewPath: "/lost-and-found",
    available: true,
  },
  {
    key: "canteenSettings",
    segment: "canteen-settings",
    labelKey: "typeCanteenSettings",
    oneKey: "typeCanteenSettingsOne",
    descriptionKey: "typeCanteenSettingsDesc",
    entityType: "canteenSettings",
    table: canteenSettings,
    kind: "singleton",
    columns: { id: canteenSettings.id, title: null, status: canteenSettings.status, updatedAt: canteenSettings.updatedAt },
    available: true,
  },
  {
    key: "canteenStalls",
    segment: "canteen-stalls",
    labelKey: "typeCanteenStalls",
    oneKey: "typeCanteenStallsOne",
    descriptionKey: "typeCanteenStallsDesc",
    entityType: "canteenStall",
    table: canteenStalls,
    kind: "collection",
    columns: std(canteenStalls, [canteenStalls.nameTh, canteenStalls.nameEn]),
    available: true,
  },
  {
    key: "canteenDishes",
    segment: "canteen-dishes",
    labelKey: "typeCanteenDishes",
    oneKey: "typeCanteenDishesOne",
    descriptionKey: "typeCanteenDishesDesc",
    entityType: "canteenDish",
    table: canteenDishes,
    kind: "collection",
    columns: std(canteenDishes, [canteenDishes.nameTh, canteenDishes.nameEn]),
    available: true,
  },
  {
    key: "canonicalDishes",
    segment: "canonical-dishes",
    labelKey: "typeCanonicalDishes",
    oneKey: "typeCanonicalDishesOne",
    descriptionKey: "typeCanonicalDishesDesc",
    entityType: "canonicalDish",
    table: canonicalDishes,
    kind: "collection",
    columns: std(canonicalDishes, [canonicalDishes.nameTh, canonicalDishes.nameEn]),
    available: true,
  },
  {
    key: "images",
    segment: "images",
    labelKey: "typeImages",
    oneKey: "typeImagesOne",
    descriptionKey: "typeImagesDesc",
    entityType: "image",
    table: images,
    kind: "collection",
    columns: { id: images.id, title: [images.altTh, images.altEn], status: null, updatedAt: images.createdAt },
    available: true,
  },
];

export function getContentType(segment: string): ContentTypeDef | undefined {
  return CONTENT_TYPES.find((t) => t.segment === segment);
}

/** The admin path of a type's list page, or of one row when `id` is given. */
export function contentPath(def: Pick<ContentTypeDef, "segment">, id?: string): string {
  return `/admin/content/${def.segment}${id ? `/${id}` : ""}`;
}
