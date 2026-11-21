// Startup file for the Plesk deploy. The deploy workflow renames Next's
// standalone server.js to next-server.js and puts this file in its place, so
// Plesk's "Application startup file: server.js" setting stays the same.
//
// Why: Next writes regenerated ISR pages to .next/server/app/*.html|.rsc|.meta,
// the same files the deploy checks out. Plesk swaps the files in before
// Passenger restarts the app, so the old process can still regenerate a page in
// that window and write HTML from the old build over the new one. The new
// process then serves that HTML, whose /_next/static CSS and JS no longer exist,
// and the page shows up unstyled until it next revalidates (up to a day).
//
// Every page Next renders contains its build ID, so any cached page without the
// current one is left over from an older build. Delete it before Next starts;
// Next renders it again on the first request.

const fs = require("fs");
const path = require("path");

function removeStalePages() {
  const root = path.join(__dirname, ".next", "server", "app");
  let buildId;
  try {
    buildId = fs.readFileSync(path.join(__dirname, ".next", "BUILD_ID"), "utf8").trim();
  } catch {
    return;
  }
  if (!buildId) return;

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
  walk(root);
  if (removed > 0) {
    console.log(`[startup] Removed ${removed} cached page(s) left over from an older build`);
  }
}

try {
  removeStalePages();
} catch (err) {
  console.error("[startup] Stale page cleanup failed", err);
}

require("./next-server.js");
