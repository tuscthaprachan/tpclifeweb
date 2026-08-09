/**
 * 2.5.8 Target Size (Minimum): every interactive control is at least 24 by
 * 24 CSS px (globals.css bumps this to 44px under `pointer: coarse`, which
 * the "mobile" project's touch emulation triggers automatically, so this
 * file only ever has to assert the universal 24px floor).
 *
 * The criterion's own inline exception is for a link that sits inside a
 * running sentence. A `<li>` that contains nothing but a nav link (every
 * `ServiceNavigation` item, for example) is not that: it is a navigation
 * target, and it is exactly the kind of small tap target 2.5.8 exists to
 * catch. So the exclusion below only fires when the `<p>`/`<li>` parent
 * carries meaningfully more text than the link itself, i.e. the link is
 * genuinely inline in prose (portable text content, the help block's
 * "label · hours" line) rather than sitting alone in a list item.
 *
 * Runs on every project: which elements are even visible changes between
 * the desktop nav and the mobile disclosure menu, and coarse-pointer
 * touch targets are 44px, both of which only show up per-viewport.
 */

import { expect, test } from "@playwright/test";
import { LOCALES, localePath, type Locale } from "../../lib/i18n/config";
import { discoverRoutes } from "./support/discover-routes";

const routes = discoverRoutes();
const MIN = 24;
const TOLERANCE = 0.5;

const SELECTOR = [
  "a[href]",
  "button",
  'input:not([type="hidden"])',
  "select",
  "textarea",
  "summary",
  '[role="button"]',
  '[role="tab"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="menuitem"]',
  '[role="option"]',
].join(", ");

for (const locale of LOCALES as readonly Locale[]) {
  for (const route of routes) {
    test(`target size: ${locale} ${route}`, async ({ page }) => {
      await page.goto(localePath(locale, route));

      const candidates = page.locator(SELECTOR);
      const count = await candidates.count();
      const failures: string[] = [];

      for (let i = 0; i < count; i += 1) {
        const el = candidates.nth(i);
        if (!(await el.isVisible())) continue;

        const info = await el.evaluate((node) => {
          /*
           * A visually-hidden control is not a 1x1px tap target, it is a
           * control that has not been revealed yet. The skip link is the case
           * that matters here: it sits at 1x1px under `.visually-hidden-
           * focusable` until it receives focus, at which point it renders at
           * full size and its real dimensions are what 2.5.8 governs.
           *
           * Measuring it while hidden reports 1x1px on every route and buries
           * the genuine failures underneath. Playwright's isVisible() returns
           * true for it because clip-path hiding still occupies layout, so the
           * check has to be explicit.
           */
          const hiddenStyle = getComputedStyle(node);
          const isClipHidden =
            hiddenStyle.clipPath !== "none" &&
            hiddenStyle.clipPath.includes("inset") &&
            node !== document.activeElement;

          const isInlineInSentence = (() => {
            if (node.tagName !== "A") return false;
            const parent = node.parentElement;
            if (!parent || (parent.tagName !== "P" && parent.tagName !== "LI")) return false;
            const ownText = (node.textContent ?? "").trim();
            const parentText = (parent.textContent ?? "").trim();
            return parentText.length > ownText.length + 5;
          })();

          function describe(target: Element): string {
            let out = target.tagName.toLowerCase();
            if (target.id) out += `#${target.id}`;
            const text = (target.textContent ?? "").trim().slice(0, 40);
            if (text) out += ` "${text}"`;
            return out;
          }

          return { isInlineInSentence, isClipHidden, descriptor: describe(node) };
        });

        if (info.isInlineInSentence) continue;
        if (info.isClipHidden) continue;

        const box = await el.boundingBox();
        if (!box) continue;

        if (box.width + TOLERANCE < MIN || box.height + TOLERANCE < MIN) {
          failures.push(`${info.descriptor}: ${box.width.toFixed(1)}x${box.height.toFixed(1)}px (need ${MIN}x${MIN})`);
        }
      }

      expect(
        failures,
        `${failures.length} interactive element(s) below the 24x24 CSS px minimum on ${locale}${route}:\n  ${failures.join("\n  ")}`,
      ).toEqual([]);
    });
  }
}
