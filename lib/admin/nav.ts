/**
 * Single source of truth for the console's navigation. The sidebar, the
 * command palette, the breadcrumbs, the keyboard shortcuts and the Home page's
 * Create menu all read what `buildConsoleNav` returns, so a page is added to
 * the console here and nowhere else. Role gates mirror the pages' own
 * `requireStaff` checks; they only decide what is shown, never what is allowed.
 *
 * The sidebar lists a few job-named entries (Home, Desk, Post, Website,
 * Performance, Team). Website and Team hold many pages that are not listed in
 * the sidebar but stay in the model as hidden children, so breadcrumbs and the
 * palette still find them.
 */

import type { ConsoleIconName } from "@/components/admin/icons";
import { canEditContent } from "@/lib/admin/content/access";
import { CONTENT_TYPES, contentPath, type ContentTypeDef } from "@/lib/admin/content/types";
import { findActive, type ResolvedNav } from "@/lib/admin/nav-match";
import { canAccessService, canUseCaseInbox } from "@/lib/cases/access";
import { hasRole, type ActiveRole } from "@/lib/auth/roles";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { canSeePerformance } from "@/lib/performance/access";

export { findActive, flattenNav, pathMatches } from "@/lib/admin/nav-match";
export type { ResolvedNav, ResolvedNavItem, ResolvedQuickCreate } from "@/lib/admin/nav-match";

export interface ConsoleNavItem {
  id: string;
  href: string;
  labelKey: AdminKey;
  icon: ConsoleIconName;
  match: string[];
  exact?: boolean;
  hidden?: boolean;
  children?: ConsoleNavItem[];
}

/** An "Add ..." shortcut for a content collection. The label is `a("listAdd", locale, { item: a(itemKey, locale) })`. */
export interface ConsoleQuickCreate {
  id: string;
  href: string;
  labelKey: "listAdd";
  itemKey: AdminKey;
  icon: ConsoleIconName;
  groupKey: AdminKey;
}

export interface ConsoleNav {
  items: ConsoleNavItem[];
  quickCreate: ConsoleQuickCreate[];
}

/** The sections of the Website hub page. Post types and lost and found sit in none. */
export type ContentSectionId = "information" | "directory" | "canteen" | "media" | "settings";

const SECTIONS: Record<ContentSectionId, { labelKey: AdminKey; icon: ConsoleIconName }> = {
  information: { labelKey: "csGroupInformation", icon: "groupInformation" },
  directory: { labelKey: "csGroupDirectory", icon: "groupDirectory" },
  canteen: { labelKey: "csGroupCanteen", icon: "groupCanteen" },
  media: { labelKey: "csGroupMedia", icon: "groupMedia" },
  settings: { labelKey: "csGroupSettings", icon: "groupSettings" },
};

/** Which section and icon each content type gets, in display order within the section. */
const CONTENT_PLACEMENT: Record<string, { section: ContentSectionId | null; icon: ConsoleIconName }> = {
  serviceAlerts: { section: null, icon: "alerts" },
  news: { section: null, icon: "news" },
  events: { section: null, icon: "events" },
  guidePages: { section: "information", icon: "guides" },
  welfarePages: { section: "information", icon: "welfare" },
  policies: { section: "information", icon: "policies" },
  faqs: { section: "information", icon: "faqs" },
  openDataDocuments: { section: "information", icon: "policies" },
  forms: { section: "information", icon: "forms" },
  servicePages: { section: "information", icon: "servicePages" },
  organisations: { section: "directory", icon: "organisations" },
  faculties: { section: "directory", icon: "faculties" },
  places: { section: "directory", icon: "places" },
  shuttleRoutes: { section: "directory", icon: "shuttle" },
  canteenStalls: { section: "canteen", icon: "stalls" },
  canteenDishes: { section: "canteen", icon: "dishes" },
  canonicalDishes: { section: "canteen", icon: "canonicalDishes" },
  canteenSettings: { section: "canteen", icon: "canteenSettings" },
  lostFound: { section: null, icon: "lostFound" },
  images: { section: "media", icon: "images" },
  todaySettings: { section: "settings", icon: "todaySettings" },
  siteText: { section: "settings", icon: "siteText" },
  siteSettings: { section: "settings", icon: "siteSettings" },
};

/** The content types under Post, in the order the sidebar and the Create menu list them. */
export const POST_TYPE_KEYS: readonly string[] = ["serviceAlerts", "news", "events"];

/** Content types that appear nowhere in the nav, hub, palette or Create menu. */
const HIDDEN_TYPE_KEYS: readonly string[] = ["lostFound"];

const CONTENT_ORDER = Object.keys(CONTENT_PLACEMENT);

/** True for a content type the console lists (available, and not one that is managed elsewhere). */
export function isListedContentType(def: Pick<ContentTypeDef, "key" | "available">): boolean {
  return def.available && !HIDDEN_TYPE_KEYS.includes(def.key) && def.key in CONTENT_PLACEMENT;
}

export interface ContentPlacement {
  /** The Website hub section, or null for Post types and lost and found. */
  section: ContentSectionId | null;
  sectionLabelKey: AdminKey | null;
  sectionIcon: ConsoleIconName | null;
  icon: ConsoleIconName;
  /** The console entry that holds the type: Post or Website. */
  rootLabelKey: AdminKey;
  rootHref: string;
}

const FALLBACK_PLACEMENT = { section: "information", icon: "info" } as const;

/** The hub section, icon and holding entry (Post or Website) of a content type. */
export function placementOf(key: string): ContentPlacement {
  const place = CONTENT_PLACEMENT[key] ?? FALLBACK_PLACEMENT;
  const section = place.section ? SECTIONS[place.section] : null;
  const post = POST_TYPE_KEYS.includes(key);
  return {
    section: place.section,
    sectionLabelKey: section?.labelKey ?? null,
    sectionIcon: section?.icon ?? null,
    icon: place.icon,
    rootLabelKey: post ? "shNavPost" : "shNavWebsite",
    rootHref: post ? contentPath(CONTENT_TYPES.find((d) => d.key === POST_TYPE_KEYS[0])!) : "/admin/content",
  };
}

function contentItem(def: ContentTypeDef, hidden: boolean): ConsoleNavItem {
  const href = contentPath(def);
  return { id: `content-${def.key}`, href, labelKey: def.labelKey, icon: placementOf(def.key).icon, match: [href], hidden };
}

function listedTypes(): ContentTypeDef[] {
  return CONTENT_TYPES.filter(isListedContentType).sort((x, y) => CONTENT_ORDER.indexOf(x.key) - CONTENT_ORDER.indexOf(y.key));
}

/** The navigation this staff member sees. Entries they have no role for are left out. */
export function buildConsoleNav(roles: readonly ActiveRole[]): ConsoleNav {
  const editor = canEditContent(roles);
  const borrowing = canAccessService(roles, "borrowing");
  const items: ConsoleNavItem[] = [{ id: "home", href: "/admin", labelKey: "homeLink", icon: "dashboard", match: ["/admin"], exact: true }];

  if (canUseCaseInbox(roles)) {
    const children: ConsoleNavItem[] = [{ id: "inbox", href: "/admin/cases", labelKey: "shNavInbox", icon: "cases", match: ["/admin/cases"], hidden: !borrowing }];
    if (borrowing) children.push({ id: "loans", href: "/admin/borrowing", labelKey: "shNavLoans", icon: "borrowSchedule", match: ["/admin/borrowing"] });
    items.push({ id: "desk", href: "/admin/cases", labelKey: "shNavDesk", icon: "groupWork", match: ["/admin/cases", "/admin/borrowing"], children });
  }

  const quickCreate: ConsoleQuickCreate[] = [];
  if (editor) {
    const types = listedTypes();
    const post = POST_TYPE_KEYS.map((key) => types.find((d) => d.key === key)).filter((d): d is ContentTypeDef => d !== undefined);
    const website = types.filter((d) => !POST_TYPE_KEYS.includes(d.key));
    if (post.length > 0) {
      const children = post.map((d) => contentItem(d, false));
      items.push({ id: "post", href: children[0]!.href, labelKey: "shNavPost", icon: "groupAnnouncements", match: children.map((c) => c.href), children });
    }
    items.push({
      id: "website",
      href: "/admin/content",
      labelKey: "shNavWebsite",
      icon: "guides",
      match: ["/admin/content", "/admin/settings/redirects"],
      children: [
        ...website.map((d) => contentItem(d, true)),
        { id: "redirects", href: "/admin/settings/redirects", labelKey: "rdLink", icon: "redirects", match: ["/admin/settings/redirects"], hidden: true },
      ],
    });
    for (const def of [...post, ...website]) {
      if (def.kind !== "collection") continue;
      quickCreate.push({
        id: `create-${def.key}`,
        href: `${contentPath(def)}/new`,
        labelKey: "listAdd",
        itemKey: def.oneKey,
        icon: "add",
        groupKey: POST_TYPE_KEYS.includes(def.key) ? "shNavPost" : "shNavWebsite",
      });
    }
  }

  if (canSeePerformance(roles)) items.push({ id: "performance", href: "/admin/performance", labelKey: "pfLink", icon: "performance", match: ["/admin/performance"] });

  if (hasRole(roles, "admin")) {
    items.push({
      id: "team",
      href: "/admin/team",
      labelKey: "shNavTeam",
      icon: "staff",
      match: ["/admin/team", "/admin/staff", "/admin/complaints/categories", "/admin/audit", "/admin/health"],
      children: [
        { id: "staff", href: "/admin/staff", labelKey: "csNavStaff", icon: "staff", match: ["/admin/staff"], hidden: true },
        { id: "complaint-categories", href: "/admin/complaints/categories", labelKey: "cpcatLink", icon: "complaintCategories", match: ["/admin/complaints/categories"], hidden: true },
        { id: "audit", href: "/admin/audit", labelKey: "opNavAudit", icon: "audit", match: ["/admin/audit"], hidden: true },
        { id: "health", href: "/admin/health", labelKey: "opNavHealth", icon: "health", match: ["/admin/health"], hidden: true },
      ],
    });
  }

  items.push(
    { id: "notifications", href: "/admin/notifications", labelKey: "ntTitle", icon: "notifications", match: ["/admin/notifications"], hidden: true },
    { id: "security", href: "/admin/security", labelKey: "csNavSecurity", icon: "security", match: ["/admin/security"], hidden: true },
  );

  return { items, quickCreate };
}

function resolveItem(item: ConsoleNavItem, locale: Locale): ResolvedNav["items"][number] {
  return {
    id: item.id,
    href: item.href,
    label: a(item.labelKey, locale),
    icon: item.icon,
    match: item.match,
    exact: item.exact,
    hidden: item.hidden,
    children: (item.children ?? []).map((child) => resolveItem(child, locale)),
  };
}

/** Labels in the staff member's language, as plain data for client components. */
export function resolveNav(nav: ConsoleNav, locale: Locale): ResolvedNav {
  return {
    items: nav.items.map((item) => resolveItem(item, locale)),
    quickCreate: nav.quickCreate.map((q) => ({
      id: q.id,
      href: q.href,
      label: a(q.labelKey, locale, { item: a(q.itemKey, locale) }),
      icon: q.icon,
      groupLabel: a(q.groupKey, locale),
    })),
  };
}

/** The nav item (and its parent) for a pathname, for breadcrumbs and titles. */
export function findActiveNav(nav: ConsoleNav, pathname: string) {
  return findActive(nav.items, pathname);
}
