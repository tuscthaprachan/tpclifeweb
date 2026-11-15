/**
 * Zero axe-core violations on the start page and every question page of the
 * equipment borrowing journey, in both languages and every project (mobile,
 * desktop, 320px reflow, dark). The journey is walked with real answers, once
 * as a visitor and once as a Thammasat student (the details page asks
 * different questions), up to "check your answers".
 *
 * Two further pages need a request to exist: the confirmation with its
 * private link, and the tracking status and cancel pages. They are audited
 * once per locale after a real send, which creates a loan request, so they run
 * only against a throwaway database (DATABASE_URL=pglite:memory) and are
 * skipped when BR_AXE_SUBMIT=0.
 *
 * The track page and privacy notice are plain routes and are audited by
 * axe.spec.ts with the others.
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { LOCALES, localePath, type Locale } from "../../lib/i18n/config";
import { UI } from "../../lib/i18n/strings";
import { formatViolations } from "./support/axe-report";
import { answerBorrowRequest, carryOn, readConfirmation, sendRequest, start } from "./support/borrow-journey";
import { perTestClientIp } from "./support/client-ip";

test.use(perTestClientIp);

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const SUBMIT = process.env.BR_AXE_SUBMIT !== "0";

function audit(page: Page, label: string) {
  return async (step: string) => {
    await page.evaluate(() => window.scrollTo(0, 0));
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations, formatViolations(`${label} ${step}`, results.violations)).toEqual([]);
  };
}

for (const locale of LOCALES as readonly Locale[]) {
  test(`axe journey: ${locale} borrow request, every page, as a visitor`, async ({ page }) => {
    await answerBorrowRequest(page, locale, "visitor", audit(page, `${locale} borrow visitor`));
  });

  test(`axe journey: ${locale} borrow request, every page, as a student`, async ({ page }) => {
    await answerBorrowRequest(page, locale, "student", audit(page, `${locale} borrow student`));
  });

  test(`axe journey: ${locale} borrow, a rejected answer with its error summary`, async ({ page }) => {
    const check = audit(page, `${locale} borrow errors`);
    await start(page, locale);
    await expect(page).toHaveURL(/\/dates$/);
    await carryOn(page, locale);
    await expect(page.getByRole("heading", { name: UI.errorSummaryTitle[locale] })).toBeVisible();
    await check("dates with errors");
  });

  test(`axe journey: ${locale} borrow, confirmation, status and cancel pages`, async ({ page }) => {
    test.skip(!SUBMIT, "Creates a real loan request. Needs a throwaway database.");
    const check = audit(page, `${locale} borrow sent`);
    await answerBorrowRequest(page, locale, "visitor");
    await sendRequest(page, locale, check);

    const { linkPath } = await readConfirmation(page);
    await page.goto(linkPath);
    await expect(page).toHaveURL(new RegExp(`${localePath(locale, "/borrow/track/status")}$`));
    await expect(page).toHaveTitle(/.+/);
    await check("status");

    await page.locator("main").getByRole("link", { name: UI.brCancelLink[locale] }).click();
    await expect(page).toHaveURL(/\/track\/cancel$/);
    await expect(page).toHaveTitle(/.+/);
    await check("cancel");

    await page.getByRole("button", { name: UI.brCancelYes[locale], exact: true }).click();
    await expect(page).toHaveURL(/\/track\/status\?cancelled=1$/);
    await check("status cancelled");
  });
}
