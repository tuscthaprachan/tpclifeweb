/**
 * 1.4.10 Reflow: nothing scrolls horizontally at 320 CSS px. Runs on the
 * "reflow-320" project only (see tests/playwright.config.ts): that project
 * exists solely for this 320x256 viewport.
 */

import { expect, test } from "@playwright/test";
import { LOCALES, localePath, type Locale } from "../../lib/i18n/config";
import { discoverRoutes } from "./support/discover-routes";

const routes = discoverRoutes();

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "reflow-320", 'Only meaningful at the reflow-320 project\'s 320px viewport.');
});

for (const locale of LOCALES as readonly Locale[]) {
  for (const route of routes) {
    test(`reflow: ${locale} ${route}`, async ({ page }) => {
      await page.goto(localePath(locale, route));

      const overflow = await page.evaluate(() => {
        const docEl = document.documentElement;
        const innerWidth = window.innerWidth;
        const scrollWidth = docEl.scrollWidth;
        if (scrollWidth <= innerWidth + 1) return null;

        // Find the widest offender: the element whose right edge extends
        // furthest past the viewport, so a failure names something instead
        // of just being red.
        let widest: { descriptor: string; right: number } | null = null;
        const all = document.querySelectorAll<HTMLElement>("body *");
        for (const el of all) {
          const rect = el.getBoundingClientRect();
          if (rect.right > innerWidth + 1 && (!widest || rect.right > widest.right)) {
            let descriptor = el.tagName.toLowerCase();
            if (el.id) descriptor += `#${el.id}`;
            else if (el.className && typeof el.className === "string") descriptor += `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}`;
            widest = { descriptor, right: rect.right };
          }
        }

        return {
          innerWidth,
          scrollWidth,
          widest: widest ?? { descriptor: "(no single element wider than the viewport was found; the overflow may come from a combination)", right: 0 },
        };
      });

      expect(
        overflow,
        overflow
          ? `${locale}${route}: document.documentElement.scrollWidth (${overflow.scrollWidth}px) exceeds window.innerWidth (${overflow.innerWidth}px). ` +
              `Widest offending element: ${overflow.widest.descriptor}, right edge at ${overflow.widest.right.toFixed(1)}px.`
          : undefined,
      ).toBeNull();
    });
  }
}
