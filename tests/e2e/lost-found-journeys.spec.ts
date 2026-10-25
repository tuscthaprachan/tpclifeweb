/**
 * The public lost and found journeys with JavaScript switched off. Every
 * question page is a plain form that posts to a Server Action and redirects,
 * so nothing here can pass by accident of React hydration.
 *
 * What runs by default stops short of creating anything but an encrypted,
 * short lived draft: the journeys are answered up to "check your answers".
 * The end-to-end submission (case, private link, tracking, withdrawing)
 * creates a real case and a draft listing, so it only runs when you ask:
 *
 *   LF_E2E_SUBMIT=1 npx playwright test --config=tests/playwright.config.ts e2e/lost-found-journeys
 *
 * against a build with DATABASE_URL=pglite:memory (never a real database).
 * Desktop project only: this is about mechanism, not layout.
 */

import { expect, test } from "@playwright/test";
import { LOCALES, localePath, type Locale } from "../../lib/i18n/config";
import { UI } from "../../lib/i18n/strings";
import { answerFoundReport, answerLostReport, start } from "../a11y/support/lost-found-journey";

test.use({ javaScriptEnabled: false });

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Mechanism check, not a layout check.");
});

const SUBMIT = process.env.LF_E2E_SUBMIT === "1";

for (const locale of LOCALES as readonly Locale[]) {
  test(`${locale}: a lost report can be answered page by page and checked, with no JavaScript`, async ({ page }) => {
    await answerLostReport(page, locale);

    const main = page.locator("main");
    await expect(main.getByRole("heading", { level: 1, name: UI.lfpCheckTitleReport[locale] })).toBeVisible();
    await expect(main.getByText("Blue umbrella", { exact: true })).toBeVisible();
    await expect(main.getByText("Initials ST in marker on the handle")).toBeVisible();
    await expect(main.getByText("somchai.tester@example.com")).toBeVisible();
    // The private detail is labelled as private, and no answer is in the address.
    await expect(main.getByText(UI.lfpPrivateNote[locale])).toBeVisible();
    expect(page.url()).not.toContain("Blue");
    expect(page.url()).not.toContain("somchai");
    await expect(main.getByRole("button", { name: UI.lfpSendReport[locale], exact: true })).toBeVisible();
  });

  test(`${locale}: Change goes back to the question and returns to check your answers`, async ({ page }) => {
    await answerLostReport(page, locale);
    await page.locator("main").getByRole("link", { name: new RegExp(`^${UI.lfpChange[locale]}.*${UI.lfpTitleLabel[locale]}`) }).click();
    await expect(page).toHaveURL(/\/describe\?from=check$/);
    await expect(page.getByLabel(UI.lfpTitleLabel[locale], { exact: true })).toHaveValue("Blue umbrella");

    await page.getByLabel(UI.lfpTitleLabel[locale], { exact: true }).fill("Green umbrella");
    await page.getByRole("button", { name: UI.lfpSaveAndCheck[locale], exact: true }).click();
    await expect(page).toHaveURL(/\/check$/);
    await expect(page.locator("main").getByText("Green umbrella", { exact: true })).toBeVisible();
  });

  test(`${locale}: a rejected answer comes back with an error summary and an inline error`, async ({ page }) => {
    await start(page, locale, "/lost-and-found/report");
    await page.getByRole("button", { name: UI.lfpContinue[locale], exact: true }).click();

    const summary = page.getByRole("heading", { name: UI.errorSummaryTitle[locale] });
    await expect(summary).toBeVisible();
    await expect(page).toHaveURL(/\/category$/);
    await expect(page.locator("main").getByRole("link", { name: UI.lfpErrCategory[locale] })).toBeVisible();
    await expect(page.locator("main p").filter({ hasText: UI.lfpErrCategory[locale] }).first()).toBeVisible();
    // The error is shown once: a reload does not repeat it.
    await page.reload();
    await expect(page.getByRole("heading", { name: UI.errorSummaryTitle[locale] })).toHaveCount(0);
  });

  test(`${locale}: a found report can be answered with no contact details and checked`, async ({ page }) => {
    await answerFoundReport(page, locale);
    const main = page.locator("main");
    await expect(main.getByText("Black wallet", { exact: true })).toBeVisible();
    await expect(main.getByText(UI.lfpWhereNowHandIn[locale])).toBeVisible();
    await expect(main.getByText(UI.lfpNotGiven[locale])).toBeVisible();
  });

  test(`${locale}: the start pages link to the privacy notice and the privacy notice reads`, async ({ page }) => {
    for (const path of ["/lost-and-found/report", "/lost-and-found/found", "/lost-and-found/track"]) {
      await page.goto(localePath(locale, path));
      await expect(page.locator("main").getByRole("link", { name: UI.lfpPrivacyLink[locale] })).toBeVisible();
    }
    await page.locator("main").getByRole("link", { name: UI.lfpPrivacyLink[locale] }).click();
    await expect(page).toHaveURL(new RegExp(`${localePath(locale, "/lost-and-found/privacy")}$`));
    await expect(page.locator("h1")).toBeVisible();
  });

  test(`${locale}: tracking with wrong details gives one generic message`, async ({ page }) => {
    await page.goto(localePath(locale, "/lost-and-found/track"));
    await page.getByLabel(UI.lfpTrackRefLabel[locale], { exact: true }).fill("LF-2026-0001");
    await page.getByLabel(UI.lfpTrackLinkLabel[locale], { exact: true }).fill("a".repeat(43));
    await page.getByRole("button", { name: UI.lfpTrackSubmit[locale], exact: true }).click();
    await expect(page).toHaveURL(/\/track\?problem=1$/);
    await expect(page.locator("main").getByRole("link", { name: UI.lfpTrackProblem[locale] })).toBeVisible();
  });

  test(`${locale}: the status page without a cookie sends you to the track form`, async ({ page }) => {
    await page.goto(localePath(locale, "/lost-and-found/track/status"));
    await expect(page).toHaveURL(new RegExp(`${localePath(locale, "/lost-and-found/track")}$`));
  });

  test(`${locale}: the private link route does not reveal why it failed`, async ({ request }) => {
    const res = await request.get(`${localePath(locale, "/lost-and-found/track/link")}?ref=LF-2026-0001&t=${"a".repeat(43)}`, { maxRedirects: 0 });
    expect(res.status()).toBe(303);
    expect(res.headers()["location"]).toMatch(/\/track\?problem=1$/);
    expect(res.headers()["cache-control"]).toContain("no-store");
  });

  test(`${locale}: claiming an item that does not exist is a 404`, async ({ page }) => {
    const res = await page.goto(localePath(locale, "/lost-and-found/lf-1999-0001/claim"));
    expect(res?.status()).toBe(404);
  });

  test(`${locale}: a lost report can be sent, tracked from the private link and withdrawn`, async ({ page }) => {
    test.skip(!SUBMIT, "Creates a real case and draft listing. Set LF_E2E_SUBMIT=1 against a throwaway database.");
    await answerLostReport(page, locale);
    // A person takes more than a few seconds; the server refuses an instant post.
    await page.waitForTimeout(3500);
    await page.locator("main").getByRole("button", { name: UI.lfpSendReport[locale], exact: true }).click();

    await expect(page).toHaveURL(/\/confirmation$/);
    const main = page.locator("main");
    await expect(main.getByRole("heading", { level: 1, name: UI.reportReceivedTitle[locale] })).toBeVisible();
    // The private link stays on this page for a short time, and the page says so (it does not claim to show it only once).
    await expect(main.getByText(UI.lfpKeepLinkWarning[locale])).toBeVisible();
    const reference = (await main.getByText(/^LF-\d{4}-\d{4,}$/).first().textContent()) ?? "";
    expect(reference).toMatch(/^LF-\d{4}-\d{4,}$/);
    const link = await main.getByRole("link", { name: /\/lost-and-found\/track\/link\?ref=/ }).getAttribute("href");
    expect(link).toContain(reference);

    // Opening the link swaps the token for a cookie: the status page has a clean address.
    await page.goto(link!);
    await expect(page).toHaveURL(new RegExp(`${localePath(locale, "/lost-and-found/track/status")}$`));
    expect(page.url()).not.toContain("t=");
    await expect(page.locator("main").getByText(reference)).toBeVisible();
    await expect(page.locator("main").getByText(UI.lfpProgress[locale])).toBeVisible();

    await page.locator("main").getByRole("link", { name: UI.lfpWithdrawLink[locale] }).click();
    await page.getByRole("button", { name: UI.lfpWithdrawYes[locale], exact: true }).click();
    await expect(page).toHaveURL(/\/status\?withdrawn=1$/);
    await expect(page.locator("main").getByText(UI.lfpWithdrawnBanner[locale])).toBeVisible();
  });
}
