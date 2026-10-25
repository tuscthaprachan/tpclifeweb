/**
 * The public complaint journey with JavaScript switched off. Every question page
 * is a plain form that posts to a Server Action and redirects, so nothing here
 * can pass by accident of React hydration.
 *
 * What runs by default stops short of creating anything but an encrypted, short
 * lived draft: the journey is answered up to "check your answers". The
 * end-to-end submission (complaint, private link, tracking, withdrawing) creates
 * a real complaint, so it only runs when you ask:
 *
 *   CP_E2E_SUBMIT=1 npx playwright test --config=tests/playwright.config.ts e2e/complaints-journeys
 *
 * against a build with a throwaway database (never a real one). Desktop project
 * only: this is about mechanism, not layout.
 */

import { expect, test } from "@playwright/test";
import { LOCALES, localePath, type Locale } from "../../lib/i18n/config";
import { UI } from "../../lib/i18n/strings";
import { answerComplaint, start } from "../a11y/support/complaint-journey";

test.use({ javaScriptEnabled: false });

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Mechanism check, not a layout check.");
});

const SUBMIT = process.env.CP_E2E_SUBMIT === "1";

for (const locale of LOCALES as readonly Locale[]) {
  test(`${locale}: the start page puts the emergency route first and links the privacy notice`, async ({ page }) => {
    await page.goto(localePath(locale, "/complaints"));
    const main = page.locator("main");
    await expect(main.getByRole("heading", { level: 1, name: UI.cpServiceName[locale] })).toBeVisible();
    await expect(main.getByRole("heading", { name: UI.cpEmergencyTitle[locale] })).toBeVisible();
    await expect(main.getByRole("link", { name: UI.cpEmergencyRoute[locale] })).toHaveAttribute("href", localePath(locale, "/report"));
    await expect(main.getByRole("link", { name: "191", exact: true })).toHaveAttribute("href", "tel:191");
    await expect(main.getByRole("link", { name: UI.cpPrivacyLink[locale] })).toBeVisible();
    // The emergency box comes before the Start button.
    const order = await main.evaluate((el) => {
      const html = el.innerHTML;
      return html.indexOf("cp-emergency") < html.indexOf("<button");
    });
    expect(order).toBe(true);
    await main.getByRole("link", { name: UI.cpPrivacyLink[locale] }).click();
    await expect(page.locator("h1")).toBeVisible();
  });

  test(`${locale}: a named complaint can be answered page by page and checked, with no JavaScript`, async ({ page }) => {
    await answerComplaint(page, locale);
    const main = page.locator("main");
    await expect(main.getByRole("heading", { level: 1, name: UI.cpCheckTitle[locale] })).toBeVisible();
    await expect(main.getByText("The tap in room 301 has leaked for a week")).toBeVisible();
    await expect(main.getByText("somchai.tester@example.com")).toBeVisible();
    expect(page.url()).not.toContain("tap");
    expect(page.url()).not.toContain("somchai");
    await expect(main.getByRole("button", { name: UI.cpSend[locale], exact: true })).toBeVisible();
  });

  test(`${locale}: an anonymous complaint has no contact page and says it holds nothing`, async ({ page }) => {
    await answerComplaint(page, locale, { identity: "anonymous" });
    const main = page.locator("main");
    await expect(main.getByText(UI.cpCheckAnonymous[locale])).toBeVisible();
    await expect(main.getByText("somchai.tester@example.com")).toHaveCount(0);
    await page.goto(localePath(locale, "/complaints/contact"));
    await expect(page).toHaveURL(/\/complaints\/check$/);
  });

  test(`${locale}: Change goes back to the question and returns to check your answers`, async ({ page }) => {
    await answerComplaint(page, locale);
    await page.locator("main").getByRole("link", { name: new RegExp(`^${UI.cpChange[locale]}.*${UI.cpDescriptionLabel[locale]}`) }).click();
    await expect(page).toHaveURL(/\/describe\?from=check$/);
    await page.getByLabel(UI.cpDescriptionLabel[locale], { exact: true }).fill("The sink has leaked for a month");
    await page.getByRole("button", { name: UI.cpSaveAndCheck[locale], exact: true }).click();
    await expect(page).toHaveURL(/\/check$/);
    await expect(page.locator("main").getByText("The sink has leaked for a month")).toBeVisible();
  });

  test(`${locale}: a rejected answer comes back with an error summary and an inline error, once`, async ({ page }) => {
    await start(page, locale);
    await page.getByRole("button", { name: UI.cpContinue[locale], exact: true }).click();
    await expect(page.getByRole("heading", { name: UI.errorSummaryTitle[locale] })).toBeVisible();
    await expect(page).toHaveURL(/\/identity$/);
    await expect(page.locator("main").getByRole("link", { name: UI.cpErrIdentity[locale] })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: UI.errorSummaryTitle[locale] })).toHaveCount(0);
  });

  test(`${locale}: without file storage the evidence step says so and can be skipped`, async ({ page }) => {
    await answerComplaint(page, locale);
    await page.locator("main").getByRole("link", { name: new RegExp(`^${UI.cpChange[locale]}.*${UI.cpRowEvidence[locale]}`) }).click();
    await expect(page).toHaveURL(/\/evidence\?from=check$/);
    const unavailable = page.getByText(UI.cpEvidenceUnavailableTitle[locale]);
    // Storage may be configured in some environments; either way the step can be left without a file.
    if (await unavailable.count()) await expect(unavailable).toBeVisible();
    await page.getByRole("button", { name: UI.cpSaveAndCheck[locale], exact: true }).click();
    await expect(page).toHaveURL(/\/check$/);
  });

  test(`${locale}: tracking with wrong details gives one generic message`, async ({ page }) => {
    await page.goto(localePath(locale, "/complaints/track"));
    await page.getByLabel(UI.cpTrackRefLabel[locale], { exact: true }).fill("CP-2026-0001");
    await page.getByLabel(UI.cpTrackLinkLabel[locale], { exact: true }).fill("a".repeat(43));
    await page.getByRole("button", { name: UI.cpTrackSubmit[locale], exact: true }).click();
    await expect(page).toHaveURL(/\/track\?problem=1$/);
    await expect(page.locator("main").getByRole("link", { name: UI.cpTrackProblem[locale] })).toBeVisible();
  });

  test(`${locale}: the status, withdraw, reopen and survey pages without a cookie send you to the track form`, async ({ page }) => {
    for (const path of ["status", "withdraw", "reopen", "survey"]) {
      await page.goto(localePath(locale, `/complaints/track/${path}`));
      await expect(page).toHaveURL(new RegExp(`${localePath(locale, "/complaints/track")}$`));
    }
  });

  test(`${locale}: the private link route does not reveal why it failed`, async ({ request }) => {
    const res = await request.get(`${localePath(locale, "/complaints/track/link")}?ref=CP-2026-0001&t=${"a".repeat(43)}`, { maxRedirects: 0 });
    expect(res.status()).toBe(303);
    expect(res.headers()["location"]).toMatch(/\/track\?problem=1$/);
    expect(res.headers()["cache-control"]).toContain("no-store");
  });

  test(`${locale}: a complaint can be sent, tracked from the private link, answered and withdrawn`, async ({ page }) => {
    test.skip(!SUBMIT, "Creates a real complaint. Set CP_E2E_SUBMIT=1 against a throwaway database.");
    await answerComplaint(page, locale);
    // A person takes more than a few seconds; the server refuses an instant post.
    await page.waitForTimeout(3500);
    await page.locator("main").getByRole("button", { name: UI.cpSend[locale], exact: true }).click();

    await expect(page).toHaveURL(/\/confirmation$/);
    const main = page.locator("main");
    await expect(main.getByRole("heading", { level: 1, name: UI.cpDoneTitle[locale] })).toBeVisible();
    const reference = (await main.getByText(/^CP-\d{4}-\d{4,}$/).first().textContent()) ?? "";
    expect(reference).toMatch(/^CP-\d{4}-\d{4,}$/);
    const link = await main.getByRole("link", { name: /\/complaints\/track\/link\?ref=/ }).getAttribute("href");
    expect(link).toContain(reference);
    await expect(main.getByRole("heading", { name: UI.cpWhatNext[locale] })).toBeVisible();

    // Opening the link swaps the token for a cookie: the status page has a clean address.
    await page.goto(link!);
    await expect(page).toHaveURL(new RegExp(`${localePath(locale, "/complaints/track/status")}$`));
    expect(page.url()).not.toContain("t=");
    await expect(page.locator("main").getByText(reference)).toBeVisible();
    await expect(page.locator("main").getByText(UI.cpProgress[locale])).toBeVisible();

    await page.locator("main").getByRole("link", { name: UI.cpWithdrawLink[locale] }).click();
    await page.getByRole("button", { name: UI.cpWithdrawYes[locale], exact: true }).click();
    await expect(page).toHaveURL(/\/status\?withdrawn=1$/);
    await expect(page.locator("main").getByText(UI.cpWithdrawnBanner[locale])).toBeVisible();
  });
}
