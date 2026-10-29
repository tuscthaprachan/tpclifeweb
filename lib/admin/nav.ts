/**
 * Single source of truth for the console's navigation. The sidebar, the
 * command palette, the breadcrumbs and the dashboard's quick actions all read
 * what `buildConsoleNav` returns, so a page is added to the console here and
 * nowhere else. Role gates mirror the pages' own `requireStaff` checks; they
 * only decide what is shown, never what is allowed.
 */

import type { ConsoleIconName } from "@/components/admin/icons";
import { canEditContent } from "@/lib/admin/content/access";
import { CONTENT_TYPES, contentPath, type ContentTypeDef } from "@/lib/admin/content/types";
import { findActive, type ConsoleGroupId, type ResolvedNav } from "@/lib/admin/nav-match";
import { canUseCaseInbox } from "@/lib/cases/access";
import { hasRole, type ActiveRole } from "@/lib/auth/roles";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { canSeePerformance } from "@/lib/performance/access";

export { findActive, pathMatches } from "@/lib/admin/nav-match";
export type { ConsoleGroupId, ResolvedNav, ResolvedNavGroup, ResolvedNavItem, ResolvedQuickCreate } from "@/lib/admin/nav-match";

export interface ConsoleNavItem {
  id: string;
  href: string;
  labelKey: AdminKey;
  icon: ConsoleIconName;
  /** The item is active on this path and anything beneath it. */
  matchPrefix: string;
  /** Active on the exact path only (the dashboard, which is the prefix of everything). */
  exact?: boolean;
}

export interface ConsoleNavGroup {
  id: ConsoleGroupId;
  labelKey: AdminKey;
  icon: ConsoleIconName;
  items: ConsoleNavItem[];
}

/** An "Add ..." shortcut for a content collection. The label is `a("listAdd", locale, { item: a(itemKey, locale) })`. */
export interface ConsoleQuickCreate {
  id: string;
  href: string;
  labelKey: "listAdd";
  itemKey: AdminKey;
  icon: ConsoleIconName;
  groupId: ConsoleGroupId;
}

export interface ConsoleNav {
  groups: ConsoleNavGroup[];
  quickCreate: ConsoleQuickCreate[];
}

const GROUPS: readonly { id: ConsoleGroupId; labelKey: AdminKey; icon: ConsoleIconName }[] = [
  { id: "work", labelKey: "csGroupWork", icon: "groupWork" },
  { id: "announcements", labelKey: "csGroupAnnouncements", icon: "groupAnnouncements" },
  { id: "information", labelKey: "csGroupInformation", icon: "groupInformation" },
  { id: "directory", labelKey: "csGroupDirectory", icon: "groupDirectory" },
  { id: "canteen", labelKey: "csGroupCanteen", icon: "groupCanteen" },
  { id: "lostFound", labelKey: "csGroupLostFound", icon: "groupLostFound" },
  { id: "media", labelKey: "csGroupMedia", icon: "groupMedia" },
  { id: "settings", labelKey: "csGroupSettings", icon: "groupSettings" },
];

/** Which group and icon each content type gets, in display order within the group. */
const CONTENT_PLACEMENT: Record<string, { group: ConsoleGroupId; icon: ConsoleIconName }> = {
  serviceAlerts: { group: "announcements", icon: "alerts" },
  news: { group: "announcements", icon: "news" },
  events: { group: "announcements", icon: "events" },
  guidePages: { group: "information", icon: "guides" },
  welfarePages: { group: "information", icon: "welfare" },
  policies: { group: "information", icon: "policies" },
  faqs: { group: "information", icon: "faqs" },
  forms: { group: "information", icon: "forms" },
  organisations: { group: "directory", icon: "organisations" },
  faculties: { group: "directory", icon: "faculties" },
  places: { group: "directory", icon: "places" },
  shuttleRoutes: { group: "directory", icon: "shuttle" },
  canteenStalls: { group: "canteen", icon: "stalls" },
  canteenDishes: { group: "canteen", icon: "dishes" },
  canonicalDishes: { group: "canteen", icon: "canonicalDishes" },
  canteenSettings: { group: "canteen", icon: "canteenSettings" },
  lostFound: { group: "lostFound", icon: "lostFound" },
  images: { group: "media", icon: "images" },
  siteSettings: { group: "settings", icon: "siteSettings" },
};

/** Content types in the order the sidebar lists them inside a group. */
const CONTENT_ORDER = Object.keys(CONTENT_PLACEMENT);

function contentItem(def: ContentTypeDef, icon: ConsoleIconName): ConsoleNavItem {
  const href = contentPath(def);
  return { id: `content-${def.key}`, href, labelKey: def.labelKey, icon, matchPrefix: href };
}

/** The navigation this staff member sees. Empty groups are dropped; the dashboard and Security are always present. */
export function buildConsoleNav(roles: readonly ActiveRole[]): ConsoleNav {
  const isAdmin = hasRole(roles, "admin");
  const editor = canEditContent(roles);
  const items = new Map<ConsoleGroupId, ConsoleNavItem[]>(GROUPS.map((g) => [g.id, []]));
  const add = (group: ConsoleGroupId, item: ConsoleNavItem) => items.get(group)!.push(item);

  add("work", { id: "dashboard", href: "/admin", labelKey: "homeLink", icon: "dashboard", matchPrefix: "/admin", exact: true });
  if (canUseCaseInbox(roles)) add("work", { id: "cases", href: "/admin/cases", labelKey: "casesLink", icon: "cases", matchPrefix: "/admin/cases" });
  if (canSeePerformance(roles)) {
    add("work", { id: "performance", href: "/admin/performance", labelKey: "pfLink", icon: "performance", matchPrefix: "/admin/performance" });
  }

  const quickCreate: ConsoleQuickCreate[] = [];
  if (editor) {
    const available = CONTENT_TYPES.filter((def) => def.available && CONTENT_PLACEMENT[def.key]);
    available.sort((x, y) => CONTENT_ORDER.indexOf(x.key) - CONTENT_ORDER.indexOf(y.key));
    for (const def of available) {
      const place = CONTENT_PLACEMENT[def.key]!;
      add(place.group, contentItem(def, place.icon));
      if (def.kind === "collection") {
        quickCreate.push({
          id: `create-${def.key}`,
          href: `${contentPath(def)}/new`,
          labelKey: "listAdd",
          itemKey: def.oneKey,
          icon: "add",
          groupId: place.group,
        });
      }
    }
  }

  if (isAdmin) {
    add("settings", {
      id: "complaint-categories",
      href: "/admin/complaints/categories",
      labelKey: "cpcatLink",
      icon: "complaintCategories",
      matchPrefix: "/admin/complaints/categories",
    });
    add("settings", { id: "staff", href: "/admin/staff", labelKey: "csNavStaff", icon: "staff", matchPrefix: "/admin/staff" });
  }
  add("settings", { id: "security", href: "/admin/security", labelKey: "csNavSecurity", icon: "security", matchPrefix: "/admin/security" });

  const groups = GROUPS.map((g) => ({ ...g, items: items.get(g.id)! })).filter((g) => g.items.length > 0);
  return { groups, quickCreate };
}

/** Labels in the staff member's language, as plain data for client components. */
export function resolveNav(nav: ConsoleNav, locale: Locale): ResolvedNav {
  const groupLabel = new Map(nav.groups.map((g) => [g.id, a(g.labelKey, locale)]));
  return {
    groups: nav.groups.map((g) => ({
      id: g.id,
      label: a(g.labelKey, locale),
      icon: g.icon,
      items: g.items.map((i) => ({ id: i.id, href: i.href, label: a(i.labelKey, locale), icon: i.icon, matchPrefix: i.matchPrefix, exact: i.exact })),
    })),
    quickCreate: nav.quickCreate.map((q) => ({
      id: q.id,
      href: q.href,
      label: a(q.labelKey, locale, { item: a(q.itemKey, locale) }),
      icon: q.icon,
      groupId: q.groupId,
      groupLabel: groupLabel.get(q.groupId) ?? "",
    })),
  };
}

/** The nav item and group for a pathname (longest prefix), for breadcrumbs and titles. */
export function findActiveNav(nav: ConsoleNav, pathname: string) {
  return findActive(nav.groups, pathname);
}
