/**
 * The public equipment borrowing journey with JavaScript switched off. Every
 * question page is a plain form that posts to a Server Action and redirects,
 * so nothing here can pass by accident of React hydration.
 *
 * Sending the request creates a real loan request, so the end-to-end tests
 * need a throwaway database (a build started with DATABASE_URL=pglite:memory,
 * never a real one):
 *
 *   npx playwright test --config=tests/playwright.config.ts --project=desktop e2e/borrow-journey
 *
 * Desktop project only: this is about mechanism, not layout.
 */

import { expect, test } from "@playwright/test";
import { LOCALES, localePath, type Locale } from "../../lib/i18n/config";
import { UI } from "../../lib/i18n/strings";
import { answerBorrowRequest, carryOn, escapeRe, readConfirmation, sendRequest, start } from "../a11y/support/borrow-journey";
import { perTestClientIp } from "../a11y/support/client-ip";

test.use(perTestClientIp);

test.use({ javaScriptEnabled: false });

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Mechanism check, not a layout check.");
});

for (const locale of LOCALES as readonly Locale[]) {
  test(`${locale}: the start page says what can be borrowed and links the privacy notice and tracking`, async ({ page }) => {
    await page.goto(localePath(locale, "/borrow"));
    const main = page.locator("main");
    await expect(main.getByRole("heading", { level: 1, name: UI.brServiceName[locale] })).toBeVisible();
    await expect(main.getByRole("heading", { name: UI.brCanBorrow[locale] })).toBeVisible();
    await expect(main.getByRole("button", { name: UI.brStartNow[locale], exact: true })).toBeVisible();
    await expect(main.getByRole("link", { name: UI.brPrivacyLink[locale] })).toBeVisible();
    await expect(main.getByRole("link", { name: UI.brTrackLink[locale] })).toBeVisible();
  });

  test(`${locale}: every question can be answered page by page and checked, with no JavaScript`, async ({ page }) => {
    await answerBorrowRequest(page, locale, "visitor");
    const main = page.locator("main");
    await expect(main.getByRole("heading", { level: 1, name: UI.brCheckTitle[locale] })).toBeVisible();
    await expect(main.getByText("Freshers sports day", { exact: true })).toBeVisible();
    await expect(main.getByText("Table Tennis Club", { exact: true })).toBeVisible();
    await expect(main.getByText("Somchai Tester", { exact: true })).toBeVisible();
    await expect(main.getByText("somchai.tester@example.com")).toBeVisible();
    // No answer is in the address.
    expect(page.url()).not.toContain("Somchai");
    expect(page.url()).not.toContain("Freshers");
    await expect(main.getByRole("button", { name: UI.brSend[locale], exact: true })).toBeVisible();
  });

  test(`${locale}: a Thammasat student answers a student number and faculty instead of an organisation`, async ({ page }) => {
    await answerBorrowRequest(page, locale, "student");
    const main = page.locator("main");
    await expect(main.getByText("6512345678", { exact: true })).toBeVisible();
    await expect(main.locator("dt").getByText(UI.brFaculty[locale], { exact: true })).toBeVisible();
    await expect(main.locator("dt").getByText(UI.brAffiliation[locale], { exact: true })).toHaveCount(0);
  });

  test(`${locale}: a rejected answer comes back with an error summary and an inline error`, async ({ page }) => {
    await start(page, locale);
    await expect(page).toHaveURL(/\/dates$/);
    await carryOn(page, locale);

    await expect(page.getByRole("heading", { name: UI.errorSummaryTitle[locale] })).toBeVisible();
    await expect(page).toHaveURL(/\/dates$/);
    await expect(page.locator("main").getByRole("link", { name: UI.brErrCollectMissing[locale] })).toBeVisible();
    await expect(page.locator("main p").filter({ hasText: UI.brErrCollectMissing[locale] }).first()).toBeVisible();
    // The error is shown once: a reload does not repeat it.
    await page.reload();
    await expect(page.getByRole("heading", { name: UI.errorSummaryTitle[locale] })).toHaveCount(0);
  });

  test(`${locale}: Change goes back to the question and returns to check your answers`, async ({ page }) => {
    await answerBorrowRequest(page, locale, "visitor");
    await page.locator("main").getByRole("link", { name: new RegExp(`^${escapeRe(UI.brChange[locale])}.*${escapeRe(UI.brEventName[locale])}`) }).click();
    await expect(page).toHaveURL(/\/event\?from=check$/);
    await expect(page.getByLabel(UI.brEventName[locale], { exact: true })).toHaveValue("Freshers sports day");

    await page.getByLabel(UI.brEventName[locale], { exact: true }).fill("Orientation sports day");
    await page.getByRole("button", { name: UI.brSaveAndCheck[locale], exact: true }).click();
    await expect(page).toHaveURL(/\/check$/);
    await expect(page.locator("main").getByText("Orientation sports day", { exact: true })).toBeVisible();
  });

  test(`${locale}: a page whose earlier question is unanswered sends you back to that question`, async ({ page }) => {
    await start(page, locale);
    await expect(page).toHaveURL(/\/dates$/);
    for (const step of ["event", "terms", "check"]) {
      await page.goto(localePath(locale, `/borrow/${step}`));
      await expect(page).toHaveURL(/\/dates$/);
    }
  });

  test(`${locale}: a question page with no draft sends you to the start page`, async ({ page }) => {
    await page.goto(localePath(locale, "/borrow/event"));
    await expect(page).toHaveURL(new RegExp(`${localePath(locale, "/borrow")}\\?expired=1$`));
    await expect(page.locator("main").getByText(UI.brExpiredTitle[locale])).toBeVisible();
  });

  test(`${locale}: an unknown step is a 404`, async ({ page }) => {
    const res = await page.goto(localePath(locale, "/borrow/nonsense"));
    expect(res?.status()).toBe(404);
  });

  test(`${locale}: tracking with wrong details gives one generic message`, async ({ page }) => {
    await page.goto(localePath(locale, "/borrow/track"));
    await page.getByLabel(UI.brTrackRefLabel[locale], { exact: true }).fill("BR-2026-0001");
    await page.getByLabel(UI.brTrackLinkLabel[locale], { exact: true }).fill("a".repeat(43));
    await page.getByRole("button", { name: UI.brTrackSubmit[locale], exact: true }).click();
    await expect(page).toHaveURL(/\/track\?problem=1$/);
    await expect(page.locator("main").getByRole("link", { name: UI.brTrackProblem[locale] })).toBeVisible();
  });

  test(`${locale}: the status page without a cookie sends you to the track form`, async ({ page }) => {
    await page.goto(localePath(locale, "/borrow/track/status"));
    await expect(page).toHaveURL(new RegExp(`${localePath(locale, "/borrow/track")}$`));
  });

  test(`${locale}: a request can be sent, tracked from the private link and cancelled, with no JavaScript`, async ({ page }) => {
    await answerBorrowRequest(page, locale, "visitor");
    await sendRequest(page, locale);

    const main = page.locator("main");
    await expect(main.getByRole("heading", { level: 1, name: UI.brDoneTitle[locale] })).toBeVisible();
    await expect(main.getByText(UI.brKeepLinkWarning[locale])).toBeVisible();
    const { reference, link, linkPath } = await readConfirmation(page);
    expect(reference).toMatch(/^[A-Z]{2,5}-\d{4}-\d{3,}$/);
    expect(link).toContain(reference);

    // Opening the link swaps the token for a cookie: the status page has a clean address.
    await page.goto(linkPath);
    await expect(page).toHaveURL(new RegExp(`${localePath(locale, "/borrow/track/status")}$`));
    expect(page.url()).not.toContain("t=");
    const status = page.locator("main");
    await expect(status.getByRole("heading", { level: 1, name: UI.brStatusTitle[locale] })).toBeVisible();
    await expect(status.getByText(reference, { exact: true })).toBeVisible();
    await expect(status.getByRole("heading", { name: UI.brProgress[locale] })).toBeVisible();

    // The reference and the pasted link work from the track form too, once the device has forgotten the request.
    await status.getByRole("button", { name: UI.brForgetThisDevice[locale], exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${localePath(locale, "/borrow/track")}$`));
    await page.getByLabel(UI.brTrackRefLabel[locale], { exact: true }).fill(reference);
    await page.getByLabel(UI.brTrackLinkLabel[locale], { exact: true }).fill(new URL(linkPath, page.url()).toString());
    await page.getByRole("button", { name: UI.brTrackSubmit[locale], exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${localePath(locale, "/borrow/track/status")}$`));

    // Keep: No leaves the request alone. Yes cancels it.
    await page.locator("main").getByRole("link", { name: UI.brCancelLink[locale] }).click();
    await expect(page.getByRole("heading", { level: 1, name: UI.brCancelTitle[locale] })).toBeVisible();
    await page.getByRole("link", { name: UI.brCancelNo[locale] }).click();
    await expect(page).toHaveURL(/\/track\/status$/);
    await page.locator("main").getByRole("link", { name: UI.brCancelLink[locale] }).click();
    await page.getByRole("button", { name: UI.brCancelYes[locale], exact: true }).click();
    await expect(page).toHaveURL(/\/track\/status\?cancelled=1$/);
    await expect(page.locator("main").getByText(UI.brCancelledBanner[locale])).toBeVisible();
    // Nothing is left to cancel.
    await expect(page.locator("main").getByRole("link", { name: UI.brCancelLink[locale] })).toHaveCount(0);
  });
}
