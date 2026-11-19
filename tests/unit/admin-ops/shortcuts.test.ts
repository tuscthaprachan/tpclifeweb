import { describe, expect, it } from "vitest";
import { buildConsoleNav, flattenNav, resolveNav } from "@/lib/admin/nav";
import { deriveShortcuts } from "@/lib/admin/shortcuts";
import type { ActiveRole } from "@/lib/auth/roles";

const shortcuts = (roles: ActiveRole["role"][]) => deriveShortcuts(resolveNav(buildConsoleNav(roles.map((role) => ({ role }))), "en"));
const keys = (roles: ActiveRole["role"][]) => shortcuts(roles).map((s) => s.key);

describe("g-prefix shortcut map", () => {
  it("gives an administrator every shortcut", () => {
    expect(keys(["admin"])).toEqual(["h", "c", "l", "n", "p", "t", "a", "s"]);
  });

  it("gives an editor home and the website only", () => {
    expect(shortcuts(["editor"])).toEqual([
      { key: "h", href: "/admin", label: "Home", icon: "dashboard" },
      expect.objectContaining({ key: "n", href: "/admin/content", label: "Website" }),
    ]);
  });

  it("gives an officer inbox, loans and performance but no team, audit or website", () => {
    expect(keys(["officer"])).toEqual(["h", "c", "l", "p"]);
  });

  it("points each shortcut at a page in the person's own navigation", () => {
    const nav = resolveNav(buildConsoleNav([{ role: "admin" }]), "en");
    const hrefs = new Set(flattenNav(nav.items).map((n) => n.item.href));
    for (const s of deriveShortcuts(nav)) expect(hrefs.has(s.href)).toBe(true);
    expect(shortcuts(["admin"]).find((s) => s.key === "a")?.href).toBe("/admin/audit");
    expect(shortcuts(["admin"]).find((s) => s.key === "s")?.href).toBe("/admin/staff");
  });

  it("uses each letter once", () => {
    const all = keys(["admin"]);
    expect(new Set(all).size).toBe(all.length);
  });
});
