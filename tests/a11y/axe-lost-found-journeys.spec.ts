/**
 * Zero axe-core violations on every question page of the lost and found
 * journeys, in both languages and every project (mobile, desktop, 320px
 * reflow, dark). The journeys are walked with real answers up to "check your
 * answers" and stop there: nothing is sent, so no case is created.
 *
 * The start pages, track page and privacy notice are plain routes and are
 * audited by axe.spec.ts with the others.
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { LOCALES, type Locale } from "../../lib/i18n/config";
import { formatViolations } from "./support/axe-report";
import { answerFoundReport, answerLostReport } from "./support/lost-found-journey";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

function audit(page: Page, label: string) {
  return async (step: string) => {
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations, formatViolations(`${label} ${step}`, results.violations)).toEqual([]);
  };
}

for (const locale of LOCALES as readonly Locale[]) {
  test(`axe journey: ${locale} lost report, every question page`, async ({ page }) => {
    await answerLostReport(page, locale, audit(page, `${locale} lost`));
  });

  test(`axe journey: ${locale} found report, every question page`, async ({ page }) => {
    await answerFoundReport(page, locale, audit(page, `${locale} found`));
  });
}
