/**
 * Zero axe-core violations, on every route, in both locales, tagged against
 * WCAG 2.0/2.1/2.2 A and AA. Runs on every configured project (mobile,
 * desktop, reflow-320, dark), since a violation that only shows up at 320px
 * or only in the dark theme is exactly the kind of thing a single-viewport
 * run would miss.
 *
 * Routes are discovered from the filesystem (see support/discover-routes.ts)
 * rather than hardcoded, so a route added later is audited automatically on
 * the next run.
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { LOCALES, localePath, type Locale } from "../../lib/i18n/config";
import { formatViolations } from "./support/axe-report";
import { discoverRoutes } from "./support/discover-routes";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const routes = discoverRoutes();

for (const locale of LOCALES as readonly Locale[]) {
  for (const route of routes) {
    test(`axe: ${locale} ${route}`, async ({ page }) => {
      const response = await page.goto(localePath(locale, route));
      expect(response?.ok(), `${localePath(locale, route)} did not respond with an ok status`).toBeTruthy();

      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

      expect(results.violations, formatViolations(`${locale} ${route}`, results.violations)).toEqual([]);
    });
  }
}
