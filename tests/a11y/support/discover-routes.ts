/**
 * Route discovery, shared by every spec in tests/a11y and tests/e2e.
 *
 * The suite must cover a route added later by another agent without anyone
 * having to remember to add it to a list here (see the harden agent's brief
 * in the project instructions). The most reliable way to guarantee that is
 * to read the filesystem directly: any directory under `app/[locale]` that
 * has its own `page.tsx` is a real route Next.js will serve, full stop, so
 * enumerating that directory can never go stale the way a hand-maintained
 * array would.
 *
 * Two kinds of directory are skipped:
 *   - Dynamic segments (`[slug]`). a slug is only known once the database is
 *     seeded, so there is no fixed slug to visit;
 *     the list page that would link to one instead renders its empty
 *     state, which the index route itself already covers.
 *   - `design`. Documented in app/[locale]/design/page.tsx as "internal
 *     design system reference, not part of the public bilingual site": it
 *     is English-only prose that never draws on lib/i18n/strings.ts, is not
 *     linked from either nav in components/layout/site-settings.ts, and was
 *     never meant to pass a bilingual accessibility audit built for the
 *     public site.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const EXCLUDED_DIR_NAMES = new Set(["design"]);

function isDynamicSegment(name: string): boolean {
  return name.startsWith("[") && name.endsWith("]");
}

/**
 * Every real, publicly reachable, locale-free route path under
 * `app/[locale]` ("/", "/forms", "/accessibility", ...), sorted for stable
 * test output. Synchronous and filesystem-only, so it can be called at
 * module load time, before any browser is launched, letting every spec
 * generate one real Playwright test per route instead of looping inside a
 * single test.
 */
export function discoverRoutes(): string[] {
  const appLocaleDir = join(process.cwd(), "app", "[locale]");
  const routes: string[] = [];

  function walk(dir: string, routePath: string): void {
    if (existsSync(join(dir, "page.tsx"))) {
      routes.push(routePath === "" ? "/" : routePath);
    }

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (EXCLUDED_DIR_NAMES.has(entry.name) || isDynamicSegment(entry.name)) continue;
      walk(join(dir, entry.name), `${routePath}/${entry.name}`);
    }
  }

  walk(appLocaleDir, "");
  return routes.sort();
}
