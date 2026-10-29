/**
 * Zero axe-core violations on every question page of the complaint journey, in
 * both languages and every project (mobile, desktop, 320px reflow, dark). The
 * named and anonymous journeys are walked with real answers up to "check your
 * answers" and stop there: nothing is sent, so no complaint is created. The
 * emergency, course and faculty routes are walked to the page that ends them.
 *
 * The start page, track page and privacy notice are plain routes and are
 * audited by axe.spec.ts with the others.
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { LOCALES, type Locale } from "../../lib/i18n/config";
import { formatViolations } from "./support/axe-report";
import { answerComplaint, answerTriage, type TriagePath } from "./support/complaint-journey";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

function audit(page: Page, label: string) {
  return async (step: string) => {
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations, formatViolations(`${label} ${step}`, results.violations)).toEqual([]);
  };
}

const TRIAGE_PATHS: readonly TriagePath[] = ["emergency", "course-lecturer", "course-other", "course-harassment", "faculty-programme", "faculty-wide"];

for (const locale of LOCALES as readonly Locale[]) {
  for (const path of TRIAGE_PATHS) {
    test(`axe journey: ${locale} ${path}, every page to the ending`, async ({ page }) => {
      await answerTriage(page, locale, path, audit(page, `${locale} ${path}`));
    });
  }

  test(`axe journey: ${locale} named complaint, every question page`, async ({ page }) => {
    await answerComplaint(page, locale, { identity: "named", onPage: audit(page, `${locale} named`) });
  });

  test(`axe journey: ${locale} anonymous complaint, every question page`, async ({ page }) => {
    await answerComplaint(page, locale, { identity: "anonymous", onPage: audit(page, `${locale} anonymous`) });
  });

  test(`axe journey: ${locale} pseudonymous complaint contact page`, async ({ page }) => {
    await answerComplaint(page, locale, { identity: "pseudonymous", onPage: audit(page, `${locale} pseudonymous`) });
  });
}
