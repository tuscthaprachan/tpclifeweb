// Startup file for the Plesk deploy. The deploy workflow renames Next's
// standalone server.js to next-server.js and puts this file in its place, so
// Plesk's "Application startup file: server.js" setting stays the same.
//
// Why: Next keeps two kinds of runtime cache on disk. Pages it regenerates are
// written to .next/server/route-cache/, and data cached with unstable_cache is
// written to .next/cache/fetch-cache/. Neither folder is part of the deploy
// branch, so Plesk's Git deploy never clears them and they outlive every
// deploy. The new process then serves pages rendered by an older build. Their
// /_next/static CSS and JS no longer exist, so they show up unstyled until they
// next revalidate, which can take a day. Cached data is stale in the same way:
// content written straight to the database does not appear until it expires.
//
// So before Next starts:
// 1. Empty route-cache and fetch-cache when they were written by another build.
//    Each has its own marker file recording which build it belongs to, so a
//    plain restart (Passenger idle shutdown, Restart App) keeps the caches.
// 2. Delete any prerendered page in .next/server/app that lacks the current
//    build ID. Every page Next renders contains it. This catches an old process
//    writing over the new files between Plesk's checkout and the restart.
// Next renders anything removed again on the next request.

const fs = require("fs");
const path = require("path");

const serverDir = path.join(__dirname, ".next", "server");
const cacheDir = path.join(__dirname, ".next", "cache");

function readBuildId() {
  try {
    return fs.readFileSync(path.join(__dirname, ".next", "BUILD_ID"), "utf8").trim();
  } catch {
    return "";
  }
}

function clearCache(dir, marker, label, buildId) {
  let owner = "";
  try {
    owner = fs.readFileSync(marker, "utf8").trim();
  } catch {
    // No marker: the cache predates this script or does not exist yet.
  }
  if (owner !== buildId && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`[startup] Cleared the ${label} left by an older build`);
  }
  fs.mkdirSync(path.dirname(marker), { recursive: true });
  fs.writeFileSync(marker, `${buildId}\n`);
}

function clearRouteCache(buildId) {
  clearCache(path.join(serverDir, "route-cache"), path.join(serverDir, "route-cache.build-id"), "runtime page cache", buildId);
}

function clearFetchCache(buildId) {
  clearCache(path.join(cacheDir, "fetch-cache"), path.join(cacheDir, "fetch-cache.build-id"), "runtime data cache", buildId);
}

function removeStalePrerenders(buildId) {
  let removed = 0;
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.endsWith(".segments")) walk(full);
        continue;
      }
      if (!entry.name.endsWith(".html")) continue;
      let html;
      try {
        html = fs.readFileSync(full, "utf8");
      } catch {
        continue;
      }
      if (html.includes(buildId)) continue;
      const base = full.slice(0, -".html".length);
      for (const p of [full, `${base}.rsc`, `${base}.meta`, `${base}.segments`]) {
        try {
          fs.rmSync(p, { recursive: true, force: true });
        } catch {
          // A file we cannot remove is served as before; never block startup.
        }
      }
      removed++;
    }
  };
  walk(path.join(serverDir, "app"));
  if (removed > 0) {
    console.log(`[startup] Removed ${removed} prerendered page(s) left over from an older build`);
  }
}

const buildId = readBuildId();
if (buildId) {
  for (const step of [clearRouteCache, clearFetchCache, removeStalePrerenders]) {
    try {
      step(buildId);
    } catch (err) {
      console.error(`[startup] ${step.name} failed`, err);
    }
  }
}

require("./next-server.js");
