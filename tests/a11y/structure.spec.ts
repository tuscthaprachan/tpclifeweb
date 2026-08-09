/**
 * Document structure, checked on every discovered route in both locales:
 *
 *  - Exactly one <h1>, and no heading level is skipped (1.3.1, 2.4.6).
 *  - <html lang> matches HTML_LANG for the locale being rendered (3.1.1).
 *  - Exactly one <main>, one <header>, one <footer> landmark.
 *  - A unique, non-empty <title> (2.4.2).
 *  - Reciprocal hreflang: the th and en versions of a route point at each
 *    other, and both carry an x-default pointing at DEFAULT_LOCALE.
 *
 * Runs on the "desktop" project only: this is about markup, not layout, so
 * one viewport is enough and running it four times over would only slow the
 * suite down for no extra signal.
 */

import { expect, test } from "@playwright/test";
import { DEFAULT_LOCALE, HTML_LANG, LOCALES, localePath, type Locale } from "../../lib/i18n/config";
import { discoverRoutes } from "./support/discover-routes";

const routes = discoverRoutes();

test.describe("document structure", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Markup only, not layout; one viewport is enough.");
  });

  for (const locale of LOCALES as readonly Locale[]) {
    for (const route of routes) {
      test(`structure: ${locale} ${route}`, async ({ page }) => {
        await page.goto(localePath(locale, route));

        // <html lang> (3.1.1).
        const htmlLang = await page.locator("html").getAttribute("lang");
        expect(htmlLang, "html lang should match the rendered locale").toBe(HTML_LANG[locale]);

        // Landmarks: exactly one of each.
        await expect(page.locator("main"), "exactly one <main>").toHaveCount(1);
        await expect(page.locator("header"), "exactly one <header>").toHaveCount(1);
        await expect(page.locator("footer"), "exactly one <footer>").toHaveCount(1);

        // Headings: exactly one h1, no skipped level.
        const levels = await page.locator("h1, h2, h3, h4, h5, h6").evaluateAll((nodes) =>
          nodes.map((node) => Number.parseInt(node.tagName.slice(1), 10)),
        );
        const h1Count = levels.filter((level) => level === 1).length;
        expect(h1Count, `expected exactly one h1 on ${locale}${route}, found ${h1Count}. Levels in DOM order: ${levels.join(", ")}`).toBe(1);

        let maxSeen = 0;
        for (const level of levels) {
          if (level > maxSeen + 1) {
            expect(
              level,
              `heading level skipped on ${locale}${route}: jumped to h${level} after the deepest level seen so far was h${maxSeen}. Levels in DOM order: ${levels.join(", ")}`,
            ).toBeLessThanOrEqual(maxSeen + 1);
          }
          maxSeen = Math.max(maxSeen, level);
        }

        // Title (2.4.2). Uniqueness is asserted in the dedicated test below,
        // this only asserts non-empty here.
        const title = await page.title();
        expect(title.trim().length, `${locale}${route} has an empty <title>`).toBeGreaterThan(0);
      });
    }
  }

  test(`unique titles across every route, per locale`, async ({ page }) => {
    for (const locale of LOCALES as readonly Locale[]) {
      const seen = new Map<string, string>();
      for (const route of routes) {
        await page.goto(localePath(locale, route));
        const title = await page.title();
        const existing = seen.get(title);
        expect(existing, `${locale}${route} has the same <title> ("${title}") as ${existing ?? ""}`).toBeUndefined();
        seen.set(title, route);
      }
    }
  });

  for (const route of routes) {
    test(`reciprocal hreflang: ${route}`, async ({ page }) => {
      const linksByLocale: Record<string, Record<string, string>> = {};

      for (const locale of LOCALES as readonly Locale[]) {
        await page.goto(localePath(locale, route));
        const entries = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((nodes) =>
          nodes.map((node) => [node.getAttribute("hreflang") ?? "", node.getAttribute("href") ?? ""] as const),
        );
        linksByLocale[locale] = Object.fromEntries(entries);
      }

      for (const locale of LOCALES as readonly Locale[]) {
        const links = linksByLocale[locale];
        expect(links, `${locale}${route} has no hreflang alternate links at all`).toBeTruthy();

        for (const otherLocale of LOCALES as readonly Locale[]) {
          const href = links?.[otherLocale];
          expect(href, `${locale}${route} is missing an hreflang="${otherLocale}" alternate link`).toBeTruthy();
          expect(href, `${locale}${route}'s hreflang="${otherLocale}" link should point at the ${otherLocale} version of this route`).toContain(
            localePath(otherLocale, route),
          );
        }

        const defaultHref = links?.["x-default"];
        expect(defaultHref, `${locale}${route} is missing an hreflang="x-default" link`).toBeTruthy();
        expect(defaultHref, `${locale}${route}'s x-default link should point at the ${DEFAULT_LOCALE} version`).toContain(
          localePath(DEFAULT_LOCALE, route),
        );
      }
    });
  }
});
