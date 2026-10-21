/**
 * Focus behaviour on /eat/dishes:
 *  - 2.4.11 Focus Not Obscured: on a phone, after scrolling, tabbing through dish cards never leaves the
 *    focused element entirely under the sticky header or the floating Filters button; inside the open
 *    filter dialog nothing before the sticky footer is entirely under that footer.
 *  - 3.2.2 On Input: arrowing through a radio group on desktop does not navigate until the reader stops
 *    for about half a second or leaves the group.
 */

import { expect, test, type Page } from "@playwright/test";
import { EAT } from "../../components/domain/canteen/strings";

interface Box {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const inside = (inner: Box, outer: Box) => inner.top >= outer.top - 0.5 && inner.bottom <= outer.bottom + 0.5 && inner.left >= outer.left - 0.5 && inner.right <= outer.right + 0.5;

async function settled(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let last = Number.NaN;
        let still = 0;
        const tick = () => {
          const position = window.scrollY + (document.querySelector("dialog[open]")?.scrollTop ?? 0);
          still = position === last ? still + 1 : 0;
          last = position;
          if (still >= 5) resolve();
          else requestAnimationFrame(tick);
        };
        tick();
      }),
  );
}

async function focusedBox(page: Page): Promise<(Box & { descriptor: string }) | null> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const rect = el.getBoundingClientRect();
    const text = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
    return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, descriptor: `${el.tagName.toLowerCase()} "${text}"` };
  });
}

test.describe("2.4.11 Focus Not Obscured on eat dishes", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The sticky bar, floating button and dialog are phone layouts.");
  });

  test("tabbing through dish cards after scrolling is not hidden by the header or the floating Filters button", async ({ page }) => {
    await page.goto("/en/eat/dishes");
    await page.evaluate(() => window.scrollTo(0, 1800));
    await settled(page);
    const floating = page.locator("button[aria-haspopup='dialog']", { hasText: EAT.filtersTitle.en });
    await expect(floating).toBeVisible();

    const started = await page.evaluate(() => {
      const link = [...document.querySelectorAll<HTMLAnchorElement>("main a[href*='/eat/dishes/']")].find((a) => {
        const rect = a.getBoundingClientRect();
        return rect.top > 200 && rect.bottom < window.innerHeight - 120;
      });
      link?.focus({ preventScroll: true });
      return link !== undefined;
    });
    expect(started, "no dish card link was in view after scrolling").toBe(true);

    const obscured: string[] = [];
    for (let step = 0; step < 8; step += 1) {
      await page.keyboard.press("Tab");
      await settled(page);
      const box = await focusedBox(page);
      if (!box) break;
      const headerBottom = await page.evaluate(() => document.querySelector("header")?.getBoundingClientRect().bottom ?? 0);
      const button = await floating.boundingBox();
      if (box.bottom <= headerBottom + 0.5) obscured.push(`${box.descriptor} is entirely under the sticky header (bottom ${headerBottom.toFixed(1)}px, element ${box.top.toFixed(1)} to ${box.bottom.toFixed(1)}px)`);
      if (button && inside(box, { top: button.y, bottom: button.y + button.height, left: button.x, right: button.x + button.width })) obscured.push(`${box.descriptor} is entirely under the floating Filters button`);
    }

    expect(obscured, obscured.join("\n")).toEqual([]);
  });

  test("tabbing through the open filter dialog is not hidden by its sticky footer", async ({ page }) => {
    await page.goto("/en/eat/dishes");
    await page.getByRole("link", { name: new RegExp(`^${EAT.editFilters.en}`) }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const footer = dialog.locator("div.sticky").last();
    const obscured: string[] = [];
    let lastBeforeFooter = "";
    let reachedFooter = false;

    for (let step = 0; step < 120; step += 1) {
      await page.keyboard.press("Tab");
      await settled(page);
      const inFooter = await page.evaluate(() => document.activeElement?.closest("div.sticky") !== null);
      if (inFooter) {
        reachedFooter = true;
        break;
      }
      const box = await focusedBox(page);
      const footerBox = await footer.boundingBox();
      if (!box || !footerBox) continue;
      lastBeforeFooter = box.descriptor;
      if (inside(box, { top: footerBox.y, bottom: footerBox.y + footerBox.height, left: footerBox.x, right: footerBox.x + footerBox.width })) {
        obscured.push(`${box.descriptor} is entirely under the dialog footer (footer top ${footerBox.y.toFixed(1)}px, element ${box.top.toFixed(1)} to ${box.bottom.toFixed(1)}px)`);
      }
    }

    expect(reachedFooter, "Tab never reached the dialog footer within 120 stops").toBe(true);
    expect(lastBeforeFooter, "no control was focused before the footer").not.toBe("");
    expect(obscured, obscured.join("\n")).toEqual([]);
  });
});

test.describe("3.2.2 On Input on eat dishes", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Keyboard behaviour of the filter column.");
  });

  async function firstBudgetRadio(page: Page) {
    await page.goto("/en/eat/dishes");
    await page.waitForLoadState("networkidle");
    const radio = page.getByRole("group", { name: new RegExp(`^${EAT.budgetFilterLegend.en}`) }).getByRole("radio").first();
    await radio.focus();
    return radio;
  }

  test("arrowing through the budget radios does not change the URL until the reader pauses", async ({ page }) => {
    await firstBudgetRadio(page);
    const before = page.url();

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(300);
    expect(page.url(), "the URL changed within 300ms of arrowing through the radios").toBe(before);

    await expect.poll(() => page.url(), { message: "the filter should apply once the reader pauses", timeout: 3000 }).not.toBe(before);
  });

  test("leaving the budget radios with Tab applies the choice at once", async ({ page }) => {
    await firstBudgetRadio(page);
    const before = page.url();

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Tab");
    await expect.poll(() => page.url(), { message: "Tab out of the group should apply the filter", timeout: 3000 }).not.toBe(before);
  });
});
