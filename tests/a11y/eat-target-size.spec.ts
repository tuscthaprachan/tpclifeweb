/**
 * 2.5.8 Target Size (Minimum) on the /eat section, including the 44px target that
 * `--target-min` becomes only under `(pointer: coarse)`. Headless Chromium reports a fine pointer, so
 * target-size.spec.ts only ever proves the 24px floor; here the mobile project emulates a coarse,
 * non-hovering pointer through CDP and asserts 44x44, and the desktop project asserts the 24px rule
 * with its spacing exception. Exceptions are described on findSmallTargets in support/eat.ts.
 */

import { expect, test } from "@playwright/test";
import { UI } from "../../lib/i18n/strings";
import { EAT_KEY_PAGES, findSmallTargets } from "./support/eat";

const BREADCRUMB = `nav[aria-label="${UI.breadcrumb.en}"], nav[aria-label="${UI.breadcrumb.th}"]`;

const KNOWN_COARSE_FAILURES: Record<string, string> = {
  "/en/eat/stalls/2-song-phi-nong-noodles?diet=nopork": "the dish links in the stall's full menu list are 28.5px tall under a coarse pointer (need 44)",
  "/en/eat/dishes/4-iced-chinese-tea": "the 'Stall 4 · GaNGa' link in the where-to-find-it block is 24.4px tall under a coarse pointer (need 44)",
  "/en/eat/map": "the linked stall tiles on the floor plan are 72x36px under a coarse pointer (need 44); the plan only guarantees 24px",
  "/en/eat/plan?mode=week&budget=400&days=1,2,3,4,5&seed=m4bpdq": "the 'Lock: Monday' to 'Lock: Friday' links are 37.3px wide under a coarse pointer (need 44)",
};

test.describe("eat target size", () => {
  for (const url of EAT_KEY_PAGES) {
    test(`eat target size, coarse pointer 44px: ${url}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile", "The coarse pointer is emulated on the mobile project only.");

      test.fail(url in KNOWN_COARSE_FAILURES, `Real bug: ${KNOWN_COARSE_FAILURES[url]}`);

      const session = await page.context().newCDPSession(page);
      await session.send("Emulation.setEmulatedMedia", {
        features: [
          { name: "pointer", value: "coarse" },
          { name: "hover", value: "none" },
        ],
      });

      await page.goto(url);
      expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches), "the coarse pointer emulation did not take effect").toBe(true);
      expect(await page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--target-min"))), "--target-min should be 44px under a coarse pointer").toBeGreaterThanOrEqual(44);

      const failures = await findSmallTargets(page, 44, false, BREADCRUMB);
      expect(
        failures,
        `${failures.length} interactive element(s) in <main> below 44x44 CSS px under a coarse pointer on ${url}:\n  ${failures.map((f) => `${f.descriptor}: ${f.width}x${f.height}px`).join("\n  ")}`,
      ).toEqual([]);
    });

    test(`eat target size, 24px or spacing: ${url}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop", "Fine pointer, desktop project only.");

      await page.goto(url);
      const failures = await findSmallTargets(page, 24, true, BREADCRUMB);
      expect(
        failures,
        `${failures.length} interactive element(s) in <main> below 24x24 CSS px with no spacing exception on ${url}:\n  ${failures.map((f) => `${f.descriptor}: ${f.width}x${f.height}px`).join("\n  ")}`,
      ).toEqual([]);
    });
  }

  test("eat target size, breadcrumb Home link under a coarse pointer", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The coarse pointer is emulated on the mobile project only.");
    test.fail(true, "Real bug: the breadcrumb 'Home' link is 41x44px under a coarse pointer (min-h is set, min-w is not), on every /eat page");

    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setEmulatedMedia", { features: [{ name: "pointer", value: "coarse" }, { name: "hover", value: "none" }] });
    await page.goto("/en/eat");

    const box = await page.locator("main").getByRole("navigation", { name: UI.breadcrumb.en }).getByRole("link").first().boundingBox();
    expect(box?.width ?? 0, `breadcrumb Home link is ${box?.width}x${box?.height}px`).toBeGreaterThanOrEqual(43.5);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  });
});
