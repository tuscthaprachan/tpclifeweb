import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { redirects } from "@/lib/db/schema";
import { buildRedirectMap, lookupRedirect } from "@/lib/redirects/map";
import { RedirectExistsError, RedirectInvalidError, addSlugRedirects, deleteRedirect, listRedirects, loadRedirectMap, recordRedirectHits, saveRedirect } from "@/lib/redirects/store";
import { validateRedirect } from "@/lib/redirects/validate";
import { createTestDb, makeUser } from "../db/harness";

const ok = (from: string, to: string, status = 301, existing: { fromPath: string; toPath: string }[] = []) => validateRedirect({ from, to, status }, existing);

describe("validateRedirect", () => {
  it("accepts a site path to a site path and an https target, and normalises a trailing slash", () => {
    expect(ok("/en/news/old/", "/en/news/new")).toEqual({ ok: true, value: { from: "/en/news/old", to: "/en/news/new", status: 301 } });
    expect(ok("/old", "https://example.org/page?x=1", 308)).toMatchObject({ ok: true });
  });

  it("refuses paths that do not start with a slash, protocol-relative paths and queries in the source", () => {
    expect(ok("old", "/new")).toMatchObject({ ok: false, errors: { from: "fromShape" } });
    expect(ok("//evil.example", "/new")).toMatchObject({ ok: false, errors: { from: "fromShape" } });
    expect(ok("/old?x=1", "/new")).toMatchObject({ ok: false, errors: { from: "fromShape" } });
    expect(ok("/old", "//evil.example")).toMatchObject({ ok: false, errors: { to: "toShape" } });
    expect(ok("", "/new")).toMatchObject({ ok: false, errors: { from: "fromRequired" } });
    expect(ok("/old", "")).toMatchObject({ ok: false, errors: { to: "toRequired" } });
  });

  it("refuses external targets that are not https, and the console and API as sources", () => {
    expect(ok("/old", "http://example.org")).toMatchObject({ ok: false, errors: { to: "toExternal" } });
    expect(ok("/old", "javascript:alert(1)")).toMatchObject({ ok: false, errors: { to: "toShape" } });
    expect(ok("/admin/x", "/new")).toMatchObject({ ok: false, errors: { from: "fromReserved" } });
    expect(ok("/api", "/new")).toMatchObject({ ok: false, errors: { from: "fromReserved" } });
  });

  it("refuses a self loop, a loop through other redirects and a bad status", () => {
    expect(ok("/a", "/a")).toMatchObject({ ok: false, errors: { to: "selfLoop" } });
    expect(ok("/a", "/a/")).toMatchObject({ ok: false, errors: { to: "selfLoop" } });
    expect(ok("/a", "/b", 301, [{ fromPath: "/b", toPath: "/c" }, { fromPath: "/c", toPath: "/a" }])).toMatchObject({ ok: false, errors: { to: "loop" } });
    expect(ok("/a", "/b", 302)).toMatchObject({ ok: false, errors: { status: "statusInvalid" } });
  });
});

describe("buildRedirectMap", () => {
  it("flattens chains so a reader is redirected once", () => {
    const map = buildRedirectMap([
      { fromPath: "/a", toPath: "/b", status: 301 },
      { fromPath: "/b", toPath: "/c", status: 308 },
    ]);
    expect(map["/a"]).toEqual({ to: "/c", status: 308 });
    expect(map["/b"]).toEqual({ to: "/c", status: 308 });
  });

  it("drops redirects caught in a loop", () => {
    const map = buildRedirectMap([
      { fromPath: "/a", toPath: "/b", status: 301 },
      { fromPath: "/b", toPath: "/a", status: 301 },
      { fromPath: "/x", toPath: "/y", status: 301 },
    ]);
    expect(map).toEqual({ "/x": { to: "/y", status: 301 } });
  });

  it("stops at an external target and finds a path with a trailing slash", () => {
    const map = buildRedirectMap([
      { fromPath: "/a", toPath: "/b", status: 301 },
      { fromPath: "/b", toPath: "https://example.org/z", status: 301 },
    ]);
    expect(map["/a"]!.to).toBe("https://example.org/z");
    expect(lookupRedirect(map, "/a/")).toBeDefined();
    expect(lookupRedirect(map, "/nope")).toBeUndefined();
  });
});

describe("redirect store", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>["db"];
  let actor: { userId: string; context: { actorUserId: string } };
  beforeAll(async () => {
    ({ db } = await createTestDb());
    const userId = await makeUser(db);
    actor = { userId, context: { actorUserId: userId } };
  });
  beforeEach(async () => {
    await db.delete(redirects);
  });

  it("creates, edits, lists, searches and deletes with audit entries", async () => {
    const row = await saveRedirect(db, actor, { from: "/th/news/a", to: "/th/news/b", status: 301 });
    expect(row).toMatchObject({ fromPath: "/th/news/a", createdBy: actor.userId, hits: 0 });
    const edited = await saveRedirect(db, actor, { id: row.id, from: "/th/news/a", to: "/th/news/c", status: 308 });
    expect(edited).toMatchObject({ toPath: "/th/news/c", status: 308 });
    expect((await listRedirects(db, { search: "news/c" })).total).toBe(1);
    expect((await listRedirects(db, { search: "nothing" })).total).toBe(0);
    await deleteRedirect(db, actor, row.id);
    expect((await listRedirects(db)).total).toBe(0);
  });

  it("rejects invalid input, a duplicate source and a loop", async () => {
    await expect(saveRedirect(db, actor, { from: "x", to: "/y", status: 301 })).rejects.toBeInstanceOf(RedirectInvalidError);
    await saveRedirect(db, actor, { from: "/a", to: "/b", status: 301 });
    await expect(saveRedirect(db, actor, { from: "/a", to: "/c", status: 301 })).rejects.toBeInstanceOf(RedirectExistsError);
    await expect(saveRedirect(db, actor, { from: "/b", to: "/a", status: 301 })).rejects.toBeInstanceOf(RedirectInvalidError);
  });

  it("counts hits and loads the flattened map", async () => {
    await saveRedirect(db, actor, { from: "/a", to: "/b", status: 301 });
    expect(await recordRedirectHits(db, { "/a": 3, "/missing": 5 })).toBe(1);
    expect(await recordRedirectHits(db, { "/a": 2 })).toBe(1);
    const [row] = await db.select().from(redirects);
    expect(row).toMatchObject({ hits: 5 });
    expect(row!.lastHitAt).not.toBeNull();
    expect(await loadRedirectMap(db)).toEqual({ "/a": { to: "/b", status: 301 } });
  });

  it("adds slug redirects in both locales, repoints older ones and removes one that starts at the new slug", async () => {
    await db.insert(redirects).values([
      { fromPath: "/th/news/oldest", toPath: "/th/news/old" },
      { fromPath: "/th/news/new", toPath: "/th/news/elsewhere" },
    ]);
    const written = await db.transaction((tx) => addSlugRedirects(tx, { base: "/news", oldSlug: "old", newSlug: "new", createdBy: actor.userId }));
    expect(written.map((r) => r.fromPath).sort()).toEqual(["/en/news/old", "/th/news/old"]);
    const map = await loadRedirectMap(db);
    expect(map["/th/news/old"]).toEqual({ to: "/th/news/new", status: 301 });
    expect(map["/en/news/old"]).toEqual({ to: "/en/news/new", status: 301 });
    expect(map["/th/news/oldest"]).toEqual({ to: "/th/news/new", status: 301 });
    expect(map["/th/news/new"]).toBeUndefined();
  });
});
