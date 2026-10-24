/**
 * Walks the public lost and found journeys one question page at a time, for
 * the accessibility and no-JavaScript specs. It never presses the final
 * "Accept and send" button: that creates a real case and a draft listing, so
 * only the specs that opt in (LF_E2E_SUBMIT=1) do that themselves.
 *
 * `onPage` is called once per page with the step name, after the page has
 * loaded and before it is answered, which is where a spec audits it.
 */

import { expect, type Page } from "@playwright/test";
import { localePath, type Locale } from "../../../lib/i18n/config";
import { UI } from "../../../lib/i18n/strings";

export type OnPage = (step: string) => Promise<void>;

async function next(page: Page, step: string, onPage?: OnPage) {
  await expect(page).toHaveURL(new RegExp(`/${step}(\\?.*)?$`));
  await onPage?.(step);
}

async function carryOn(page: Page, locale: Locale) {
  await page.getByRole("button", { name: UI.lfpContinue[locale], exact: true }).click();
}

export async function start(page: Page, locale: Locale, path: string) {
  await page.goto(localePath(locale, path));
  await page.getByRole("button", { name: UI.lfpStartNow[locale], exact: true }).click();
}

async function answerWhen(page: Page, locale: Locale) {
  await page.getByLabel(UI.day[locale], { exact: true }).fill("2");
  await page.getByLabel(UI.month[locale], { exact: true }).fill("1");
  await page.getByLabel(UI.year[locale], { exact: true }).fill("2025");
}

async function answerContact(page: Page, locale: Locale) {
  await page.getByLabel(UI.lfpNameLabel[locale], { exact: true }).fill("Somchai Tester");
  await page.getByLabel(UI.lfpEmailLabel[locale], { exact: true }).fill("somchai.tester@example.com");
  await page.getByLabel(UI.lfpConsentReport[locale]).check();
}

/** Answers the lost report up to the check your answers page, which it leaves open. */
export async function answerLostReport(page: Page, locale: Locale, onPage?: OnPage) {
  await start(page, locale, "/lost-and-found/report");
  await next(page, "category", onPage);
  await page.getByLabel(UI.lostFoundCategoryUmbrella[locale], { exact: true }).check();
  await carryOn(page, locale);

  await next(page, "describe", onPage);
  await page.getByLabel(UI.lfpTitleLabel[locale], { exact: true }).fill("Blue umbrella");
  await page.getByLabel(UI.lfpDescriptionLabel[locale], { exact: true }).fill("Folding umbrella with a bent rib");
  await carryOn(page, locale);

  await next(page, "where", onPage);
  await page.getByLabel(UI.lfpPlaceNoteLabel[locale], { exact: true }).fill("Near the library steps");
  await carryOn(page, locale);

  await next(page, "when", onPage);
  await answerWhen(page, locale);
  await carryOn(page, locale);

  await next(page, "detail", onPage);
  await page.getByLabel(UI.lfpDetailLabel[locale], { exact: true }).fill("Initials ST in marker on the handle");
  await carryOn(page, locale);

  await next(page, "contact", onPage);
  await answerContact(page, locale);
  await carryOn(page, locale);

  await next(page, "check", onPage);
}

/** Answers the found report up to the check your answers page, which it leaves open. */
export async function answerFoundReport(page: Page, locale: Locale, onPage?: OnPage) {
  await start(page, locale, "/lost-and-found/found");
  await next(page, "category", onPage);
  await page.getByLabel(UI.lostFoundCategoryWallet[locale], { exact: true }).check();
  await carryOn(page, locale);

  await next(page, "describe", onPage);
  await page.getByLabel(UI.lfpTitleLabel[locale], { exact: true }).fill("Black wallet");
  await page.getByLabel(UI.lfpDescriptionLabel[locale], { exact: true }).fill("Leather, black");
  await carryOn(page, locale);

  await next(page, "where", onPage);
  await page.getByLabel(UI.lfpPlaceNoteLabel[locale], { exact: true }).fill("Canteen, table by the window");
  await carryOn(page, locale);

  await next(page, "when", onPage);
  await answerWhen(page, locale);
  await carryOn(page, locale);

  await next(page, "now", onPage);
  await page.getByLabel(UI.lfpWhereNowHandIn[locale], { exact: true }).check();
  await carryOn(page, locale);

  // Optional for a finder: leave the contact page empty.
  await next(page, "contact", onPage);
  await carryOn(page, locale);

  await next(page, "check", onPage);
}
