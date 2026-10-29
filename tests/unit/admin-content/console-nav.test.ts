import { describe, expect, it } from "vitest";
import { buildConsoleNav, findActiveNav } from "@/lib/admin/nav";
import { CONTENT_TYPES } from "@/lib/admin/content/types";
import type { ActiveRole } from "@/lib/auth/roles";
import { A } from "@/lib/i18n/admin";

const role = (r: ActiveRole["role"]): ActiveRole[] => [{ role: r, organisationId: 1 }];
const ids = (roles: ActiveRole[]) => buildConsoleNav(roles).groups.flatMap((g) => g.items.map((i) => i.id));

describe("console navigation", () => {
  it("lists every available content type for an editor", () => {
    const listed = ids(role("editor"));
    for (const def of CONTENT_TYPES.filter((d) => d.available)) expect(listed).toContain(`content-${def.key}`);
  });

  it("gives an editor no case, performance or admin items", () => {
    const listed = ids(role("editor"));
    expect(listed).not.toContain("cases");
    expect(listed).not.toContain("performance");
    expect(listed).not.toContain("staff");
    expect(listed).toContain("security");
  });

  it("shows a desk officer only work and security, with no empty groups", () => {
    const nav = buildConsoleNav(role("lf_officer"));
    expect(nav.groups.map((g) => g.id)).toEqual(["work", "settings"]);
    expect(nav.quickCreate).toEqual([]);
  });

  it("shows administrators the admin items", () => {
    const listed = ids(role("admin"));
    expect(listed).toEqual(expect.arrayContaining(["cases", "performance", "complaint-categories", "staff"]));
  });

  it("only offers quick create for collections, and every label key exists", () => {
    const nav = buildConsoleNav(role("admin"));
    expect(nav.quickCreate.some((q) => q.id === "create-siteSettings")).toBe(false);
    for (const g of nav.groups) {
      expect(A[g.labelKey]).toBeDefined();
      for (const i of g.items) expect(A[i.labelKey]).toBeDefined();
    }
    for (const q of nav.quickCreate) expect(A[q.itemKey]).toBeDefined();
  });

  it("finds the active item by longest prefix and respects path boundaries", () => {
    const nav = buildConsoleNav(role("admin"));
    expect(findActiveNav(nav, "/admin")?.item.id).toBe("dashboard");
    expect(findActiveNav(nav, "/admin/content/news/abc")?.item.id).toBe("content-news");
    expect(findActiveNav(nav, "/admin/content/news/new")?.group.id).toBe("announcements");
    expect(findActiveNav(nav, "/admin/cases/new/lost")?.item.id).toBe("cases");
    expect(findActiveNav(nav, "/admin/cases-old")).toBeNull();
    expect(findActiveNav(nav, "/admin/sign-in")).toBeNull();
  });
});
