import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

let dir: string;

function put(rel: string, text: string) {
  mkdirSync(join(dir, rel, ".."), { recursive: true });
  writeFileSync(join(dir, rel), text);
}

function start() {
  execFileSync(process.execPath, [join(dir, "server.js")], { stdio: "pipe" });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "plesk-server-"));
  cpSync(join(process.cwd(), "scripts", "plesk-server.js"), join(dir, "server.js"));
  put("next-server.js", "");
  put(".next/BUILD_ID", "build-a\n");
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("plesk startup file", () => {
  it("empties the route and data caches written by another build", () => {
    put(".next/server/route-cache/page.html", "old");
    put(".next/cache/fetch-cache/entry", "old");
    put(".next/server/route-cache.build-id", "build-old\n");
    put(".next/cache/fetch-cache.build-id", "build-old\n");
    start();
    expect(existsSync(join(dir, ".next/server/route-cache"))).toBe(false);
    expect(existsSync(join(dir, ".next/cache/fetch-cache"))).toBe(false);
    expect(readFileSync(join(dir, ".next/server/route-cache.build-id"), "utf8")).toBe("build-a\n");
    expect(readFileSync(join(dir, ".next/cache/fetch-cache.build-id"), "utf8")).toBe("build-a\n");
  });

  it("keeps both caches on a restart of the same build", () => {
    put(".next/server/route-cache/page.html", "kept");
    put(".next/cache/fetch-cache/entry", "kept");
    put(".next/server/route-cache.build-id", "build-a\n");
    put(".next/cache/fetch-cache.build-id", "build-a\n");
    start();
    expect(readFileSync(join(dir, ".next/server/route-cache/page.html"), "utf8")).toBe("kept");
    expect(readFileSync(join(dir, ".next/cache/fetch-cache/entry"), "utf8")).toBe("kept");
  });

  it("treats a cache with no marker as left by an older build", () => {
    put(".next/cache/fetch-cache/entry", "old");
    start();
    expect(existsSync(join(dir, ".next/cache/fetch-cache"))).toBe(false);
    expect(readFileSync(join(dir, ".next/cache/fetch-cache.build-id"), "utf8")).toBe("build-a\n");
  });
});
