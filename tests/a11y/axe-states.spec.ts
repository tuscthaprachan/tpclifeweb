/**
 * Zero axe-core violations in the INTERACTIVE STATES a page can be in.
 *
 * WHY THIS EXISTS
 * axe.spec.ts audits every route in the state it first renders in. That is
 * the state a reader is in for the shortest time and the one least likely to
 * be broken. The states worth auditing are the ones a page enters after
 * someone does something: a form that has just rejected what they typed, a
 * menu they have just opened, a search that has just returned results. Those
 * are exactly the moments a screen reader user most needs the page to be
 * correct, and none of them were being checked.
 *
 * SAFETY
 * The lost and found journeys are only ever taken as far as an EMPTY question
 * page. Pressing "Start now" saves an encrypted, two hour draft (not a case),
 * and an empty "Continue" is rejected before anything else is written. Do not
 * change these tests to answer the questions and send the report: that would
 * create a real case and a draft listing in the real database on every run.
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { LOCALES, localePath, type Locale } from "../../lib/i18n/config";
import { UI } from "../../lib/i18n/strings";
import { formatViolations } from "./support/axe-report";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function auditCurrentState(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations, formatViolations(label, results.violations)).toEqual([]);
}

for (const locale of LOCALES as readonly Locale[]) {
  test(`axe state: ${locale} lost report question page after a rejected answer`, async ({ page }) => {
    await page.goto(localePath(locale, "/lost-and-found/report"));
    await page.getByRole("button", { name: UI.lfpStartNow[locale], exact: true }).click();
    await expect(page).toHaveURL(/\/lost-and-found\/report\/category$/);

    // The first question, unanswered. The server rejects it and comes back with an error summary.
    await page.getByRole("button", { name: UI.lfpContinue[locale], exact: true }).click();

    /*
     * The error summary is the state under test, so it is asserted before the
     * audit rather than after. Without this the test would pass on a page
     * that never entered the state at all, which is the usual way a
     * state-based accessibility test quietly stops testing anything. The link
     * count pins that it lists a real field error rather than an empty shell.
     */
    const summary = page.getByRole("heading", { name: UI.errorSummaryTitle[locale] });
    await expect(summary).toBeVisible({ timeout: 15_000 });
    const summaryPanel = page.locator("div", { has: summary }).last();
    expect(await summaryPanel.getByRole("link").count()).toBeGreaterThan(0);

    await auditCurrentState(page, `${locale} /lost-and-found/report/category (error state)`);
  });

  test(`axe state: ${locale} search results`, async ({ page }) => {
    // A query that matches the seeded shuttle routes in either language.
    await page.goto(`${localePath(locale, "/search")}?q=shuttle`);
    await auditCurrentState(page, `${locale} /search?q=shuttle (results)`);
  });

  test(`axe state: ${locale} search with no matches`, async ({ page }) => {
    await page.goto(`${localePath(locale, "/search")}?q=zzzznomatchzzzz`);
    await auditCurrentState(page, `${locale} /search (no results)`);
  });

  test(`axe state: ${locale} lost and found list filtered`, async ({ page }) => {
    await page.goto(`${localePath(locale, "/lost-and-found")}?kind=found&status=open`);
    await auditCurrentState(page, `${locale} /lost-and-found (filtered)`);
  });
}

/**
 * The mobile menu, open. Pinned to a narrow viewport rather than relying on
 * the project's own size, because the trigger only exists below the header's
 * breakpoint and this state does not exist at all on a wide screen.
 */
test.describe("mobile menu", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const locale of LOCALES as readonly Locale[]) {
    test(`axe state: ${locale} mobile menu open`, async ({ page }) => {
      await page.goto(localePath(locale, "/"));

      /*
       * Targeted as `details > summary`, not by role.
       *
       * SiteHeader builds the menu as a `<details>` disclosure on purpose, so
       * it opens and closes with no JavaScript. A `<summary>` does not expose
       * a button role (browsers map it to a generic or a group), so a
       * `getByRole("button")` query never matches it. Worse, on the dev
       * server such a query silently matched a button inside Next's own
       * `nextjs-portal` dev overlay instead, and this test passed while
       * auditing a menu it had never opened.
       */
      const details = page.locator("details").first();
      await details.locator("summary").click();
      await expect(details).toHaveAttribute("open", "");

      await auditCurrentState(page, `${locale} mobile menu open`);
    });
  }
});
