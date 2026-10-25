import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/content", () => ({ getSiteSettings: async () => null }));

import { splitPrimaryNav } from "@/components/layout/nav-groups";
import { withRequiredNav } from "@/components/layout/site-settings";
import type { SiteSettings } from "@/lib/content/types";

function settings(paths: string[]): SiteSettings {
  return {
    primaryNav: paths.map((path) => ({ label: { th: path, en: path }, path })),
  } as unknown as SiteSettings;
}

describe("withRequiredNav", () => {
  it("adds What to eat after Getting around when the CMS nav predates it", () => {
    const result = withRequiredNav(settings(["/forms", "/getting-around", "/welfare"]));
    expect(result.primaryNav.map((item) => item.path)).toEqual(["/forms", "/getting-around", "/eat", "/welfare"]);
    expect(result.primaryNav[2]?.label.en).toBe("What to eat");
  });

  it("appends it when Getting around is missing", () => {
    const result = withRequiredNav(settings(["/forms", "/news"]));
    expect(result.primaryNav.map((item) => item.path)).toEqual(["/forms", "/news", "/eat"]);
  });

  it("leaves an editor's own entry alone", () => {
    const input = settings(["/eat", "/forms"]);
    expect(withRequiredNav(input)).toBe(input);
  });
});

describe("withRequiredNav footer", () => {
  const withFooter = (paths: string[]) =>
    ({ primaryNav: [{ label: { th: "/eat", en: "/eat" }, path: "/eat" }], footerNav: paths.map((path) => ({ label: { th: path, en: path }, path })) }) as unknown as SiteSettings;

  it("adds Performance after Cookies when the CMS footer predates it", () => {
    const result = withRequiredNav(withFooter(["/faq", "/cookies", "/about"]));
    expect(result.footerNav.map((item) => item.path)).toEqual(["/faq", "/cookies", "/performance", "/about"]);
    expect(result.footerNav[2]?.label.en).toBe("Performance");
  });

  it("leaves a footer that already links to it alone", () => {
    const input = withFooter(["/performance", "/faq"]);
    expect(withRequiredNav(input)).toBe(input);
  });
});

describe("splitPrimaryNav", () => {
  const items = settings(["/forms", "/welfare", "/news", "/eat", "/directory"]).primaryNav;

  it("pins What to eat then Student welfare regardless of CMS order", () => {
    expect(splitPrimaryNav(items).pinned.map((item) => item.path)).toEqual(["/eat", "/welfare"]);
  });

  it("keeps every other item in CMS order under More", () => {
    expect(splitPrimaryNav(items).more.map((item) => item.path)).toEqual(["/forms", "/news", "/directory"]);
  });

  it("skips a pinned path that the CMS does not list", () => {
    const result = splitPrimaryNav(settings(["/forms", "/eat"]).primaryNav);
    expect(result.pinned.map((item) => item.path)).toEqual(["/eat"]);
    expect(result.more.map((item) => item.path)).toEqual(["/forms"]);
  });
});
