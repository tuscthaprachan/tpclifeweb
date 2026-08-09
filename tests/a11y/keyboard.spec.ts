/**
 * Keyboard operability, checked once per locale (the chrome being tested,
 * header/skip link/mobile menu, is identical on every route) rather than
 * once per route: the shell is shared, so testing it on the home page
 * proves it everywhere else too, and tabbing through every route would only
 * repeat the same assertions at ten times the cost.
 *
 *  - The skip link is the first focusable element and moves focus to
 *    #main-content (2.4.1).
 *  - Tab order is sensible and every stop has a visible focus style (2.4.7).
 *  - 2.4.11 Focus Not Obscured: nothing tabs to a position hidden behind the
 *    sticky header.
 *  - The mobile menu opens, closes on Escape, and returns focus to its
 *    trigger.
 *
 * Runs on "mobile" and "desktop" only. "dark" only changes colour, which
 * this file does not assert on, and "reflow-320"'s 256px-tall viewport is
 * too short to say anything meaningful about scroll position.
 */

import { expect, test } from "@playwright/test";
import { LOCALES, localePath, type Locale } from "../../lib/i18n/config";
import { UI } from "../../lib/i18n/strings";
import { tabThroughFocusable } from "./support/tab-through";

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile" && testInfo.project.name !== "desktop", "Chrome behaviour only, not viewport-dependent beyond mobile vs desktop nav.");
});

for (const locale of LOCALES as readonly Locale[]) {
  test.describe(`keyboard: ${locale}`, () => {
    test("skip link is the first focusable element and targets #main-content (2.4.1)", async ({ page }) => {
      await page.goto(localePath(locale, "/"));

      await page.keyboard.press("Tab");
      const active = await page.evaluate(() => ({
        tag: document.activeElement?.tagName.toLowerCase(),
        href: document.activeElement instanceof HTMLAnchorElement ? document.activeElement.getAttribute("href") : null,
        text: document.activeElement?.textContent?.trim(),
      }));

      expect(active.tag, `first Tab landed on a <${active.tag}> ("${active.text}"), not the skip link`).toBe("a");
      expect(active.href, "the first focusable element's href should be the skip link's #main-content target").toBe("#main-content");

      await page.keyboard.press("Enter");
      const focusedAfterActivation = await page.evaluate(() => ({
        id: document.activeElement?.id ?? null,
        tag: document.activeElement?.tagName.toLowerCase() ?? null,
      }));
      expect(
        focusedAfterActivation.id,
        `activating the skip link should move DOM focus to #main-content (found <${focusedAfterActivation.tag} id="${focusedAfterActivation.id}"> focused instead). ` +
          `If <main id="main-content"> has no tabindex="-1", the browser cannot focus it directly: it is not a component this agent owns ` +
          `(app/[locale]/layout.tsx), but the fix is exactly that attribute.`,
      ).toBe("main-content");
    });

    test("every tab stop has a visible focus style (2.4.7)", async ({ page }) => {
      await page.goto(localePath(locale, "/"));
      const stops = await tabThroughFocusable(page, 40);
      expect(stops.length, "expected at least one focusable element").toBeGreaterThan(0);

      const invisible = stops.filter((stop) => !stop.hasVisibleFocusStyle);
      expect(
        invisible,
        `${invisible.length} tab stop(s) had no visible outline or box-shadow when focused: ${invisible.map((s) => s.descriptor).join(", ")}`,
      ).toEqual([]);
    });

    test("2.4.11 Focus Not Obscured: no tab stop sits behind the sticky header", async ({ page }) => {
      await page.goto(localePath(locale, "/"));
      const stops = await tabThroughFocusable(page, 60);

      const headerBottom = await page.evaluate(
        () => document.querySelector("header")?.getBoundingClientRect().bottom ?? 0,
      );

      /*
       * Overlapping the header's box is NOT the same as being hidden by it.
       * The skip link deliberately sits at the very top of the page on a
       * higher z-index than the header, so a pure geometry check reports it as
       * obscured on every route while it is in fact the topmost thing on
       * screen: exactly what 2.4.1 requires of it.
       *
       * So ask the browser what is actually painted at the element's centre.
       * If the focused element (or something inside it) is the hit-test
       * result, nothing is covering it, whatever the rectangles say.
       */
      const geometricallyOverHeader = stops.filter(
        (stop) => !stop.insideHeader && stop.rect.height > 0 && stop.rect.top < headerBottom - 1,
      );

      const obscured: typeof geometricallyOverHeader = [];
      for (const stop of geometricallyOverHeader) {
        const covered = await page.evaluate((rect) => {
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          const topMost = document.elementFromPoint(x, y);
          if (!topMost) return true;
          const focused = document.activeElement;
          if (!focused) return true;
          return !(topMost === focused || focused.contains(topMost) || topMost.contains(focused));
        }, stop.rect);
        if (covered) obscured.push(stop);
      }

      expect(
        obscured,
        `${obscured.length} tab stop(s) were actually covered by the sticky header (bottom edge ${headerBottom.toFixed(1)}px): ` +
          obscured.map((s) => `${s.descriptor} (top ${s.rect.top.toFixed(1)}px)`).join(", "),
      ).toEqual([]);
    });

    test("mobile menu opens, closes on Escape, and returns focus to its trigger", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile", "The disclosure menu is only visible below the sm breakpoint.");

      await page.goto(localePath(locale, "/"));
      const trigger = page.getByText(UI.openMenu[locale], { exact: true });
      await expect(trigger, "mobile menu trigger (<summary>) should be visible on the mobile project").toBeVisible();

      await trigger.focus();
      await page.keyboard.press("Enter");

      const details = page.locator("details");
      await expect(details, "the disclosure should open").toHaveJSProperty("open", true);

      await page.keyboard.press("Escape");
      await expect(details, "Escape should close the disclosure").toHaveJSProperty("open", false);

      // Locator-based (auto-retrying) rather than a one-shot evaluate: the
      // trigger's own label flips from openMenu back to closeMenu via a
      // React state update driven by the details element's native "toggle"
      // event, which lands a tick after the Escape keypress itself.
      await expect(
        page.locator(":focus"),
        "focus should return to the menu trigger after Escape closes it",
      ).toHaveText(UI.openMenu[locale]);
    });
  });
}
