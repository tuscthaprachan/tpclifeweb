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

test.describe("eat target size", () => {
  for (const url of EAT_KEY_PAGES) {
    test(`eat target size, coarse pointer 44px: ${url}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile", "The coarse pointer is emulated on the mobile project only.");

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

    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setEmulatedMedia", { features: [{ name: "pointer", value: "coarse" }, { name: "hover", value: "none" }] });
    await page.goto("/en/eat");

    const box = await page.locator("main").getByRole("navigation", { name: UI.breadcrumb.en }).getByRole("link").first().boundingBox();
    expect(box?.width ?? 0, `breadcrumb Home link is ${box?.width}x${box?.height}px`).toBeGreaterThanOrEqual(43.5);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  });
});
