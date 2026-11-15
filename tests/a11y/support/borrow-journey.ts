/**
 * Walks the public equipment borrowing journey one question page at a time,
 * for the accessibility and no-JavaScript specs. `answerBorrowRequest` stops
 * on "check your answers"; `sendRequest` presses the one button that creates a
 * real loan request, so only a spec running against a throwaway database
 * (DATABASE_URL=pglite:memory) may call it.
 *
 * `onPage` is called once per page with the step name ("start" for the start
 * page), after the page has loaded and before it is answered, which is where a
 * spec audits it.
 *
 * The request is for two table tennis balls (20 are seeded), collected and
 * returned on the same desk day two weeks ahead, so repeated runs on one
 * database do not run out of stock.
 */

import { expect, type Page } from "@playwright/test";
import { localePath, type Locale } from "../../../lib/i18n/config";
import { UI } from "../../../lib/i18n/strings";

export type OnPage = (step: string) => Promise<void>;
export type Borrower = "student" | "visitor";

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

/** The first Monday to Friday on or after `ahead` days from now, as Bangkok day, month and year (Common Era). */
export function deskDay(ahead = 14): { day: string; month: string; year: string } {
  const at = new Date(Date.now() + ahead * 24 * 60 * 60 * 1000 + BANGKOK_OFFSET_MS);
  while (at.getUTCDay() === 0 || at.getUTCDay() === 6) at.setUTCDate(at.getUTCDate() + 1);
  return { day: String(at.getUTCDate()), month: String(at.getUTCMonth() + 1), year: String(at.getUTCFullYear()) };
}

/** The checkbox name of the item the journey borrows. */
export const ITEM_NAME: Record<Locale, RegExp> = { en: /^Table tennis ball/, th: /^ลูกปิงปอง/ };

export const escapeRe = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function next(page: Page, step: string, onPage?: OnPage) {
  await expect(page).toHaveURL(new RegExp(`/${step}(\\?.*)?$`));
  // After a client side navigation the title is briefly empty while the page's metadata streams in.
  await expect(page).toHaveTitle(/.+/);
  await onPage?.(step);
}

export async function carryOn(page: Page, locale: Locale) {
  await page.getByRole("button", { name: UI.brContinue[locale], exact: true }).click();
}

/** Opens the start page and presses "Start now". The start page is audited first when `onPage` is given. */
export async function start(page: Page, locale: Locale, onPage?: OnPage) {
  await page.goto(localePath(locale, "/borrow"));
  await expect(page).toHaveTitle(/.+/);
  await onPage?.("start");
  await page.getByRole("button", { name: UI.brStartNow[locale], exact: true }).click();
}

export async function answerDates(page: Page) {
  const { day, month, year } = deskDay(14 + Math.floor(Math.random() * 60));
  for (const id of ["collect", "return"]) {
    await page.locator(`#${id}-day`).fill(day);
    await page.locator(`#${id}-month`).fill(month);
    await page.locator(`#${id}-year`).fill(year);
  }
  await page.locator("#collectTime").selectOption("10:00");
  await page.locator("#returnTime").selectOption("16:00");
}

/** Answers every question and leaves "check your answers" open. */
export async function answerBorrowRequest(page: Page, locale: Locale, who: Borrower = "visitor", onPage?: OnPage) {
  await start(page, locale, onPage);
  await next(page, "dates", onPage);
  await answerDates(page);
  await carryOn(page, locale);

  await next(page, "items", onPage);
  await page.getByRole("checkbox", { name: ITEM_NAME[locale] }).check();
  await carryOn(page, locale);

  await next(page, "quantities", onPage);
  await page.locator('input[id^="qty-"]').fill("1");
  await carryOn(page, locale);

  await next(page, "event", onPage);
  await page.getByLabel(UI.brEventName[locale], { exact: true }).fill("Freshers sports day");
  await page.getByLabel(UI.brVenue[locale], { exact: true }).fill("Main field");
  await page.getByLabel(UI.brPurpose[locale], { exact: true }).fill("A table tennis tournament for new students");
  await carryOn(page, locale);

  await next(page, "group", onPage);
  await page.locator('input[name="borrower"][value="group"]').check();
  await page.getByLabel(UI.brGroupName[locale], { exact: true }).fill("Table Tennis Club");
  await carryOn(page, locale);

  await next(page, "student", onPage);
  await page.locator(`input[name="student"][value="${who === "student" ? "yes" : "no"}"]`).check();
  await carryOn(page, locale);

  await next(page, "details", onPage);
  await page.getByLabel(UI.brName[locale], { exact: true }).fill("Somchai Tester");
  if (who === "student") {
    await page.getByLabel(UI.brStudentId[locale]).fill("6512345678");
    await page.locator("#faculty").selectOption({ index: 1 });
  } else {
    await page.getByLabel(UI.brAffiliation[locale]).fill("Example Club");
  }
  await carryOn(page, locale);

  await next(page, "contact", onPage);
  await page.getByLabel(UI.brPhone[locale]).fill("081 234 5678");
  await page.getByLabel(UI.brEmailOptional[locale]).fill("somchai.tester@example.com");
  await carryOn(page, locale);

  await next(page, "terms", onPage);
  await page.locator('input[name="terms"][value="yes"]').check();
  await carryOn(page, locale);

  await next(page, "check", onPage);
}

/** Presses "Send request" on the check page and waits for the confirmation. Waits out the minimum time a person takes. */
export async function sendRequest(page: Page, locale: Locale, onPage?: OnPage) {
  // A person takes more than a few seconds; the server refuses an instant post.
  await page.waitForTimeout(3500);
  await page.locator("main").getByRole("button", { name: UI.brSend[locale], exact: true }).click();
  await next(page, "confirmation", onPage);
}

/** The reference and the private link path (with its query) on the confirmation page. */
export async function readConfirmation(page: Page) {
  const main = page.locator("main");
  const reference = ((await main.getByText(/^[A-Z]{2,5}-\d{4}-\d{3,}$/).first().textContent()) ?? "").trim();
  const href = await main.locator('a[href*="/borrow/track/link?"]').first().getAttribute("href");
  const url = new URL(href!, page.url());
  return { reference, link: href!, linkPath: url.pathname + url.search };
}
