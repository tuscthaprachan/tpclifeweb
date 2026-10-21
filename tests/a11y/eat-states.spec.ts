/**
 * Zero axe-core violations in the interactive and empty states of the /eat section that axe.spec.ts never
 * reaches: the mobile filter dialog, the floating Filters button, the pick page's "More options", the
 * map's list view, the zero-results empty state and a plan with every meal shown. The states that only
 * exist on a phone run on the mobile project; the rest run on every project.
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { EAT, eat } from "../../components/domain/canteen/strings";
import { PICK } from "../../components/domain/canteen/pick/strings";
import { formatViolations } from "./support/axe-report";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function auditCurrentState(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations, formatViolations(label, results.violations)).toEqual([]);
}

test.describe("eat states on a phone", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "These states only exist on a phone.");
  });

  test("axe state: eat dishes filter dialog open", async ({ page }) => {
    await page.goto("/en/eat/dishes");
    await page.getByRole("link", { name: new RegExp(`^${EAT.editFilters.en}`) }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog, "the Edit filters link should open a dialog").toBeVisible();
    await expect(dialog.getByRole("heading", { name: EAT.filtersTitle.en })).toBeVisible();

    await auditCurrentState(page, "/en/eat/dishes (filter dialog open)");
  });

  test("axe state: eat dishes floating Filters button", async ({ page }) => {
    await page.goto("/en/eat/dishes");
    await page.evaluate(() => window.scrollTo(0, 3000));
    const floating = page.locator("button[aria-haspopup='dialog']", { hasText: EAT.filtersTitle.en });
    await expect(floating, "the floating Filters button should appear once the filter bar has scrolled away").toBeVisible();

    await auditCurrentState(page, "/en/eat/dishes (floating Filters button after scrolling 3000px)");
  });

  test("axe state: eat map list view", async ({ page }) => {
    await page.goto("/en/eat/map?view=list");
    await auditCurrentState(page, "/en/eat/map?view=list");
  });

  test("axe state: eat map default plan view", async ({ page }) => {
    await page.goto("/en/eat/map");
    await expect(page.locator(".cmap-scroll"), "the default view should show the floor plan").toBeVisible();
    await auditCurrentState(page, "/en/eat/map (default plan view)");
  });
});

test("axe state: eat pick with More options expanded", async ({ page }) => {
  await page.goto("/en/eat/pick?seed=abc");
  const details = page.locator("details").filter({ has: page.locator("summary", { hasText: PICK.moreOptions.en }) });
  await details.locator("summary").first().click();
  await expect(details, "More options should be open").toHaveJSProperty("open", true);

  await auditCurrentState(page, "/en/eat/pick?seed=abc (More options expanded)");
});

test("axe state: eat dishes zero results", async ({ page }) => {
  await page.goto("/en/eat/dishes?q=zzzz");
  await expect(page.getByText(eat.noSearchResults("en", "zzzz")), "the empty state should render").toBeVisible();

  await auditCurrentState(page, "/en/eat/dishes?q=zzzz (zero results)");
});

test("axe state: eat plan with more meals shown", async ({ page }) => {
  await page.goto("/en/eat/plan?meal=60&show=12");
  await auditCurrentState(page, "/en/eat/plan?meal=60&show=12");
});
