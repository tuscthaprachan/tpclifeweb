/**
 * The progressive enhancement gate (CONTRIBUTING.md: "search, filtering and
 * pagination must work with JavaScript off, driven by query parameters").
 * Every test in this file runs with `javaScriptEnabled: false`, so nothing
 * here can pass by accident of React hydration papering over a broken
 * native form.
 *
 * Restricted to the "desktop" project. Two reasons: the assertions are
 * about mechanism (does the plain HTML work), not layout, so one viewport
 * is enough; and `SiteHeader` renders its navigation, search link, search
 * box and language toggle TWICE in the DOM (once for the desktop `nav`, once
 * inside the mobile `<details>` disclosure), so locating them by role/name
 * always resolves two elements. At the desktop viewport the desktop copy is
 * the one that is actually visible and, since it is written first in the
 * JSX, also `.first()` in DOM order, which is what every `.first()` below
 * relies on rather than being an arbitrary pick. The page's own search box
 * is found inside `main`, away from the header's hidden copy. Most primary
 * navigation items sit inside the "More" disclosure, which is a native
 * `<details>` and so opens without JavaScript.
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

  await page.locator("header summary").filter({ hasText: UI.moreNav.th }).click();
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
    await page.locator("main").getByLabel(UI.searchLabel[locale]).fill(query);
    await page.locator("main").getByRole("button", { name: UI.searchSubmit[locale], exact: true }).click();

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
   * News is not seeded (there is nothing to seed it from), so `components/ui/Pagination` never
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

/*
 * What to eat. The filter form only exists once the canteen has dishes, so
 * these skip against an empty CMS, the same honest limit as pagination above.
 * Run them with CANTEEN_FIXTURE=1 on the dev server to exercise them.
 */
test("filters on /eat/dishes work via <form method=\"get\">", async ({ page }) => {
  await page.goto(localePath("en", "/eat/dishes"));
  const noPork = page.locator("#col-diet-0");
  test.skip((await noPork.count()) === 0, "No canteen data in this environment, so there is no filter form to submit.");

  // By keyboard, which is also what a keyboard user does: the controls are invisible inputs stretched over
  // their chip, and Playwright's pointer scroll parks them under the sticky header and summary bar.
  await noPork.focus();
  await page.keyboard.press("Space");
  await page.locator("#col-max-2").focus();
  await page.keyboard.press("Space");
  await page.locator("#col-max-2").locator("xpath=ancestor::form").getByRole("button", { name: /^Show \d+ dish/ }).click();

  await expect(page).toHaveURL(/max=50/);
  await expect(page).toHaveURL(/diet=nopork/);
  await expect(page.locator("#col-diet-0")).toBeChecked();
  await expect(page.locator("#col-max-2")).toBeChecked();
});

test("filters on /eat/dishes are reachable on a phone without JavaScript", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(localePath("en", "/eat/dishes"));
  const edit = page.getByRole("link", { name: /^Edit filters/ });
  test.skip((await edit.count()) === 0, "No canteen data in this environment, so there is no filter form to reach.");

  await edit.click();
  await expect(page).toHaveURL(/#eat-filters$/);
  await expect(page.locator("#inline-diet-0")).toBeVisible();
});

test("Decide for me on /eat is a GET form to /eat/pick", async ({ page }) => {
  await page.goto(localePath("en", "/eat"));
  const form = page.locator('form[action$="/eat/pick"]');
  test.skip((await form.count()) === 0, "No canteen data in this environment, so there is no Decide for me block.");

  await expect(form).toHaveAttribute("method", "get");
  await expect(form.getByRole("button", { name: "Decide for me" })).toBeVisible();
});

/* ---- Decide for me (/eat/pick) ---- */

test("Decide for me redirects to a seeded URL and every action is a plain link", async ({ page }) => {
  await page.goto(localePath("en", "/eat/pick"));
  const title = page.locator("#pick-result-title");
  test.skip((await title.count()) === 0, "No canteen data in this environment, so there is nothing to pick.");

  await expect(page).toHaveURL(/seed=[a-z0-9]+/);
  const seeded = page.url();
  await page.reload();
  await expect(page).toHaveURL(seeded);
  const stall = page.locator("article details").first();
  await expect(stall).not.toHaveAttribute("open", "");
  await stall.locator("summary").click();
  await expect(stall).toHaveAttribute("open", "");
  await expect(stall.getByRole("link", { name: "See the stall" })).toHaveAttribute("href", /\/eat\/stalls\//);
  await expect(page.getByText("Price checked on")).toHaveCount(0);
  await expect(page.getByText("Why it matched")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Spin again", exact: true })).toHaveAttribute("href", /seed=/);
  await expect(page.getByRole("link", { name: "Not this one, spin again", exact: true })).toHaveAttribute("href", /not=/);
  await expect(page.getByRole("link", { name: "Go with this" })).toHaveAttribute("href", /\/eat\/stalls\//);
  await page.getByRole("link", { name: "Spin again", exact: true }).click();
  await expect(page).toHaveURL(/seed=/);
});

/* ---- Budget tools and personal data ---- */
test("/eat/plan budget form is a GET form and works without JavaScript", async ({ page }) => {
  await page.goto(localePath("en", "/eat/plan?max=60"));
  const form = page.locator('form[action$="/eat/plan"]').first();
  await expect(form).toHaveAttribute("method", "get");
  await expect(form.getByRole("button", { name: "Find meals" })).toBeVisible();
});

test("/eat/plan?mode=week redirects to a shareable seed and locks work as links", async ({ page }) => {
  await page.goto(localePath("en", "/eat/plan?mode=week&budget=300"));
  await expect(page).toHaveURL(/seed=[a-z0-9]+/);
  const lock = page.getByRole("link", { name: /^Lock: Monday/ });
  test.skip((await lock.count()) === 0, "No canteen data in this environment, so there is no plan.");
  await lock.click();
  await expect(page).toHaveURL(/lock\.1=/);
  await expect(page.getByRole("link", { name: /^Unlock: Monday/ })).toBeVisible();
});

test("/eat/mine explains that it needs JavaScript", async ({ page }) => {
  const response = await page.request.get(localePath("en", "/eat/mine"));
  const html = await response.text();
  expect(html).toMatch(/<noscript>[\s\S]*JavaScript is off[\s\S]*Turn on JavaScript to see this page\.[\s\S]*<\/noscript>/);
});

/* ---- Eat as a group: the builder round trips as a plain GET form ---- */
test("Eat as a group: Add another person works without JavaScript", async ({ page }) => {
  await page.goto(localePath("en", "/eat/plan?mode=group&p=Mint.50~Ben"));
  const add = page.getByRole("button", { name: "Add another person" });
  test.skip((await add.count()) === 0, "No canteen data in this environment, so there is no group builder.");

  await add.click();
  await expect(page).toHaveURL(/p=Mint\.50~Ben~\./);
  await expect(page.getByRole("group", { name: "Person 3" })).toBeVisible();

  await page.getByRole("button", { name: /^Remove Person 1/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/p=Ben~\./);
  await page.getByRole("button", { name: "Show results" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#results$/);
});
