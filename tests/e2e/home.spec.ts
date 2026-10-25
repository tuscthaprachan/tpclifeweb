import { expect, test, type Page } from "@playwright/test";
import { LOCALES, localePath, type Locale } from "../../lib/i18n/config";
import { UI } from "../../lib/i18n/strings";

const FIRST_SCREEN = { width: 360, height: 640 };
const MAX_PAGE_HEIGHT = 3300;
const MAX_TABS_TO_TODAY = 6;

function today(page: Page, locale: Locale) {
  return page.getByRole("region", { name: UI.homeToday[locale], exact: true });
}

for (const locale of LOCALES as readonly Locale[]) {
  test.describe(`home: ${locale}`, () => {
    test.describe("first screen at 360 by 640", () => {
      test.use({ viewport: FIRST_SCREEN });

      test.beforeEach(async ({}, testInfo) => {
        test.skip(testInfo.project.name !== "mobile", "Mobile first screen only.");
      });

      test("search and the first Today row are visible without scrolling", async ({ page }) => {
        await page.goto(localePath(locale, "/"));

        const search = page.locator("main [role=search] input").first();
        await expect(search).toBeVisible();
        const searchBox = await search.boundingBox();
        expect(searchBox?.y ?? Infinity).toBeLessThan(FIRST_SCREEN.height);

        const firstRow = today(page, locale).locator("dl > div").first();
        await expect(firstRow).toBeVisible();
        const rowBox = await firstRow.boundingBox();
        expect((rowBox?.y ?? Infinity) + (rowBox?.height ?? 0), "first Today row should end inside the first screen").toBeLessThanOrEqual(
          FIRST_SCREEN.height,
        );
      });

      test(`page is at most ${MAX_PAGE_HEIGHT}px tall`, async ({ page }) => {
        await page.goto(localePath(locale, "/"));
        const height = await page.evaluate(async () => {
          await document.fonts.ready;
          return document.documentElement.scrollHeight;
        });
        expect(height).toBeLessThanOrEqual(MAX_PAGE_HEIGHT);
      });

      test(`the first Today link is at most ${MAX_TABS_TO_TODAY} tab stops after the skip link`, async ({ page }) => {
        await page.goto(localePath(locale, "/"));
        await page.keyboard.press("Tab");

        let presses = 0;
        let inToday = false;
        while (!inToday && presses < 30) {
          await page.keyboard.press("Tab");
          presses += 1;
          inToday = await today(page, locale).evaluate((region) => region.contains(document.activeElement));
        }
        expect(inToday, "never reached the Today block by keyboard").toBe(true);
        expect(presses).toBeLessThanOrEqual(MAX_TABS_TO_TODAY);
      });
    });

    test.describe("markup", () => {
      test.beforeEach(async ({}, testInfo) => {
        test.skip(testInfo.project.name !== "desktop" && testInfo.project.name !== "mobile", "Markup only.");
      });

      test("exactly one search landmark", async ({ page }) => {
        await page.goto(localePath(locale, "/"));
        await expect(page.getByRole("search")).toHaveCount(1);
      });

      test("no live regions outside the search form", async ({ page }) => {
        await page.goto(localePath(locale, "/"));
        const live = await page.evaluate(
          () =>
            Array.from(document.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"], [role="timer"]')).filter(
              (node) => !node.closest('[role="search"]') && node.getAttribute("aria-live") !== "off",
            ).length,
        );
        expect(live).toBe(0);
      });

      test("headings follow the planned order", async ({ page }) => {
        await page.goto(localePath(locale, "/"));
        await expect(page.locator("h1")).toHaveText(UI.homeHeading[locale]);
        const h2s = (await page.locator("main h2").allTextContents()).map((text) => text.trim());
        const planned: string[] = [UI.homeToday[locale], UI.homePopular[locale], UI.homeWhatsOn[locale], UI.homeUnion[locale]];
        expect(h2s.filter((text) => planned.includes(text))).toEqual(planned);
      });

      test("popular tasks link to their services and to All services", async ({ page }) => {
        await page.goto(localePath(locale, "/"));
        const popular = page.getByRole("region", { name: UI.homePopular[locale], exact: true });
        const links = popular.getByRole("link");
        expect(await links.count()).toBeGreaterThanOrEqual(2);

        await popular.getByRole("link", { name: UI.homeAllServices[locale], exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`${localePath(locale, "/services")}$`));
        await expect(page.locator("h1")).toHaveText(UI.homeAllServices[locale]);
      });

      test("no news item is shown twice", async ({ page }) => {
        await page.goto(localePath(locale, "/"));
        const hrefs = await page
          .locator("main a[href*='/news/']")
          .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")).filter((href) => href && !href.endsWith("/news")));
        expect(new Set(hrefs).size).toBe(hrefs.length);
      });
    });
  });
}
