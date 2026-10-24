import { expect, test } from "@playwright/test";

/**
 * The staff console shell with NO database and NO auth secrets, which is how a
 * fresh clone and CI look. The signed-in journey needs a database and a
 * WebAuthn authenticator, so it is not automated here; here we only prove the
 * parts that must hold regardless.
 *
 * To walk the real journey by hand: set DATABASE_URL (a Neon branch, or
 * pglite:./.pglite), BETTER_AUTH_SECRET and BETTER_AUTH_URL, run `npm run
 * db:migrate`, `npm run db:seed` and `npm run auth:bootstrap -- you@example.org
 * tusu`, then open the link it prints and create your account with a passkey.
 * Email is not needed. Chromium can stand in for a real authenticator: open
 * DevTools, More tools, WebAuthn, and enable a virtual authenticator with
 * resident keys and user verification.
 */

test.describe("staff console, not configured", () => {
  test("is outside the locale prefix and says plainly that sign-in is not set up", async ({ page }) => {
    const response = await page.goto("/admin");
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe("/admin");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("BETTER_AUTH_SECRET").first()).toBeVisible();
  });

  test("is never indexed", async ({ page, request }) => {
    const response = await page.goto("/admin/sign-in");
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    expect(await page.locator('meta[name="robots"]').getAttribute("content")).toContain("noindex");

    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Disallow: \/admin/);
  });

  test("the language switch works without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/admin/sign-in");
    const before = await page.locator("html").getAttribute("lang");
    await page.locator("header form button").click();
    const after = await page.locator("html").getAttribute("lang");
    expect(after).not.toBe(before);
    await context.close();
  });

  test("the Better Auth route reports that it is not configured instead of crashing", async ({ request }) => {
    const response = await request.get("/api/auth/get-session");
    expect(response.status()).toBe(503);
  });
});
