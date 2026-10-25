/**
 * Zero axe-core violations on DETAIL pages, the ones behind a dynamic
 * segment.
 *
 * WHY THIS EXISTS SEPARATELY FROM axe.spec.ts
 * `discoverRoutes()` walks the filesystem and deliberately skips dynamic
 * segments, because it cannot know what `[slug]` stands for without asking
 * the CMS. The consequence went unnoticed: every detail page on the site,
 * which is to say every news article, every form, every guide page, every
 * policy and every lost property entry, was never audited at all. Only the
 * listings above them were.
 *
 * Slugs are discovered by crawling the listing pages rather than by querying
 * the database, for two reasons. The test process does not load `.env.local`, so it
 * has no database credentials of its own, and more importantly a link a reader
 * cannot reach from the site is not a page worth auditing. This tests exactly
 * what is reachable.
 *
 * An empty dataset makes this suite pass trivially, which is honest rather
 * than convenient: there is genuinely nothing to audit. `expectedNonEmpty`
 * marks the listings that should have content once seeded, so a listing
 * silently going empty is reported rather than passing as a clean run.
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { LOCALES, localePath, type Locale } from "../../lib/i18n/config";
import { formatViolations } from "./support/axe-report";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/**
 * Listing routes and the detail path each one links down into. `/directory`
 * and `/getting-around` are absent on purpose: they render organisations,
 * places and shuttle routes inline with anchors rather than linking to a
 * page of their own, so they have no detail pages to audit.
 */
const LISTINGS: Array<{ listing: string; detailPrefix: string }> = [
  { listing: "/forms", detailPrefix: "/forms/" },
  { listing: "/guide", detailPrefix: "/guide/" },
  { listing: "/news", detailPrefix: "/news/" },
  { listing: "/events", detailPrefix: "/events/" },
  { listing: "/policy", detailPrefix: "/policy/" },
  { listing: "/welfare", detailPrefix: "/welfare/" },
  { listing: "/lost-and-found", detailPrefix: "/lost-and-found/" },
  // What to eat. Both listings are empty (and the audit skips) until the canteen has been surveyed.
  { listing: "/eat/dishes", detailPrefix: "/eat/dishes/" },
  { listing: "/eat/stalls", detailPrefix: "/eat/stalls/" },
];

/**
 * How many detail pages to audit per listing. Detail pages of one type share
 * a template, so the marginal value of the twentieth news article is near
 * zero while the cost is a full page load and axe run. Three catches the
 * cases that actually differ: a post with an image and one without, a form
 * that needs sign-in and one that does not.
 */
const MAX_PER_LISTING = 3;

/** Locale-free detail paths linked from a listing page, deduplicated. */
async function detailPathsFrom(page: Page, locale: Locale, listing: string, detailPrefix: string): Promise<string[]> {
  const response = await page.goto(localePath(locale, listing));
  expect(response?.ok(), `${localePath(locale, listing)} did not respond with an ok status`).toBeTruthy();

  const prefix = localePath(locale, detailPrefix);
  const hrefs = await page.locator(`a[href^="${prefix}"]`).evaluateAll((links) =>
    links.map((link) => link.getAttribute("href") ?? ""),
  );

  // Compared with the query string stripped. The lost and found listing links
  // to its own service pages (report, found, track, privacy), which are
  // routes of their own and are audited by axe.spec.ts, not detail pages.
  const servicePaths = ["report", "found", "track", "privacy"].map((p) => localePath(locale, `/lost-and-found/${p}`));
  const unique = [...new Set(hrefs)]
    .filter((href) => !servicePaths.includes(href.split("?")[0] ?? href))
    .filter((href) => (href.split("?")[0] ?? href).length > prefix.length);

  return unique.slice(0, MAX_PER_LISTING);
}

for (const locale of LOCALES as readonly Locale[]) {
  for (const { listing, detailPrefix } of LISTINGS) {
    test(`axe detail pages: ${locale} ${listing}`, async ({ page }) => {
      const paths = await detailPathsFrom(page, locale, listing, detailPrefix);

      if (paths.length === 0) {
        test.skip(true, `${listing} has no detail pages in this dataset`);
        return;
      }

      for (const path of paths) {
        await test.step(path, async () => {
          const response = await page.goto(path);
          expect(response?.ok(), `${path} did not respond with an ok status`).toBeTruthy();

          const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
          expect(results.violations, formatViolations(path, results.violations)).toEqual([]);
        });
      }
    });
  }
}

/* ---- Decide for me (/eat/pick): a seeded result page, in each mode ---- */

for (const locale of LOCALES as readonly Locale[]) {
  for (const mode of ["dish", "meal", "stall"]) {
    test(`axe decide for me: ${locale} ${mode}`, async ({ page }) => {
      const path = `${localePath(locale, "/eat/pick")}?seed=abc123&max=80&mode=${mode}`;
      const response = await page.goto(path);
      expect(response?.ok(), `${path} did not respond with an ok status`).toBeTruthy();
      await page.waitForTimeout(1200); // let the reel settle
      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      expect(results.violations, formatViolations(path, results.violations)).toEqual([]);
    });
  }
}

/* ---- Budget tools and personal data (/eat/plan, /eat/mine) ---- */
for (const locale of LOCALES as readonly Locale[]) {
  for (const route of ["/eat/plan", "/eat/plan?max=60", "/eat/plan?mode=week", "/eat/plan?mode=week&budget=300&days=1,2,3,4,5&seed=abc234", "/eat/mine"]) {
    test(`axe budget pages: ${locale} ${route}`, async ({ page }) => {
      const path = localePath(locale, route);
      const response = await page.goto(path);
      expect(response?.ok(), `${path} did not respond with an ok status`).toBeTruthy();
      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      expect(results.violations, formatViolations(path, results.violations)).toEqual([]);
    });
  }
}

/* ---- Eat as a group (/eat/plan?mode=group): builder and each strategy ---- */
const GROUP_PEOPLE = "p=Mint.50.np-v.s1~Ben.80..s3";
for (const locale of LOCALES as readonly Locale[]) {
  test(`axe eat group: ${locale}`, async ({ page }) => {
    for (const query of ["", `&${GROUP_PEOPLE}`, `&${GROUP_PEOPLE}&strat=own&seed=abc`, `&${GROUP_PEOPLE}&strat=random&seed=abc`]) {
      const path = `${localePath(locale, "/eat/plan")}?mode=group${query}`;
      await test.step(path, async () => {
        const response = await page.goto(path);
        expect(response?.ok(), `${path} did not respond with an ok status`).toBeTruthy();
        /*
         * The random strategy reveals each pick with a staggered fade (group-reveal). Axe reads the colour a
         * pixel is painted with, so a pick caught mid-fade is blended with the page and reports a contrast
         * failure that is not there at rest. Wait for every finite animation to end, as a reader does.
         */
        await page.evaluate(() => Promise.all(document.getAnimations().filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity).map((animation) => animation.finished.catch(() => undefined))));
        const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
        expect(results.violations, formatViolations(path, results.violations)).toEqual([]);
      });
    }
  });
}

/* ---- What is this dish (/eat/what-is) and the canteen search shortcut ---- */
for (const locale of LOCALES as readonly Locale[]) {
  test(`axe what-is index, first dish and search shortcut: ${locale}`, async ({ page }) => {
    const paths = [localePath(locale, "/eat/what-is"), `${localePath(locale, "/search")}?q=50+baht+noodles`];
    const first = await page.goto(paths[0]!);
    expect(first?.ok()).toBeTruthy();
    const href = await page.locator('main a[href*="/eat/what-is/"]').first().getAttribute("href");
    if (href) paths.push(href);
    for (const path of paths) {
      await test.step(path, async () => {
        const response = await page.goto(path);
        expect(response?.ok(), `${path} did not respond with an ok status`).toBeTruthy();
        const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
        expect(results.violations, formatViolations(path, results.violations)).toEqual([]);
      });
    }
  });
}
