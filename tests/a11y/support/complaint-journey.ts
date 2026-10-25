/**
 * Walks the public complaint journey one question page at a time, for the
 * accessibility and no-JavaScript specs. It never presses the final "Accept and
 * send" button: that creates a real complaint, so only the specs that opt in
 * (CP_E2E_SUBMIT=1) do that themselves.
 *
 * `onPage` is called once per page with the step name, after the page has
 * loaded and before it is answered, which is where a spec audits it.
 */

import { expect, type Page } from "@playwright/test";
import { localePath, type Locale } from "../../../lib/i18n/config";
import { UI } from "../../../lib/i18n/strings";

export type OnPage = (step: string) => Promise<void>;
export type Identity = "named" | "pseudonymous" | "anonymous";

async function next(page: Page, step: string, onPage?: OnPage) {
  await expect(page).toHaveURL(new RegExp(`/${step}(\\?.*)?$`));
  // After a client side navigation the title is briefly empty while the page's metadata streams in.
  await expect(page).toHaveTitle(/.+/);
  await onPage?.(step);
}

export async function start(page: Page, locale: Locale) {
  await page.goto(localePath(locale, "/complaints"));
  await page.getByRole("button", { name: UI.cpStartNow[locale], exact: true }).click();
}

/** Answers the complaint up to the check your answers page, which it leaves open. */
export async function answerComplaint(page: Page, locale: Locale, opts: { identity?: Identity; category?: string; onPage?: OnPage } = {}) {
  const { identity = "named", onPage } = opts;
  const carryOn = (label: string) => page.getByRole("button", { name: label, exact: true }).click();

  await start(page, locale);
  await next(page, "identity", onPage);
  // Each option's label carries its hint, so pick the radio by value rather than by its full name.
  await page.locator(`input[name="identity"][value="${identity}"]`).check();
  await carryOn(UI.cpContinue[locale]);

  await next(page, "category", onPage);
  await page.getByRole("radio").first().check();
  await carryOn(UI.cpContinue[locale]);

  await next(page, "describe", onPage);
  await page.getByLabel(UI.cpDescriptionLabel[locale], { exact: true }).fill("The tap in room 301 has leaked for a week");
  await carryOn(UI.cpContinue[locale]);

  await next(page, "when", onPage);
  await page.getByLabel(UI.cpWhenLabel[locale], { exact: true }).fill("Last Tuesday afternoon");
  await page.getByLabel(UI.cpWhereLabel[locale], { exact: true }).fill("Room 301");
  await carryOn(UI.cpContinue[locale]);

  await next(page, "remedy", onPage);
  await page.getByLabel(UI.cpRemedyLabel[locale], { exact: true }).fill("Please repair it");
  await carryOn(UI.cpContinue[locale]);

  await next(page, "evidence", onPage);
  // Without file storage the step says so; with it, the same button reads "Continue".
  const without = page.getByRole("button", { name: UI.cpContinueWithout[locale], exact: true });
  if (await without.count()) await without.click();
  else await carryOn(UI.cpContinue[locale]);

  if (identity !== "anonymous") {
    await next(page, "contact", onPage);
    if (identity === "named") await page.getByLabel(UI.cpNameLabel[locale], { exact: true }).fill("Somchai Tester");
    await page.getByRole("textbox", { name: UI.cpEmailLabel[locale], exact: true }).fill("somchai.tester@example.com");
    await page.getByLabel(UI.cpConsent[locale]).check();
    await carryOn(UI.cpContinue[locale]);
  }

  await next(page, "check", onPage);
}
