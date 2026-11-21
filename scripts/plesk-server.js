// Startup file for the Plesk deploy. The deploy workflow renames Next's
// standalone server.js to next-server.js and puts this file in its place, so
// Plesk's "Application startup file: server.js" setting stays the same.
//
// Why: Next keeps pages it regenerates at runtime on disk, in
// .next/server/route-cache/. That folder is not part of the deploy branch, so
// Plesk's Git deploy never clears it and it outlives every deploy. (On Vercel
// each deploy starts from an empty disk.) The new process then serves pages
// rendered by an older build. Their /_next/static CSS and JS no longer exist,
// so they show up unstyled until they next revalidate, which can take a day.
//
// So before Next starts:
// 1. Empty route-cache when it was written by another build. A marker file
//    records which build it belongs to, so a plain restart (Passenger idle
//    shutdown, Restart App) keeps the cache.
// 2. Delete any prerendered page in .next/server/app that lacks the current
//    build ID. Every page Next renders contains it. This catches an old process
//    writing over the new files between Plesk's checkout and the restart.
// Next renders anything removed again on the next request.

const fs = require("fs");
const path = require("path");

const serverDir = path.join(__dirname, ".next", "server");

function readBuildId() {
  try {
    return fs.readFileSync(path.join(__dirname, ".next", "BUILD_ID"), "utf8").trim();
  } catch {
    return "";
  }
}

function clearRouteCache(buildId) {
  const dir = path.join(serverDir, "route-cache");
  const marker = path.join(serverDir, "route-cache.build-id");
  let owner = "";
  try {
    owner = fs.readFileSync(marker, "utf8").trim();
  } catch {
    // No marker: the cache predates this script or does not exist yet.
  }
  if (owner !== buildId && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log("[startup] Cleared the runtime page cache left by an older build");
  }
  fs.writeFileSync(marker, `${buildId}\n`);
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
  for (const step of [clearRouteCache, removeStalePrerenders]) {
    try {
      step(buildId);
    } catch (err) {
      console.error(`[startup] ${step.name} failed`, err);
    }
  }
}

require("./next-server.js");
