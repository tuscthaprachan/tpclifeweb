/**
 * 1.4.10 Reflow: nothing scrolls horizontally at 320 CSS px. Runs on the
 * "reflow-320" project only (see tests/playwright.config.ts): that project
 * exists solely for this 320x256 viewport.
 */

import { expect, test } from "@playwright/test";
import { LOCALES, localePath, type Locale } from "../../lib/i18n/config";
import { discoverRoutes } from "./support/discover-routes";
import { EAT_KEY_PAGES } from "./support/eat";

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

/*
 * The discovered routes above are bare paths. The /eat pages change shape with their query string (a
 * stall page with a diet filter, a week plan, a group plan, a pick with a seed), so those variants are
 * checked here. The map plan's scroll region is the one thing allowed to extend past the edge, and only
 * as a keyboard-reachable labelled region.
 */
for (const url of EAT_KEY_PAGES) {
  test(`reflow: eat ${url}`, async ({ page }) => {
    await page.goto(url);

    const result = await page.evaluate(() => {
      const docEl = document.documentElement;
      const offenders: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>("body *")) {
        const rect = el.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2 || rect.right <= docEl.clientWidth + 1) continue;
        if (el.closest('[role="region"][tabindex="0"]')) continue;
        if (getComputedStyle(el).clipPath.includes("inset")) continue;
        let clipped = false;
        for (let parent = el.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
          if (getComputedStyle(parent).overflowX !== "visible" && parent.getBoundingClientRect().right <= docEl.clientWidth + 1) clipped = true;
        }
        if (clipped) continue;
        let descriptor = el.tagName.toLowerCase();
        if (el.id) descriptor += `#${el.id}`;
        else if (el.className && typeof el.className === "string") descriptor += `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}`;
        offenders.push(`${descriptor} (right edge ${rect.right.toFixed(1)}px)`);
      }
      const scroller = document.querySelector<HTMLElement>(".cmap-scroll");
      return {
        scrollWidth: docEl.scrollWidth,
        clientWidth: docEl.clientWidth,
        offenders: offenders.slice(0, 8),
        scroller: scroller ? { role: scroller.getAttribute("role"), tabindex: scroller.getAttribute("tabindex"), label: scroller.getAttribute("aria-label") } : null,
      };
    });

    expect(result.scrollWidth, `${url}: document.documentElement.scrollWidth (${result.scrollWidth}px) exceeds clientWidth (${result.clientWidth}px)`).toBeLessThanOrEqual(result.clientWidth);
    expect(result.offenders, `${url}: elements outside the labelled map scroll region extend past the right edge:\n  ${result.offenders.join("\n  ")}`).toEqual([]);
    if (result.scroller) {
      expect(result.scroller, `${url}: the map plan's scroll region must be a focusable, labelled region`).toEqual({ role: "region", tabindex: "0", label: expect.stringMatching(/\S/) });
    }
  });
}
