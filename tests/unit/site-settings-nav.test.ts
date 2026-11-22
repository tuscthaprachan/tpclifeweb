import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/content", () => ({ getSiteSettings: async () => null }));

import { splitPrimaryNav } from "@/components/layout/nav-groups";
import { normaliseSiteSettings } from "@/components/layout/site-settings";
import type { SiteSettings } from "@/lib/content/types";

const item = (path: string) => ({ label: { th: path, en: path }, path });
const task = (path: string) => ({ label: { th: path, en: path }, description: { th: "d", en: "d" }, path });

function settings(paths: string[], extra: Partial<SiteSettings> = {}): SiteSettings {
  return { primaryNav: paths.map(item), footerNav: [item("/faq")], homeTasks: [task("/forms")], ...extra } as unknown as SiteSettings;
}

describe("normaliseSiteSettings", () => {
  it("keeps the console's primary nav exactly as stored", () => {
    const result = normaliseSiteSettings(settings(["/news", "/forms"]));
    expect(result.primaryNav.map((i) => i.path)).toEqual(["/news", "/forms"]);
  });

  it("keeps the console's footer exactly as stored", () => {
    const input = settings([], { footerNav: [item("/faq"), item("/about")] });
    expect(normaliseSiteSettings(input).footerNav).toBe(input.footerNav);
  });

  it("keeps the console's tiles in their order and wording", () => {
    const own = [task("/news"), task("/forms"), task("/lost-and-found")];
    expect(normaliseSiteSettings(settings([], { homeTasks: own })).homeTasks).toEqual(own);
  });

  it("shows no tiles when the console has none", () => {
    expect(normaliseSiteSettings(settings([], { homeTasks: [] })).homeTasks).toEqual([]);
    expect(normaliseSiteSettings(settings([], { homeTasks: undefined as never })).homeTasks).toEqual([]);
  });

  it("caps the tiles at eight", () => {
    const many = Array.from({ length: 10 }, (_, i) => task(`/t${i}`));
    expect(normaliseSiteSettings(settings([], { homeTasks: many })).homeTasks).toHaveLength(8);
  });
});

describe("splitPrimaryNav", () => {
  const items = settings(["/start", "/campus", "/study", "/health", "/money", "/forms"]).primaryNav;

  it("pins the first four items in console order", () => {
    expect(splitPrimaryNav(items).pinned.map((i) => i.path)).toEqual(["/start", "/campus", "/study", "/health"]);
  });

  it("puts the rest under More in console order", () => {
    expect(splitPrimaryNav(items).more.map((i) => i.path)).toEqual(["/money", "/forms"]);
  });

  it("pins everything when there are four or fewer", () => {
    const result = splitPrimaryNav(settings(["/news", "/eat"]).primaryNav);
    expect(result.pinned.map((i) => i.path)).toEqual(["/news", "/eat"]);
    expect(result.more).toEqual([]);
  });
});
