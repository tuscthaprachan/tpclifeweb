import { describe, expect, it } from "vitest";
import { buildConsoleNav, resolveNav } from "@/lib/admin/nav";
import { deriveShortcuts } from "@/lib/admin/shortcuts";
import type { ActiveRole } from "@/lib/auth/roles";

const keys = (roles: ActiveRole["role"][]) => deriveShortcuts(resolveNav(buildConsoleNav(roles.map((role) => ({ role }))), "en"), { content: "All content" });

describe("g-prefix shortcut map", () => {
  it("gives an administrator every shortcut", () => {
    expect(keys(["admin"]).map((s) => s.key)).toEqual(["h", "c", "n", "s", "a", "b", "p"]);
  });

  it("gives an editor home and content only", () => {
    expect(keys(["editor"])).toEqual([
      { key: "h", href: "/admin", label: "Dashboard", icon: "dashboard" },
      expect.objectContaining({ key: "n", href: "/admin/content", label: "All content" }),
    ]);
  });

  it("gives an officer cases, borrowing and performance but no staff, audit or content", () => {
    expect(keys(["officer"]).map((s) => s.key)).toEqual(["h", "c", "b", "p"]);
  });

  it("points each shortcut at a page in the person's own navigation", () => {
    const nav = resolveNav(buildConsoleNav([{ role: "admin" }]), "en");
    const hrefs = new Set(nav.groups.flatMap((g) => g.items.map((i) => i.href)).concat("/admin/content"));
    for (const s of deriveShortcuts(nav, { content: "All content" })) expect(hrefs.has(s.href)).toBe(true);
  });

  it("uses each letter once", () => {
    const all = keys(["admin"]).map((s) => s.key);
    expect(new Set(all).size).toBe(all.length);
  });
});
