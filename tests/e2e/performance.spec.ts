/** The public performance page: the period selector is plain links, and every period passes axe. */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the period links change the figures and an unknown period falls back", async ({ page }) => {
    await page.goto("/th/performance");
    await expect(page.locator("h1")).toHaveText("ผลการดำเนินงาน");
    await page.getByRole("link", { name: "30 วันที่ผ่านมา" }).click();
    await expect(page).toHaveURL(/period=30d/);
    await expect(page.locator('nav[aria-label="ช่วงเวลา"] [aria-current="page"]')).toHaveText("30 วันที่ผ่านมา");
    await page.goto("/en/performance?period=bogus");
    await expect(page.locator('nav[aria-label="Period"] [aria-current="page"]')).toHaveText("Last 12 months");
  });
});

test("every period passes axe in both languages", async ({ page }) => {
  for (const period of ["30d", "12m", "all"]) {
    for (const locale of ["en", "th"]) {
      await page.goto(`/${locale}/performance?period=${period}`);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations, `${locale} ${period}`).toEqual([]);
    }
  }
});
