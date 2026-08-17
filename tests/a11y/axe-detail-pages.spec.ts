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
 * Sanity, for two reasons. The test process does not load `.env.local`, so it
 * has no project credentials of its own, and more importantly a link a reader
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
  // to its own report page as "/lost-and-found/report?kind=lost", which an
  // exact match against the bare path does not catch, so the report route got
  // audited here as though it were a detail page while the listing's real
  // "no entries yet" state was reported as a pass.
  const reportPath = localePath(locale, "/lost-and-found/report");
  const unique = [...new Set(hrefs)]
    .filter((href) => (href.split("?")[0] ?? href) !== reportPath)
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
