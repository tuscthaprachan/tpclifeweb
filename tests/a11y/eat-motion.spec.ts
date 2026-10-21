/**
 * Motion on the /eat section, with motion allowed:
 *  - 2.2.2 Pause, Stop, Hide: six seconds after load nothing is animating forever, and nothing that
 *    started without user input is still running.
 *  - The pick reel is a response to a spin the reader asked for, so a fresh load never shows
 *    `.fun-reel`, "Spin again" does, and with reduced motion it never appears at all.
 *
 * Runs on "mobile" and "desktop"; the behaviour is the same at every width and colour scheme.
 */

import { expect, test, type Page } from "@playwright/test";
import { PICK } from "../../components/domain/canteen/pick/strings";

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile" && testInfo.project.name !== "desktop", "Behaviour check, not viewport-dependent.");
});

async function watchForReel(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as { __reelSeen: boolean }).__reelSeen = false;
    const look = () => {
      if (document.querySelector(".fun-reel")) (window as unknown as { __reelSeen: boolean }).__reelSeen = true;
    };
    new MutationObserver(look).observe(document, { childList: true, subtree: true });
    look();
  });
}

const reelSeen = (page: Page) => page.evaluate(() => (window as unknown as { __reelSeen: boolean }).__reelSeen);

test.describe("motion allowed", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  for (const url of ["/en/eat", "/en/eat/pick?seed=abc"]) {
    test(`2.2.2 Pause, Stop, Hide: nothing loops or keeps running without input on ${url}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(6000);

      const running = await page.evaluate(() =>
        document.getAnimations().flatMap((animation) => {
          const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
          const iterations = animation.effect?.getComputedTiming().iterations;
          const name = animation instanceof CSSAnimation ? animation.animationName : animation instanceof CSSTransition ? `transition ${animation.transitionProperty}` : "script animation";
          const where = target ? `${target.tagName.toLowerCase()}${target.className && typeof target.className === "string" ? `.${target.className.trim().split(/\s+/).join(".")}` : ""}` : "(no target)";
          if (animation.playState !== "running") return [];
          return [`${name} on ${where}${iterations === Infinity ? " (infinite iterations)" : ""}`];
        }),
      );

      expect(running, `${running.length} animation(s) still running six seconds after load, none started by user input, on ${url}:\n  ${running.join("\n  ")}`).toEqual([]);
    });
  }

  test("the reel is absent on a fresh load and plays after Spin again", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await watchForReel(page);
    await page.goto("/en/eat/pick?seed=abc");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".fun-reel"), "a shared or reloaded link must not play the reel").toHaveCount(0);
    expect(await reelSeen(page), "the reel flashed in during a fresh load").toBe(false);

    await page.getByRole("link", { name: PICK.spinAgain.en, exact: true }).click();
    await expect.poll(() => reelSeen(page), { message: "Spin again should play the reel", timeout: 10_000 }).toBe(true);
  });
});

test.describe("reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("the reel never appears, even after Spin again", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await watchForReel(page);
    await page.goto("/en/eat/pick?seed=abc");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".fun-reel")).toHaveCount(0);

    await page.getByRole("link", { name: PICK.spinAgain.en, exact: true }).click();
    await expect(page).not.toHaveURL(/seed=abc(&|$)/);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await expect(page.locator(".fun-reel")).toHaveCount(0);
    expect(await reelSeen(page), "the reel appeared with prefers-reduced-motion: reduce").toBe(false);
  });
});
