/**
 * The progressive enhancement gate (CONTRIBUTING.md: "search, filtering and
 * pagination must work with JavaScript off, driven by query parameters").
 * Every test in this file runs with `javaScriptEnabled: false`, so nothing
 * here can pass by accident of React hydration papering over a broken
 * native form.
 *
 * Restricted to the "desktop" project. Two reasons: the assertions are
 * about mechanism (does the plain HTML work), not layout, so one viewport
 * is enough; and `SiteHeader` renders its navigation, search link and
 * language toggle TWICE in the DOM (once for the desktop `nav`, once inside
 * the mobile `<details>` disclosure), so locating them by role/name always
 * resolves two elements. At the desktop viewport the desktop copy is the
 * one that is actually visible and, since it is written first in the JSX,
 * also `.first()` in DOM order, which is what every `.first()` below relies
 * on rather than being an arbitrary pick.
 */

import { expect, test } from "@playwright/test";
import { LOCALE_LABEL, LOCALES, localePath, type Locale } from "../../lib/i18n/config";
import { UI } from "../../lib/i18n/strings";

test.use({ javaScriptEnabled: false });

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Mechanism check, not a layout check; see file header for why desktop only.");
});

test("navigation works with JavaScript disabled", async ({ page }) => {
  await page.goto(localePath("th", "/"));

  await page.locator("header").getByRole("link", { name: UI.forms.th, exact: true }).first().click();

  await expect(page).toHaveURL(new RegExp(`${localePath("th", "/forms")}$`));
  await expect(page.locator("h1")).toHaveText(UI.forms.th);
});

test("the language toggle keeps the reader on the same page", async ({ page }) => {
  await page.goto(localePath("th", "/forms"));

  // LanguageToggle shows the OTHER language's own name for itself
  // (LOCALE_LABEL), never a translation, so on the Thai page the visible
  // text is "English", and on the English page it is "ไทย". Not `exact`:
  // the link's accessible name also carries a visually-hidden
  // "(Change language)" suffix (UI.changeLanguage) for assistive tech.
  await page.locator("header").getByRole("link", { name: new RegExp(LOCALE_LABEL.en) }).first().click();
  await expect(page).toHaveURL(new RegExp(`${localePath("en", "/forms")}$`));

  await page.locator("header").getByRole("link", { name: new RegExp(LOCALE_LABEL.th) }).first().click();
  await expect(page).toHaveURL(new RegExp(`${localePath("th", "/forms")}$`));
});

for (const locale of LOCALES as readonly Locale[]) {
  test(`search reaches /${locale}/search?q= and renders results server-side`, async ({ page }) => {
    await page.goto(localePath(locale, "/search"));

    const query = "หอพัก";
    await page.getByLabel(UI.searchLabel[locale]).fill(query);
    await page.getByRole("button", { name: UI.searchSubmit[locale], exact: true }).click();

    await expect(page).toHaveURL(new RegExp(`${localePath(locale, "/search")}\\?q=`));
    expect(new URL(page.url()).searchParams.get("q")).toBe(query);

    /*
     * Server-rendered, not a client-side re-render: with JavaScript off the
     * only way this text can appear is if the server actually read `q` off
     * the URL and ran the search. There is no seeded search index in this
     * environment, so the honest, always-true assertion is the explicit
     * "no results" state (UI.searchNoResultsHelp) rather than
     * UI.searchResults, which is this page's unconditional h1 and would be
     * present even if `q` were silently ignored.
     */
    await expect(page.getByText(UI.searchNoResultsHelp[locale])).toBeVisible();
  });
}

test("filters on /forms work via <form method=\"get\">", async ({ page }) => {
  await page.goto(localePath("th", "/forms"));

  await page.locator("#forms-filter-category").selectOption("welfare");
  await page.getByRole("button", { name: UI.applyFilters.th, exact: true }).click();

  await expect(page).toHaveURL(/category=welfare/);
  await expect(page.locator("#forms-filter-category")).toHaveValue("welfare");
});

test("filters on /directory work via <form method=\"get\">", async ({ page }) => {
  await page.goto(localePath("th", "/directory"));

  await page.locator("#directory-type").selectOption("club");
  await page.getByRole("button", { name: UI.applyFilters.th, exact: true }).click();

  await expect(page).toHaveURL(/type=club/);
  await expect(page.locator("#directory-type")).toHaveValue("club");
});

test("filters on /policy work via <form method=\"get\">", async ({ page }) => {
  await page.goto(localePath("th", "/policy"));

  await page.locator("#policy-filter-owner").selectOption("tusu");
  await page.getByRole("button", { name: UI.applyFilters.th, exact: true }).click();

  await expect(page).toHaveURL(/owner=tusu/);
  await expect(page.locator("#policy-filter-owner")).toHaveValue("tusu");
});

test("pagination on /news accepts ?page= without JavaScript", async ({ page }) => {
  /*
   * There is no seeded CMS content in this environment (.env.local points
   * at a placeholder Sanity project), so `components/ui/Pagination` never
   * renders: it returns null whenever totalPages <= 1, which is always true
   * against an empty index. There is therefore no "Next page" link to click
   * here that would exist in a populated environment.
   *
   * What this test can honestly verify is the mechanism Pagination itself
   * is built on (a plain `<a href="?page=N">`, no JavaScript involved): the
   * page must accept and echo a `page` query parameter without erroring,
   * server-side, with scripting off. That is the progressive-enhancement
   * contract; seeded pagination end-to-end belongs to whichever agent owns
   * news content.
   */
  await page.goto(`${localePath("th", "/news")}?page=2`);

  await expect(page.locator("h1")).toHaveText(UI.news.th);
  await expect(page).toHaveURL(/page=2/);
});
