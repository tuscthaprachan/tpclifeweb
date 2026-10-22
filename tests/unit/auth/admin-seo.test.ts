/** The staff console must stay out of search: robots.txt, headers, and the locale proxy. */

import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import nextConfig from "@/next.config";
import { config as proxyConfig } from "@/proxy";

describe("staff console is not indexed", () => {
  it("is disallowed in robots.txt", () => {
    const rules = [robots().rules].flat();
    expect(rules.some((r) => [r.disallow].flat().includes("/admin"))).toBe(true);
  });

  it("sends noindex and no-store headers on every /admin response", async () => {
    const rules = await nextConfig.headers!();
    const admin = rules.find((r) => r.source === "/admin/:path*");
    const byKey = Object.fromEntries((admin?.headers ?? []).map((h) => [h.key, h.value]));
    expect(byKey["X-Robots-Tag"]).toContain("noindex");
    expect(byKey["Cache-Control"]).toContain("no-store");
  });

  it("is not redirected into a locale by the proxy", () => {
    const matcher = proxyConfig.matcher[0] as string;
    // The matcher is a negative lookahead; /admin must be in the excluded list.
    const regex = new RegExp(`^${matcher.replace(/^\//, "\\/")}$`);
    expect(regex.test("/admin")).toBe(false);
    expect(regex.test("/admin/staff")).toBe(false);
    expect(regex.test("/eat")).toBe(true);
  });
});
