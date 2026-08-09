/**
 * 1.4.12 Text Spacing: apply the WCAG override values and confirm nothing is
 * clipped or forced into horizontal scrolling as a result.
 *
 * Runs on "mobile" and "desktop": "reflow-320" already isolates the
 * narrow-viewport case for 1.4.10 on its own, and stacking the text-spacing
 * override on top of a 320px viewport mixes two different failure causes
 * into one report. "dark" changes colour only, not box metrics.
 */

import { expect, test } from "@playwright/test";
import { LOCALES, localePath, type Locale } from "../../lib/i18n/config";
import { discoverRoutes } from "./support/discover-routes";

const routes = discoverRoutes();

const OVERRIDE_CSS = `
  * {
    line-height: 1.5 !important;
    letter-spacing: 0.12em !important;
    word-spacing: 0.16em !important;
  }
  p {
    margin-bottom: 2em !important;
  }
`;

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile" && testInfo.project.name !== "desktop", "Layout-metric check, only needs one narrow and one wide viewport.");
});

for (const locale of LOCALES as readonly Locale[]) {
  for (const route of routes) {
    test(`text spacing: ${locale} ${route}`, async ({ page }) => {
      await page.goto(localePath(locale, route));
      await page.addStyleTag({ content: OVERRIDE_CSS });

      const result = await page.evaluate(() => {
        function describe(el: Element): string {
          let out = el.tagName.toLowerCase();
          if (el.id) out += `#${el.id}`;
          const text = (el.textContent ?? "").trim().slice(0, 40);
          if (text) out += ` "${text}"`;
          return out;
        }

        const problems: string[] = [];

        const innerWidth = window.innerWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        if (scrollWidth > innerWidth + 1) {
          problems.push(`page scrolls horizontally: scrollWidth ${scrollWidth}px > innerWidth ${innerWidth}px`);
        }

        /*
         * Visually-hidden elements are clipped ON PURPOSE. The
         * `.visually-hidden` pattern in globals.css collapses an element to
         * 1x1px with `clip-path: inset(50%)` precisely so that sighted readers
         * do not see it while assistive technology still reads it in full.
         *
         * A naive clipping check flags every one of them, because 1px of box
         * around 26px of text is exactly what "content exceeds its box" looks
         * like. That is the pattern working, not 1.4.12 failing: the text is
         * not truncated for anyone, it is hidden from one channel by design.
         *
         * So skip anything using the clip-path hiding technique. The skip link
         * is deliberately NOT skipped when focused, since at that point it is
         * visible and its text must fit like any other control.
         */
        function isIntentionallyHidden(style: CSSStyleDeclaration, el: HTMLElement): boolean {
          if (el === document.activeElement) return false;
          const clipped = style.clipPath !== "none" && style.clipPath.includes("inset");
          const tiny = el.clientWidth <= 1 || el.clientHeight <= 1;
          return clipped && tiny;
        }

        // Clipping: an element whose overflow is hidden/clip but whose
        // content now exceeds its box once the wider spacing is applied.
        for (const el of document.querySelectorAll<HTMLElement>("body *")) {
          const style = getComputedStyle(el);
          if (isIntentionallyHidden(style, el)) continue;

          const clipsY = style.overflowY === "hidden" || style.overflowY === "clip";
          if (clipsY && el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 1) {
            problems.push(`${describe(el)}: content clipped vertically (scrollHeight ${el.scrollHeight}px > clientHeight ${el.clientHeight}px, overflow-y: ${style.overflowY})`);
          }

          const clipsX = style.overflowX === "hidden" || style.overflowX === "clip";
          if (clipsX && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) {
            problems.push(`${describe(el)}: content clipped horizontally (scrollWidth ${el.scrollWidth}px > clientWidth ${el.clientWidth}px, overflow-x: ${style.overflowX})`);
          }
        }

        return problems;
      });

      expect(result, `${locale}${route} under the WCAG text-spacing override:\n  ${result.join("\n  ")}`).toEqual([]);
    });
  }
}
