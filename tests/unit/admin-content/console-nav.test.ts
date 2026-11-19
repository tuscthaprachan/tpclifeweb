import { describe, expect, it } from "vitest";
import { buildConsoleNav, findActiveNav, flattenNav, resolveNav } from "@/lib/admin/nav";
import { findActive } from "@/lib/admin/nav-match";
import { CONTENT_TYPES } from "@/lib/admin/content/types";
import type { ActiveRole } from "@/lib/auth/roles";
import { A } from "@/lib/i18n/admin";

const role = (r: ActiveRole["role"]): ActiveRole[] => [{ role: r }];
const visible = (roles: ActiveRole[]) =>
  buildConsoleNav(roles)
    .items.filter((i) => !i.hidden)
    .map((i) => [i.id, ...(i.children ?? []).filter((c) => !c.hidden).map((c) => c.id)]);
const allIds = (roles: ActiveRole[]) => flattenNav(buildConsoleNav(roles).items).map((n) => n.item.id);

describe("console navigation", () => {
  it("shows an officer Home, Desk with Inbox and Loans, and Performance", () => {
    expect(visible(role("officer"))).toEqual([["home"], ["desk", "inbox", "loans"], ["performance"]]);
  });

  it("shows an editor Home, Post with its three types, and Website with nothing listed beneath it", () => {
    expect(visible(role("editor"))).toEqual([["home"], ["post", "content-serviceAlerts", "content-news", "content-events"], ["website"]]);
  });

  it("shows an administrator everything", () => {
    expect(visible(role("admin"))).toEqual([["home"], ["desk", "inbox", "loans"], ["post", "content-serviceAlerts", "content-news", "content-events"], ["website"], ["performance"], ["team"]]);
  });

  it("gives an editor no desk, performance or team entries", () => {
    const ids = allIds(role("editor"));
    for (const id of ["desk", "inbox", "loans", "performance", "team", "staff", "audit", "health"]) expect(ids).not.toContain(id);
  });

  it("keeps every other available content type and Redirects as hidden Website children", () => {
    const website = buildConsoleNav(role("editor")).items.find((i) => i.id === "website")!;
    expect(website.children!.every((c) => c.hidden)).toBe(true);
    const ids = website.children!.map((c) => c.id);
    for (const def of CONTENT_TYPES.filter((d) => d.available && !["serviceAlerts", "news", "events", "lostFound"].includes(d.key))) expect(ids).toContain(`content-${def.key}`);
    expect(ids).toContain("redirects");
  });

  it("lists Found item listings nowhere: not in the nav, the palette's create list or any role's search", () => {
    for (const r of ["admin", "editor", "officer"] as const) {
      expect(allIds(role(r))).not.toContain("content-lostFound");
      expect(buildConsoleNav(role(r)).quickCreate.map((q) => q.id)).not.toContain("create-lostFound");
    }
  });

  it("offers quick create for collections only, Service alert first, then News and Events", () => {
    const create = buildConsoleNav(role("editor")).quickCreate.map((q) => q.id);
    expect(create.slice(0, 3)).toEqual(["create-serviceAlerts", "create-news", "create-events"]);
    expect(create).not.toContain("create-siteSettings");
    expect(buildConsoleNav(role("officer")).quickCreate).toEqual([]);
  });

  it("only shows Loans to staff who can reach borrowing, and keeps Inbox out of the sidebar then", () => {
    const desk = buildConsoleNav(role("officer")).items.find((i) => i.id === "desk")!;
    expect(desk.children!.find((c) => c.id === "inbox")!.hidden).toBeFalsy();
    expect(desk.children!.map((c) => c.id)).toEqual(["inbox", "loans"]);
  });

  it("has a label for every item and create entry", () => {
    const nav = buildConsoleNav(role("admin"));
    for (const { item } of flattenNav(nav.items)) expect(A[item.labelKey]).toBeDefined();
    for (const q of nav.quickCreate) {
      expect(A[q.itemKey]).toBeDefined();
      expect(A[q.groupKey]).toBeDefined();
    }
  });

  it("resolves labels in the staff member's language", () => {
    const en = resolveNav(buildConsoleNav(role("admin")), "en");
    const th = resolveNav(buildConsoleNav(role("admin")), "th");
    expect(en.items.map((i) => i.label).slice(0, 2)).toEqual(["Home", "Desk"]);
    expect(th.items[0]!.label).toBe("หน้าหลัก");
    expect(en.quickCreate[0]!.groupLabel).toBe("Post");
  });
});

describe("finding the active item", () => {
  const nav = buildConsoleNav(role("admin"));
  const at = (path: string) => findActiveNav(nav, path);

  it("matches Home on the exact path only", () => {
    expect(at("/admin")?.current?.id).toBe("home");
    expect(at("/admin/sign-in")).toBeNull();
  });

  it("marks Inbox as current on case pages and Loans on every borrowing page", () => {
    expect(at("/admin/cases")?.current?.id).toBe("inbox");
    expect(at("/admin/cases/new/lost")?.current?.id).toBe("inbox");
    expect(at("/admin/borrowing/calendar")?.current?.id).toBe("loans");
    expect(at("/admin/borrowing/items")?.current?.id).toBe("loans");
    expect(at("/admin/cases-old")).toBeNull();
  });

  it("marks the Post child as current for alerts, news and events, including new and edit pages", () => {
    expect(at("/admin/content/news/abc")?.current?.id).toBe("content-news");
    expect(at("/admin/content/alerts/new")?.current?.id).toBe("content-serviceAlerts");
    expect(at("/admin/content/events")?.parent?.id).toBe("post");
  });

  it("resolves a hidden Website child for breadcrumbs while marking Website as current", () => {
    const hit = at("/admin/content/canteen-dishes/abc");
    expect(hit?.item.id).toBe("content-canteenDishes");
    expect(hit?.parent?.id).toBe("website");
    expect(hit?.current?.id).toBe("website");
    expect(at("/admin/content")?.current?.id).toBe("website");
    expect(at("/admin/content/export")?.current?.id).toBe("website");
    expect(at("/admin/content/lost-and-found")?.current?.id).toBe("website");
  });

  it("puts Redirects under Website", () => {
    const hit = at("/admin/settings/redirects/new");
    expect(hit?.item.id).toBe("redirects");
    expect(hit?.current?.id).toBe("website");
  });

  it("marks Team as current on its own page and the pages it holds", () => {
    for (const path of ["/admin/team", "/admin/staff", "/admin/staff/u1", "/admin/complaints/categories", "/admin/audit", "/admin/audit/export", "/admin/health"]) {
      expect(at(path)?.current?.id, path).toBe("team");
    }
    expect(at("/admin/staff/u1")?.item.id).toBe("staff");
  });

  it("finds Security and Notifications for the palette but marks nothing in the sidebar", () => {
    expect(at("/admin/security")?.item.id).toBe("security");
    expect(at("/admin/security")?.current).toBeNull();
    expect(at("/admin/notifications")?.current).toBeNull();
  });

  it("lets a child beat its parent on an equal prefix and the longest prefix win otherwise", () => {
    const tree = [
      { id: "a", match: ["/x"], children: [{ id: "a1", match: ["/x"] }, { id: "a2", match: ["/x/y"] }] },
      { id: "b", match: ["/x/y/z", "/q"] },
    ];
    expect(findActive(tree, "/x")?.item.id).toBe("a1");
    expect(findActive(tree, "/x/y/w")?.item.id).toBe("a2");
    expect(findActive(tree, "/x/y/z")?.item.id).toBe("b");
    expect(findActive(tree, "/q/")?.item.id).toBe("b");
  });
});
