/**
 * The meal budget on /eat/plan is `meal`, not `max`. `max` is the dish price filter, so an old link or a
 * hand-typed `?max=60` is redirected to `?meal=60`, and a `meal` budget is never echoed back as an
 * "under 60 baht" dish filter chip. Mechanism only, so the desktop project is enough.
 */

import { expect, test } from "@playwright/test";

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Mechanism check, not a layout check.");
});

const CHIP = "under 60 baht";

test("/eat/plan?max=60 redirects to ?meal=60", async ({ page, request }) => {
  const response = await request.get("/en/eat/plan?max=60", { maxRedirects: 0 });
  expect(response.status(), "the redirect status").toBeGreaterThanOrEqual(300);
  expect(response.status()).toBeLessThan(400);
  expect(response.headers()["location"]).toBe("/en/eat/plan?meal=60");

  await page.goto("/en/eat/plan?max=60&diet=nopork");
  await expect(page).toHaveURL(/\/en\/eat\/plan\?meal=60&diet=nopork$/);
});

test("/eat/plan?meal=60 shows no 'under 60 baht' chip", async ({ page }) => {
  await page.goto("/en/eat/plan?meal=60");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(CHIP), `"${CHIP}" is a dish price filter and must not appear for a meal budget`).toHaveCount(0);
});

test("the 'under 60 baht' chip does exist for a dish price filter", async ({ page }) => {
  await page.goto("/en/eat/dishes?max=60");
  await expect(page.getByText(CHIP).first(), "positive control: the chip text this test looks for").toBeVisible();
});
