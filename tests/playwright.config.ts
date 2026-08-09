import { defineConfig, devices } from "@playwright/test";

/**
 * Accessibility and end to end suites.
 *
 * The mobile project is not an afterthought. A Tha Prachan student checking the
 * next shuttle is standing at a stop holding a phone, so that is the primary
 * target and it runs first.
 *
 * The 320px project exists solely to prove 1.4.10 Reflow: nothing anywhere may
 * scroll horizontally at the narrowest width the criterion names.
 */
export default defineConfig({
  testDir: ".",
  /*
   * tests/unit is Vitest's, not Playwright's. Without this an unfiltered
   * `playwright test` tries to run the shuttle and search unit tests, which
   * import Vitest globals that do not exist here, and the whole run fails on a
   * module error rather than a real defect.
   */
  testIgnore: ["unit/**"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      // 1.4.10 Reflow. 320 CSS px wide, 256 CSS px tall.
      name: "reflow-320",
      use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 256 } },
    },
    {
      name: "dark",
      use: { ...devices["Desktop Chrome"], colorScheme: "dark" },
    },
  ],

  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
