import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sanity/queries", () => ({ getSiteSettings: async () => null }));

import { withRequiredNav } from "@/components/layout/site-settings";
import type { SiteSettings } from "@/lib/sanity/types";

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
